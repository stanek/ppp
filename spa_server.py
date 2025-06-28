# spa_server.py  (keep it one level ABOVE the ppp/ folder)
from http.server import SimpleHTTPRequestHandler, HTTPServer
import os
from pathlib import Path
from urllib.parse import unquote

ROOT_PREFIX = "/ppp/"          # URL prefix
SPA_INDEX   = "index.html"     # single copy lives in ppp/index.html


class SPAHandler(SimpleHTTPRequestHandler):
    """Serve one-page app for any /ppp/* deep link, with or without trailing slash."""

    def send_head(self):
        # Original URL → local filesystem path
        fs_path = Path(self.translate_path(unquote(self.path)))

        if self.path.startswith(ROOT_PREFIX):
            # If it's a directory *or* a missing file → fall back
            if fs_path.is_dir() or not fs_path.exists():
                spa_path = Path(self.translate_path(f"{ROOT_PREFIX}{SPA_INDEX}"))
                # Standard file-serving block
                self.send_response(200)
                self.send_header("Content-type", self.guess_type(spa_path))
                self.send_header("Content-length", spa_path.stat().st_size)
                self.end_headers()
                return spa_path.open("rb")

        # Otherwise let the normal handler deal with it
        return super().send_head()


if __name__ == "__main__":
    print("Serving on http://localhost:8000 …  (Ctrl-C to stop)")
    HTTPServer(("0.0.0.0", 8000), SPAHandler).serve_forever()
