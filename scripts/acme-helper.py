#!/usr/bin/env python3
"""Localhost ACME helper: issue a Let's Encrypt cert for one custom hostname.

The app container POSTs here; this process runs on the host as root so it can
edit Nginx and invoke certbot. Listen on 127.0.0.1 only.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

HOSTNAME_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$"
)
SITES_AVAILABLE = Path("/etc/nginx/sites-available")
SITES_ENABLED = Path("/etc/nginx/sites-enabled")
PROXY_CONF_NAME = os.environ.get("APP_DOMAIN", "rewindom.com")

TOKEN = os.environ.get("ACME_HELPER_TOKEN", "").strip()
PORT = int(os.environ.get("ACME_HELPER_PORT", "9370"))
APP_PORT = os.environ.get("APP_PORT", "3700")
SSL_EMAIL = os.environ.get("SSL_EMAIL", "").strip()


def _valid_hostname(value: str) -> bool:
    return bool(HOSTNAME_RE.fullmatch(value)) and "*" not in value


def _auth_ok(handler: BaseHTTPRequestHandler) -> bool:
    if not TOKEN:
        return False
    header = handler.headers.get("Authorization", "")
    return header == f"Bearer {TOKEN}"


def _run(argv: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        check=False,
        capture_output=True,
        text=True,
        timeout=180,
    )


def _proxy_location() -> str:
    return f"""    location / {{
        proxy_pass http://127.0.0.1:{APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 180s;
    }}
"""


def _write_http_vhost(names: list[str], dest: Path) -> None:
    server_name = " ".join(names)
    dest.write_text(
        "# rewindom-custom-domain\n"
        "server {\n"
        "    listen 80;\n"
        f"    server_name {server_name};\n"
        "    client_max_body_size 100m;\n"
        f"{_proxy_location()}"
        "}\n"
    )


def _strip_names_from_platform_vhost(names: list[str]) -> None:
    conf = SITES_AVAILABLE / PROXY_CONF_NAME
    if not conf.is_file():
        return
    text = conf.read_text()
    drop = set(names)
    changed = False

    def repl(match: re.Match[str]) -> str:
        nonlocal changed
        tokens = match.group(1).split()
        kept = [token for token in tokens if token not in drop]
        if kept != tokens:
            changed = True
        return "server_name " + " ".join(kept) + ";"

    next_text = re.sub(r"server_name ([^;]+);", repl, text)
    if changed:
        conf.write_text(next_text)


LISTEN_443_RE = re.compile(r"^(\s*listen\s+(?:\[::\]:)?443\s+ssl)(;.*)$", re.M)


def _enable_http2(conf: Path) -> bool:
    """Add `http2` to certbot's `listen 443 ssl;` lines. Returns True if changed.

    certbot writes the TLS listen line itself and never enables HTTP/2, so a
    freshly issued custom domain would be stuck on HTTP/1.1. Idempotent: once
    the line says `ssl http2` it no longer matches.

    nginx >= 1.25.1 prefers a separate `http2 on;` directive, but the listen
    parameter still works there and is the only spelling on 1.24 (production).
    """
    if not conf.is_file():
        return False
    text = conf.read_text()
    next_text = LISTEN_443_RE.sub(r"\1 http2\2", text)
    if next_text == text:
        return False
    conf.write_text(next_text)
    return True


HSTS_LINE = (
    '    add_header Strict-Transport-Security '
    '"max-age=31536000; includeSubDomains" always;'
)
LISTEN_443_ANY_RE = re.compile(r"^(\s*listen\s+(?:\[::\]:)?443\s+ssl(?:\s+http2)?(;.*))$", re.M)


def _enable_hsts(conf: Path) -> bool:
    """Add HSTS to a certbot-managed 443 server block. Returns True if changed."""
    if not conf.is_file():
        return False
    text = conf.read_text()
    if "Strict-Transport-Security" in text:
        return False
    match = LISTEN_443_ANY_RE.search(text)
    if not match:
        return False
    conf.write_text(text.replace(match.group(0), f"{match.group(0)}\n{HSTS_LINE}", 1))
    return True


def _issue(names: list[str]) -> dict[str, Any]:
    if not names:
        return {"ok": False, "error": "names required"}
    for name in names:
        if not _valid_hostname(name):
            return {"ok": False, "error": f"invalid hostname: {name}"}
    if not SSL_EMAIL:
        return {"ok": False, "error": "SSL_EMAIL is not set"}

    primary = names[0]
    vhost = SITES_AVAILABLE / primary
    enabled = SITES_ENABLED / primary
    _write_http_vhost(names, vhost)
    if enabled.exists() or enabled.is_symlink():
        enabled.unlink()
    enabled.symlink_to(vhost)
    _strip_names_from_platform_vhost(names)

    test = _run(["nginx", "-t"])
    if test.returncode != 0:
        return {
            "ok": False,
            "error": (test.stderr or test.stdout or "nginx -t failed").strip(),
        }
    _run(["systemctl", "reload", "nginx"])

    certbot_cmd = [
        "certbot",
        "--nginx",
        "--cert-name",
        primary,
        "--non-interactive",
        "--agree-tos",
        "--redirect",
        "-m",
        SSL_EMAIL,
    ]
    for name in names:
        certbot_cmd.extend(["-d", name])
    issued = _run(certbot_cmd)
    if issued.returncode != 0:
        return {
            "ok": False,
            "error": (issued.stderr or issued.stdout or "certbot failed").strip()[
                :2000
            ],
        }

    # certbot 刚写完 443 listen 行；补上 http2 / HSTS 再 reload。失败不影响签发结果——
    # 证书已经拿到了，退回 HTTP/1.1 或暂时没 HSTS 只是慢一点 / 少一颗头。
    changed = _enable_http2(vhost)
    changed = _enable_hsts(vhost) or changed
    if changed and _run(["nginx", "-t"]).returncode == 0:
        _run(["systemctl", "reload", "nginx"])

    return {"ok": True, "names": names}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/health":
            self._send(404, {"ok": False, "error": "not found"})
            return
        self._send(200, {"ok": True})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/issue":
            self._send(404, {"ok": False, "error": "not found"})
            return
        if not _auth_ok(self):
            self._send(401, {"ok": False, "error": "unauthorized"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self._send(400, {"ok": False, "error": "invalid json"})
            return
        names = body.get("names")
        if not isinstance(names, list) or not all(isinstance(n, str) for n in names):
            self._send(400, {"ok": False, "error": "names must be a string array"})
            return
        result = _issue([n.strip().lower() for n in names if n.strip()])
        self._send(200 if result.get("ok") else 502, result)


def main() -> None:
    if not TOKEN:
        sys.stderr.write("ACME_HELPER_TOKEN is required\n")
        sys.exit(1)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    sys.stderr.write(f"acme-helper listening on 127.0.0.1:{PORT}\n")
    server.serve_forever()


if __name__ == "__main__":
    main()
