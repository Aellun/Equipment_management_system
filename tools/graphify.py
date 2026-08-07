#!/usr/bin/env python3
"""graphify — build and query a code graph of this repo.

The graph is the index you consult *before* grepping: it already knows every
symbol, every API route, every page route, every model/table and who imports
whom, so "where is X defined" and "what breaks if I change X" are lookups
rather than searches.

    python3 tools/graphify.py build          # rebuild .graph/graph.json + GRAPH.md
    python3 tools/graphify.py query checkout # symbols/routes/files matching a term
    python3 tools/graphify.py file backend/app/api/routes/equipment.py
    python3 tools/graphify.py routes /api/transactions
    python3 tools/graphify.py importers backend/app/models/equipment.py
    python3 tools/graphify.py stale          # is the graph behind the working tree?

Stdlib only, no build step, no daemon. Python is parsed with `ast`; TypeScript
is parsed with targeted regexes (good enough for exports/imports/routes).
"""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GRAPH_DIR = REPO / ".graph"
GRAPH_JSON = GRAPH_DIR / "graph.json"
GRAPH_MD = GRAPH_DIR / "GRAPH.md"
MODULES_MD = GRAPH_DIR / "MODULES.md"

SCHEMA_VERSION = 1

PY_EXT = {".py"}
TS_EXT = {".ts", ".tsx"}
SKIP_DIRS = {
    "__pycache__", "node_modules", ".next", ".git", "venv", ".venv",
    "dist", "build", ".graph", "migrations_cache",
}
SKIP_FILES = {"next-env.d.ts", "tsconfig.tsbuildinfo"}


# ---------------------------------------------------------------------------
# model
# ---------------------------------------------------------------------------

@dataclass
class FileNode:
    path: str
    lang: str
    lines: int = 0
    client: bool = False               # frontend: has 'use client'
    symbols: list[dict] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)      # resolved repo paths
    ext_imports: list[str] = field(default_factory=list)  # third-party / unresolved
    routes: list[dict] = field(default_factory=list)
    tables: list[dict] = field(default_factory=list)
    page: str | None = None            # next.js url path for page/layout/route files

    def as_dict(self) -> dict:
        d = {
            "path": self.path, "lang": self.lang, "lines": self.lines,
            "symbols": self.symbols, "imports": sorted(set(self.imports)),
            "ext_imports": sorted(set(self.ext_imports)),
        }
        if self.client:
            d["client"] = True
        if self.routes:
            d["routes"] = self.routes
        if self.tables:
            d["tables"] = self.tables
        if self.page:
            d["page"] = self.page
        return d


# ---------------------------------------------------------------------------
# discovery
# ---------------------------------------------------------------------------

def tracked_files() -> list[Path]:
    """Prefer git's file list; fall back to a walk when git is unavailable.

    Includes untracked-but-not-ignored files so a brand-new module shows up in
    the graph before it is committed.
    """
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO), "ls-files", "--cached", "--others", "--exclude-standard"],
            capture_output=True, text=True, check=True,
        ).stdout.split("\n")
        paths = [REPO / p for p in out if p]
        if paths:
            return [p for p in paths if _wanted(p) and p.exists()]
    except (OSError, subprocess.CalledProcessError):
        pass
    found = []
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            p = Path(root) / f
            if _wanted(p):
                found.append(p)
    return found


def _wanted(p: Path) -> bool:
    return (
        p.suffix in PY_EXT | TS_EXT
        and p.name not in SKIP_FILES
        and not (set(p.parts) & SKIP_DIRS)
    )


def rel(p: Path) -> str:
    return p.relative_to(REPO).as_posix()


# ---------------------------------------------------------------------------
# python
# ---------------------------------------------------------------------------

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}


def _const(node) -> str | None:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def _decorator_route(dec) -> tuple[str, str] | None:
    """`@router.post("/x")` -> ("POST", "/x")."""
    if not isinstance(dec, ast.Call) or not isinstance(dec.func, ast.Attribute):
        return None
    method = dec.func.attr.lower()
    if method not in HTTP_METHODS:
        return None
    path = _const(dec.args[0]) if dec.args else ""
    return method.upper(), (path or "")


def _router_prefix(tree: ast.Module) -> str:
    """Find `APIRouter(prefix="/api/x")` at module level."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "APIRouter":
            for kw in node.keywords:
                if kw.arg == "prefix":
                    return _const(kw.value) or ""
    return ""


def _py_module_name(path: Path) -> str:
    parts = list(path.relative_to(REPO).with_suffix("").parts)
    if parts and parts[0] == "backend":
        parts = parts[1:]
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    return ".".join(parts)


def _abs_module(module: str, level: int, current: Path) -> str | None:
    """Turn a relative `from ..x import y` into its absolute dotted module name."""
    if not level:
        return module or None
    base = current.parent
    for _ in range(level - 1):
        base = base.parent
    parts = list(base.relative_to(REPO).parts)
    if parts and parts[0] == "backend":
        parts = parts[1:]
    if module:
        parts += module.split(".")
    return ".".join(parts) or None


def _resolve_from_import(item: ast.ImportFrom, current: Path, index: dict[str, str]) -> list[str]:
    """`from app.api.routes import equipment, users` -> both submodule files.

    Falls back to the package's own module (its `__init__.py`) when the imported
    names are symbols rather than submodules.
    """
    mod = _abs_module(item.module or "", item.level or 0, current)
    if not mod:
        return []
    hits = [index[f"{mod}.{a.name}"] for a in item.names if f"{mod}.{a.name}" in index]
    if mod in index:
        hits.append(index[mod])
    return hits


def parse_python(path: Path, mod_index: dict[str, str]) -> FileNode:
    src = path.read_text(encoding="utf-8", errors="replace")
    node = FileNode(path=rel(path), lang="python", lines=src.count("\n") + 1)
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return node

    prefix = _router_prefix(tree)

    for item in tree.body:
        if isinstance(item, (ast.Import, ast.ImportFrom)):
            if isinstance(item, ast.Import):
                for a in item.names:
                    hit = mod_index.get(a.name)
                    (node.imports if hit else node.ext_imports).append(hit or a.name)
            else:
                hits = _resolve_from_import(item, path, mod_index)
                if hits:
                    node.imports.extend(hits)
                elif item.module:
                    node.ext_imports.append(item.module)

        elif isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
            node.symbols.append({"name": item.name, "kind": "func", "line": item.lineno})
            for dec in item.decorator_list:
                route = _decorator_route(dec)
                if route:
                    method, rpath = route
                    node.routes.append({
                        "method": method,
                        "path": (prefix + rpath).rstrip("/") or "/",
                        "handler": item.name,
                        "line": item.lineno,
                    })

        elif isinstance(item, ast.ClassDef):
            bases = [ast.unparse(b) for b in item.bases]
            node.symbols.append({
                "name": item.name, "kind": "class", "line": item.lineno, "bases": bases,
            })
            table = None
            for sub in item.body:
                if isinstance(sub, ast.Assign) and any(
                    getattr(t, "id", None) == "__tablename__" for t in sub.targets
                ):
                    table = _const(sub.value)
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    node.symbols.append({
                        "name": f"{item.name}.{sub.name}", "kind": "method", "line": sub.lineno,
                    })
                    for dec in sub.decorator_list:
                        route = _decorator_route(dec)
                        if route:
                            method, rpath = route
                            node.routes.append({
                                "method": method,
                                "path": (prefix + rpath).rstrip("/") or "/",
                                "handler": f"{item.name}.{sub.name}",
                                "line": sub.lineno,
                            })
            if table:
                node.tables.append({"table": table, "model": item.name, "line": item.lineno})

        elif isinstance(item, ast.Assign):
            for t in item.targets:
                if isinstance(t, ast.Name) and t.id.isupper():
                    node.symbols.append({"name": t.id, "kind": "const", "line": item.lineno})
    return node


# ---------------------------------------------------------------------------
# typescript
# ---------------------------------------------------------------------------

RE_IMPORT = re.compile(r"""(?:^|\n)\s*(?:import|export)\s[^;\n]*?from\s+['"]([^'"]+)['"]""")
RE_EXPORT_FN = re.compile(r"""^\s*export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)""", re.M)
RE_EXPORT_CONST = re.compile(r"""^\s*export\s+(?:const|let|var)\s+(\w+)""", re.M)
RE_EXPORT_CLASS = re.compile(r"""^\s*export\s+(?:default\s+)?class\s+(\w+)""", re.M)
RE_EXPORT_TYPE = re.compile(r"""^\s*export\s+(?:type|interface)\s+(\w+)""", re.M)
RE_LOCAL_FN = re.compile(r"""^\s*(?:async\s+)?function\s+(\w+)""", re.M)
RE_SERVER_ACTION = re.compile(r"""['"]use server['"]""")
RE_FETCH_PATH = re.compile(r"""['"`](/api/[\w\-/{}\[\]$.]+)['"`]""")


def _ts_url_path(path: Path) -> str | None:
    """frontend/app/(shop)/store/[id]/page.tsx -> /store/[id]"""
    r = rel(path)
    if not r.startswith("frontend/app/"):
        return None
    name = path.name
    if name not in {"page.tsx", "page.ts", "layout.tsx", "route.ts", "route.tsx"}:
        return None
    segs = r[len("frontend/app/"):].split("/")[:-1]
    segs = [s for s in segs if not (s.startswith("(") and s.endswith(")"))]
    url = "/" + "/".join(segs)
    return url if url != "/" else "/"


def _resolve_ts_import(spec: str, current: Path) -> str | None:
    if spec.startswith("@/"):
        base = REPO / "frontend" / spec[2:]
    elif spec.startswith("."):
        base = (current.parent / spec).resolve()
    else:
        return None
    for cand in (
        base.with_suffix(".ts"), base.with_suffix(".tsx"),
        base / "index.ts", base / "index.tsx", base,
    ):
        if cand.exists() and cand.is_file():
            try:
                return rel(cand)
            except ValueError:
                return None
    return None


def parse_ts(path: Path) -> FileNode:
    src = path.read_text(encoding="utf-8", errors="replace")
    node = FileNode(path=rel(path), lang="ts", lines=src.count("\n") + 1)
    node.client = bool(re.search(r"""^\s*['"]use client['"]""", src, re.M))
    node.page = _ts_url_path(path)

    lines = src.split("\n")

    def line_of(name: str, pattern: str) -> int:
        for i, ln in enumerate(lines, 1):
            if re.search(pattern % re.escape(name), ln):
                return i
        return 1

    seen = set()
    for rx, kind, pat in (
        (RE_EXPORT_FN, "func", r"function\s+%s\b"),
        (RE_EXPORT_CONST, "const", r"(?:const|let|var)\s+%s\b"),
        (RE_EXPORT_CLASS, "class", r"class\s+%s\b"),
        (RE_EXPORT_TYPE, "type", r"(?:type|interface)\s+%s\b"),
        (RE_LOCAL_FN, "local-func", r"function\s+%s\b"),
    ):
        for name in rx.findall(src):
            if name in seen:
                continue
            seen.add(name)
            node.symbols.append({
                "name": name, "kind": kind, "line": line_of(name, pat),
                **({"exported": True} if kind != "local-func" else {}),
            })

    for spec in RE_IMPORT.findall(src):
        hit = _resolve_ts_import(spec, path)
        (node.imports if hit else node.ext_imports).append(hit or spec)

    if node.page:
        node.routes.append({
            "method": "PAGE" if path.name.startswith("page") else
                      ("LAYOUT" if path.name.startswith("layout") else "HANDLER"),
            "path": node.page, "handler": path.name, "line": 1,
        })

    # API endpoints this file calls — the frontend↔backend seam.
    calls = sorted({m for m in RE_FETCH_PATH.findall(src)})
    if calls:
        node.symbols.append({"name": "__calls__", "kind": "api-calls", "line": 1, "paths": calls})
    if RE_SERVER_ACTION.search(src):
        node.symbols.append({"name": "__server_action__", "kind": "marker", "line": 1})
    return node


# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

def build() -> dict:
    files = tracked_files()
    py_files = [p for p in files if p.suffix in PY_EXT and p.name not in SKIP_FILES]
    ts_files = [p for p in files if p.suffix in TS_EXT and p.name not in SKIP_FILES]

    mod_index = {_py_module_name(p): rel(p) for p in py_files}

    nodes: dict[str, FileNode] = {}
    for p in py_files:
        n = parse_python(p, mod_index)
        nodes[n.path] = n
    for p in ts_files:
        n = parse_ts(p)
        nodes[n.path] = n

    importers: dict[str, list[str]] = defaultdict(list)
    for n in nodes.values():
        for dep in set(n.imports):
            importers[dep].append(n.path)

    graph = {
        "schema": SCHEMA_VERSION,
        "root": str(REPO),
        "generated_by": "tools/graphify.py",
        "revision": _git_rev(),
        "counts": {
            "files": len(nodes),
            "python": len(py_files),
            "ts": len(ts_files),
            "symbols": sum(len(n.symbols) for n in nodes.values()),
            "api_routes": sum(len([r for r in n.routes if r["method"] in HTTP_METHODS_UPPER])
                              for n in nodes.values()),
            "page_routes": sum(len([r for r in n.routes if r["method"] == "PAGE"])
                               for n in nodes.values()),
            "tables": sum(len(n.tables) for n in nodes.values()),
        },
        "files": {p: n.as_dict() for p, n in sorted(nodes.items())},
        "importers": {k: sorted(v) for k, v in sorted(importers.items())},
    }
    GRAPH_DIR.mkdir(exist_ok=True)
    GRAPH_JSON.write_text(json.dumps(graph, indent=1) + "\n", encoding="utf-8")
    GRAPH_MD.write_text(render_markdown(graph), encoding="utf-8")
    MODULES_MD.write_text(render_modules(graph), encoding="utf-8")
    return graph


HTTP_METHODS_UPPER = {m.upper() for m in HTTP_METHODS}


def _git_rev() -> str:
    try:
        return subprocess.run(
            ["git", "-C", str(REPO), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


# ---------------------------------------------------------------------------
# markdown view
# ---------------------------------------------------------------------------

def render_markdown(graph: dict) -> str:
    files = graph["files"]
    c = graph["counts"]
    out: list[str] = []
    w = out.append

    w("# Code graph")
    w("")
    w(f"Generated by `tools/graphify.py` at `{graph['revision']}`. "
      "Do not edit by hand — run `python3 tools/graphify.py build`.")
    w("")
    w(f"`{c['files']}` files · `{c['python']}` python · `{c['ts']}` ts/tsx · "
      f"`{c['symbols']}` symbols · `{c['api_routes']}` API routes · "
      f"`{c['page_routes']}` pages · `{c['tables']}` tables")
    w("")
    w("Full detail lives in `.graph/graph.json`; query it with "
      "`python3 tools/graphify.py query <term>`.")
    w("")

    # --- API routes ---
    w("## API routes")
    w("")
    w("Paths are as mounted on FastAPI. nginx proxies `/api/` to the backend root, "
      "so the browser-facing URL is `/api` + the path below.")
    w("")
    api = []
    for path, f in files.items():
        for r in f.get("routes", []):
            if r["method"] in HTTP_METHODS_UPPER:
                api.append((r["path"], r["method"], r["handler"], path, r["line"]))
    api.sort()
    w("| Method | Path | Handler | Source |")
    w("| --- | --- | --- | --- |")
    for rpath, method, handler, src, line in api:
        w(f"| {method} | `{rpath}` | `{handler}` | [{src}:{line}]({src}#L{line}) |")
    w("")

    # --- pages ---
    w("## Page routes (Next.js app router)")
    w("")
    pages = sorted(
        (r["path"], path)
        for path, f in files.items() for r in f.get("routes", []) if r["method"] == "PAGE"
    )
    w("| URL | File | Client |")
    w("| --- | --- | --- |")
    for url, src in pages:
        w(f"| `{url}` | [{src}]({src}) | {'yes' if files[src].get('client') else 'no'} |")
    w("")

    # --- tables ---
    w("## Database models")
    w("")
    tables = sorted(
        (t["table"], t["model"], path, t["line"])
        for path, f in files.items() for t in f.get("tables", [])
    )
    w("| Table | Model | Source |")
    w("| --- | --- | --- |")
    for table, model, src, line in tables:
        w(f"| `{table}` | `{model}` | [{src}:{line}]({src}#L{line}) |")
    w("")

    # --- most-depended-on files ---
    w("## Most-imported modules")
    w("")
    w("Change these carefully — the blast radius is listed.")
    w("")
    hot = sorted(graph["importers"].items(), key=lambda kv: -len(kv[1]))[:25]
    w("| File | Imported by |")
    w("| --- | --- |")
    for path, imps in hot:
        w(f"| [{path}]({path}) | {len(imps)} |")
    w("")

    w("## Module index")
    w("")
    w("Per-directory symbol listing lives in [MODULES.md](MODULES.md).")
    w("")

    return "\n".join(out) + "\n"


def render_modules(graph: dict) -> str:
    files = graph["files"]
    out: list[str] = []
    w = out.append
    w("# Module index")
    w("")
    w(f"Generated by `tools/graphify.py` at `{graph['revision']}`. "
      "Every file, with the symbols it defines. Overview in [GRAPH.md](GRAPH.md).")
    w("")

    by_dir: dict[str, list[str]] = defaultdict(list)
    for path, f in files.items():
        exported = [
            s["name"] for s in f["symbols"]
            if s["kind"] in {"class", "func", "method", "const", "type", "local-func"}
            and not s["name"].startswith("__")
        ]
        by_dir[str(Path(path).parent)].append(
            f"- [{Path(path).name}]({path}) — " +
            (", ".join(f"`{s}`" for s in exported[:12]) + ("…" if len(exported) > 12 else "")
             if exported else "_no top-level symbols_")
        )
    for d in sorted(by_dir):
        w(f"### `{d}/`")
        w("")
        out.extend(sorted(by_dir[d]))
        w("")

    return "\n".join(out) + "\n"


# ---------------------------------------------------------------------------
# queries
# ---------------------------------------------------------------------------

def load() -> dict:
    if not GRAPH_JSON.exists():
        sys.exit("No graph yet — run: python3 tools/graphify.py build")
    return json.loads(GRAPH_JSON.read_text(encoding="utf-8"))


def cmd_query(term: str) -> None:
    graph = load()
    t = term.lower()
    hits = 0

    print(f"# symbols matching '{term}'")
    for path, f in graph["files"].items():
        for s in f["symbols"]:
            if t in s["name"].lower():
                print(f"  {s['kind']:<10} {s['name']:<40} {path}:{s['line']}")
                hits += 1

    print(f"\n# routes matching '{term}'")
    for path, f in graph["files"].items():
        for r in f.get("routes", []):
            if t in r["path"].lower() or t in r["handler"].lower():
                print(f"  {r['method']:<7} {r['path']:<45} {path}:{r['line']}")
                hits += 1

    print(f"\n# tables matching '{term}'")
    for path, f in graph["files"].items():
        for tb in f.get("tables", []):
            if t in tb["table"].lower() or t in tb["model"].lower():
                print(f"  {tb['table']:<25} {tb['model']:<25} {path}:{tb['line']}")
                hits += 1

    print(f"\n# file paths matching '{term}'")
    for path in graph["files"]:
        if t in path.lower():
            print(f"  {path}")
            hits += 1

    if not hits:
        print(f"\nNothing in the graph matches '{term}'. "
              "Either it is not a symbol/route/table/path, or the graph is stale "
              "(`python3 tools/graphify.py stale`). Grep is the right fallback here.")


def cmd_file(path: str) -> None:
    graph = load()
    f = graph["files"].get(path)
    if not f:
        matches = [p for p in graph["files"] if path in p]
        if len(matches) == 1:
            path, f = matches[0], graph["files"][matches[0]]
        elif matches:
            print("Multiple matches:")
            for m in matches:
                print("  " + m)
            return
        else:
            sys.exit(f"Not in graph: {path}")

    print(f"# {path}  ({f['lang']}, {f['lines']} lines"
          f"{', client component' if f.get('client') else ''})")
    if f.get("page"):
        print(f"  serves URL: {f['page']}")
    print("\n## defines")
    for s in f["symbols"]:
        extra = ""
        if s.get("bases"):
            extra = f"  <- {', '.join(s['bases'])}"
        if s.get("paths"):
            extra = "  " + ", ".join(s["paths"])
        print(f"  {s['kind']:<10} {s['name']}{extra}  :{s['line']}")
    if f.get("routes"):
        print("\n## routes")
        for r in f["routes"]:
            print(f"  {r['method']:<7} {r['path']}  -> {r['handler']}:{r['line']}")
    if f.get("tables"):
        print("\n## tables")
        for t in f["tables"]:
            print(f"  {t['table']} -> {t['model']}:{t['line']}")
    print("\n## imports (in-repo)")
    for i in f["imports"]:
        print(f"  {i}")
    if f["ext_imports"]:
        print("\n## imports (external)")
        print("  " + ", ".join(f["ext_imports"]))
    print("\n## imported by")
    for i in graph["importers"].get(path, []):
        print(f"  {i}")


def cmd_routes(filt: str | None) -> None:
    graph = load()
    rows = []
    for path, f in graph["files"].items():
        for r in f.get("routes", []):
            if filt and filt.lower() not in r["path"].lower():
                continue
            rows.append((r["path"], r["method"], r["handler"], path, r["line"]))
    for rpath, method, handler, src, line in sorted(rows):
        print(f"{method:<7} {rpath:<50} {handler:<30} {src}:{line}")


def cmd_importers(path: str) -> None:
    graph = load()
    imps = graph["importers"].get(path)
    if imps is None:
        matches = [p for p in graph["importers"] if path in p]
        if len(matches) == 1:
            path, imps = matches[0], graph["importers"][matches[0]]
        else:
            print(f"Nothing in the graph imports {path}")
            return
    print(f"# {len(imps)} files import {path}")
    for i in imps:
        print(f"  {i}")


def cmd_stale() -> None:
    """Compare the graph's revision + file set against the working tree."""
    graph = load()
    current = {rel(p) for p in tracked_files()}
    known = set(graph["files"])
    added, removed = current - known, known - current
    rev = _git_rev()

    try:
        dirty = subprocess.run(
            ["git", "-C", str(REPO), "diff", "--name-only", graph["revision"], "--"],
            capture_output=True, text=True, check=True,
        ).stdout.split()
    except (OSError, subprocess.CalledProcessError):
        dirty = []
    changed = [d for d in dirty if d in current]

    if not (added or removed or changed) and rev == graph["revision"]:
        print(f"Graph is current (revision {rev}, {len(known)} files).")
        return
    print(f"Graph built at {graph['revision']}, HEAD is {rev}.")
    for label, items in (("new files", added), ("deleted files", removed),
                         ("changed since build", changed)):
        if items:
            print(f"  {label}: {len(items)}")
            for i in sorted(items)[:10]:
                print(f"    {i}")
            if len(items) > 10:
                print(f"    … and {len(items) - 10} more")
    print("\nRebuild with: python3 tools/graphify.py build")


def main(argv: list[str]) -> None:
    cmd = argv[0] if argv else "build"
    arg = argv[1] if len(argv) > 1 else None
    if cmd == "build":
        g = build()
        c = g["counts"]
        print(f"Wrote {rel(GRAPH_JSON)}, {rel(GRAPH_MD)}, {rel(MODULES_MD)}: "
              f"{c['files']} files, {c['symbols']} symbols, {c['api_routes']} API routes, "
              f"{c['page_routes']} pages, {c['tables']} tables.")
    elif cmd == "query":
        if not arg:
            sys.exit("usage: graphify.py query <term>")
        cmd_query(arg)
    elif cmd == "file":
        if not arg:
            sys.exit("usage: graphify.py file <path>")
        cmd_file(arg)
    elif cmd == "routes":
        cmd_routes(arg)
    elif cmd == "importers":
        if not arg:
            sys.exit("usage: graphify.py importers <path>")
        cmd_importers(arg)
    elif cmd == "stale":
        cmd_stale()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
