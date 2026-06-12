"""Import product details from an external product-page URL.

Fetches the page and extracts structured data in priority order:
JSON-LD (schema.org Product) -> Open Graph / product meta -> Twitter cards
-> <title> fallback. Optionally mirrors remote images into local /uploads
so the store never depends on third-party hotlinking.
"""
import ipaddress
import json
import os
import re
import socket
import uuid
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

UPLOAD_DIR = "uploads"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGES = 8
FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
IMAGE_EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}


class LinkImportError(Exception):
    """Raised when a product page cannot be fetched or parsed."""


def _assert_public_url(url: str) -> None:
    """Basic SSRF guard: only http(s) to publicly routable hosts."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise LinkImportError("Only http(s) links are supported")
    host = parsed.hostname or ""
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise LinkImportError("Could not resolve the link's host")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise LinkImportError("Links to private or internal addresses are not allowed")


async def _fetch_html(url: str) -> str:
    _assert_public_url(url)
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, headers=FETCH_HEADERS) as client:
        try:
            res = await client.get(url)
        except httpx.HTTPError as exc:
            raise LinkImportError(f"Could not fetch the link: {exc.__class__.__name__}")
    if res.status_code >= 400:
        raise LinkImportError(f"The site responded with HTTP {res.status_code}")
    ctype = res.headers.get("content-type", "")
    if "html" not in ctype and "xml" not in ctype:
        raise LinkImportError("The link does not point to a web page")
    return res.text


def _iter_jsonld_products(soup: BeautifulSoup):
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        candidates = data if isinstance(data, list) else [data]
        for node in candidates:
            if not isinstance(node, dict):
                continue
            graph = node.get("@graph")
            nodes = graph if isinstance(graph, list) else [node]
            for n in nodes:
                if isinstance(n, dict) and "Product" in str(n.get("@type", "")):
                    yield n


def _first_offer_price(offers) -> tuple[str | None, str | None]:
    if isinstance(offers, list):
        offers = offers[0] if offers else None
    if not isinstance(offers, dict):
        return None, None
    price = offers.get("price") or offers.get("lowPrice")
    currency = offers.get("priceCurrency")
    return (str(price) if price is not None else None), currency


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return None


def _clean_price(raw: str | None) -> str | None:
    if not raw:
        return None
    m = re.search(r"[\d][\d,]*\.?\d*", raw.replace(" ", " "))
    if not m:
        return None
    return m.group(0).replace(",", "")


def parse_product_page(html: str, base_url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    name = description = brand = price = currency = None
    images: list[str] = []

    for node in _iter_jsonld_products(soup):
        name = name or node.get("name")
        description = description or node.get("description")
        b = node.get("brand")
        if not brand:
            brand = b.get("name") if isinstance(b, dict) else (b if isinstance(b, str) else None)
        img = node.get("image")
        if isinstance(img, str):
            images.append(img)
        elif isinstance(img, list):
            images.extend(i if isinstance(i, str) else i.get("url", "") for i in img)
        elif isinstance(img, dict):
            images.append(img.get("url", ""))
        if not price:
            price, currency = _first_offer_price(node.get("offers"))
        if name:
            break

    name = name or _meta(soup, "og:title", "twitter:title")
    description = description or _meta(soup, "og:description", "twitter:description", "description")
    brand = brand or _meta(soup, "product:brand", "og:brand")
    price = price or _meta(soup, "product:price:amount", "og:price:amount")
    currency = currency or _meta(soup, "product:price:currency", "og:price:currency")

    for tag in soup.find_all("meta", attrs={"property": "og:image"}):
        if tag.get("content"):
            images.append(tag["content"])
    tw_img = _meta(soup, "twitter:image", "twitter:image:src")
    if tw_img:
        images.append(tw_img)

    if not name and soup.title and soup.title.string:
        name = soup.title.string.strip()

    if not name:
        raise LinkImportError("Could not find product details on that page")

    seen: set[str] = set()
    clean_images: list[str] = []
    for img in images:
        absolute = urljoin(base_url, img.strip())
        if absolute and absolute.startswith("http") and absolute not in seen:
            seen.add(absolute)
            clean_images.append(absolute)

    return {
        "name": re.sub(r"\s+", " ", str(name)).strip()[:255],
        "description": (str(description).strip() or None) if description else None,
        "brand": (str(brand).strip()[:120] or None) if brand else None,
        "price": _clean_price(price),
        "currency": currency,
        "images": clean_images[:MAX_IMAGES],
        "source_url": base_url,
    }


async def mirror_images(urls: list[str]) -> list[str]:
    """Download remote images into /uploads; skip any that fail."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    local: list[str] = []
    async with httpx.AsyncClient(follow_redirects=True, timeout=20.0, headers=FETCH_HEADERS) as client:
        for url in urls[:MAX_IMAGES]:
            try:
                _assert_public_url(url)
                res = await client.get(url)
                if res.status_code >= 400 or len(res.content) > MAX_IMAGE_BYTES:
                    continue
                ctype = res.headers.get("content-type", "").split(";")[0].strip()
                ext = IMAGE_EXT_BY_TYPE.get(ctype)
                if not ext:
                    continue
                filename = f"{uuid.uuid4().hex}{ext}"
                with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
                    f.write(res.content)
                local.append(f"/uploads/{filename}")
            except (LinkImportError, httpx.HTTPError, OSError):
                continue
    return local


async def import_from_url(url: str, mirror: bool = True) -> dict:
    html = await _fetch_html(url)
    data = parse_product_page(html, url)
    if mirror and data["images"]:
        mirrored = await mirror_images(data["images"])
        if mirrored:
            data["images"] = mirrored
    return data
