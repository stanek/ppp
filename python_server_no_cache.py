#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000          # change if you like

class NoCacheHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that always disables browser caching."""
    def end_headers(self):
        # Strongest possible trio of headers recognised by every browser + proxy
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    print(f"Serving http://localhost:{PORT}/  (cache disabled)…")
    ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()