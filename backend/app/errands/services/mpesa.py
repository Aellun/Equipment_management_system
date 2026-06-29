"""M-Pesa Daraja STK Push + escrow state machine.

When MPESA_MOCK=true (default for local/demo) the STK push is simulated: a fake
CheckoutRequestID is returned and the caller can confirm it via the test
callback endpoint. Flip MPESA_MOCK=false and provide real Daraja sandbox/prod
credentials to hit Safaricom for real — no code change needed.

Escrow lifecycle (Payment.escrow_status):
    pending --(callback success)--> held
    held    --(customer accepts proof)--> released
    held/pending --(cancel or dispute resolved for customer)--> refunded
    pending --(callback failure)--> failed
"""
import base64
import uuid
from datetime import datetime

import httpx

from app.errands.core.config import settings

SANDBOX_BASE = "https://sandbox.safaricom.co.ke"
PROD_BASE = "https://api.safaricom.co.ke"


def _base_url() -> str:
    return PROD_BASE if settings.MPESA_ENV == "production" else SANDBOX_BASE


def _timestamp() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S")


def _password(timestamp: str) -> str:
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def normalize_phone(phone: str) -> str:
    """Convert 07.., +2547.., 7.. to 2547XXXXXXXX."""
    p = phone.strip().replace(" ", "").replace("+", "")
    if p.startswith("0"):
        p = "254" + p[1:]
    elif p.startswith("7") or p.startswith("1"):
        p = "254" + p
    return p


def _get_access_token() -> str:
    auth = (settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET)
    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    resp = httpx.get(url, auth=auth, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]


def stk_push(phone: str, amount: float, reference: str, description: str) -> dict:
    """Initiate payment. Returns dict with checkout_request_id + merchant_request_id.

    In mock mode, returns synthetic IDs without contacting Safaricom.
    """
    phone = normalize_phone(phone)
    amount_int = max(1, int(round(amount)))

    if settings.MPESA_MOCK:
        return {
            "checkout_request_id": f"ws_CO_MOCK_{uuid.uuid4().hex[:16]}",
            "merchant_request_id": f"MOCK-{uuid.uuid4().hex[:12]}",
            "customer_message": "Mock STK push sent. Confirm via test callback.",
            "mock": True,
        }

    timestamp = _timestamp()
    token = _get_access_token()
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": _password(timestamp),
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount_int,
        "PartyA": phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": reference[:12],
        "TransactionDesc": description[:60] or "Errand payment",
    }
    url = f"{_base_url()}/mpesa/stkpush/v1/processrequest"
    resp = httpx.post(
        url, json=payload, headers={"Authorization": f"Bearer {token}"}, timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "checkout_request_id": data.get("CheckoutRequestID"),
        "merchant_request_id": data.get("MerchantRequestID"),
        "customer_message": data.get("CustomerMessage", ""),
        "mock": False,
    }


def parse_callback(body: dict) -> dict:
    """Normalise a Daraja STK callback body into a flat result."""
    stk = body.get("Body", {}).get("stkCallback", {})
    result_code = stk.get("ResultCode")
    checkout_id = stk.get("CheckoutRequestID")
    receipt = None
    for item in stk.get("CallbackMetadata", {}).get("Item", []):
        if item.get("Name") == "MpesaReceiptNumber":
            receipt = item.get("Value")
    return {
        "checkout_request_id": checkout_id,
        "success": result_code == 0,
        "result_code": result_code,
        "result_desc": stk.get("ResultDesc", ""),
        "mpesa_receipt": receipt,
    }
