#!/usr/bin/env python3
"""
spa_server.py  (keep this file inside ppp/)

Normal usage:
    python ppp/spa_server.py                # SPA server on http://localhost:8000

Live-reload:
    pip install livereload
    python ppp/spa_server.py --live         # same server + auto-refresh
    python ppp/spa_server.py --live --port 9000
"""

import argparse
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT_PREFIX = "/ppp/"        # URL prefix under which the SPA lives
SPA_INDEX   = "index.html"   # single copy in ppp/index.html
WS_PORT     = 35729          # livereload's default WebSocket port


class SPAHandler(SimpleHTTPRequestHandler):
    """Serve /ppp/index.html for any /ppp/* deep link
    (folder or missing file) so the JS router can take over."""

    def send_head(self):
        fs_path = Path(self.translate_path(unquote(self.path)))

        # Intercept only requests that start with /ppp/
        if self.path.startswith(ROOT_PREFIX):
            # If path is a directory (trailing slash) OR file is missing → fallback
            if fs_path.is_dir() or not fs_path.exists():
                spa_path = Path(self.translate_path(f"{ROOT_PREFIX}{SPA_INDEX}"))
                if spa_path.exists():
                    self.send_response(200)
                    self.send_header("Content-type", self.guess_type(str(spa_path)))
                    self.send_header("Content-length", spa_path.stat().st_size)
                    self.end_headers()
                    return spa_path.open("rb")

        # Otherwise default static-file behaviour
        return super().send_head()


# ---------------------------------------------------------------------------

def start_static_server(port: int):
    """Serve the SPA on the given port (foreground)."""
    httpd = HTTPServer(("0.0.0.0", port), SPAHandler)
    print(f"SPA server running → http://localhost:{port}{ROOT_PREFIX}  (Ctrl-C to stop)")
    httpd.serve_forever()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="Enable live-reload (needs pip install livereload)")
    ap.add_argument("--port", type=int, default=8000, help="Port for the SPA server")
    args = ap.parse_args()

    if not args.live:
        start_static_server(args.port)
        return

    # ─────────── live-reload branch ───────────
    try:
        from livereload import Server as LiveServer
    except ImportError:
        raise SystemExit("Live-reload requested but 'livereload' is not installed.\n"
                         "Run:  pip install livereload")

    # 1. Start the SPA server on a background thread
    threading.Thread(target=start_static_server, args=(args.port,), daemon=True).start()

    # 2. Open the main snapshot in the browser
    webbrowser.open_new_tab(f"http://localhost:{args.port}{ROOT_PREFIX}1/")

    # 3. Start the livereload WebSocket server (no HTML serving)
    lr = LiveServer()
    lr.watch('ppp/**/*.*')          # watch everything under ppp/
    print(f"Live-reload watching ppp/**/*.* (WS on port {WS_PORT})")
    lr.serve(host="localhost", port=WS_PORT, open_url=False)


if __name__ == "__main__":
    main()
