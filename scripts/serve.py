"""Preview the site locally the way GitHub Pages serves it.

    python scripts/serve.py            # http://127.0.0.1:8765
    python scripts/serve.py 8000       # another port

Page addresses on the site are clean (/donate, not /donate.html), which GitHub
Pages resolves by itself. Python's own http.server does not, so with it every
internal link 404s locally. This server maps /about to about.html, / to
index.html, and a missing path to 404.html, like the real host."""
import http.server, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        full = super().translate_path(path)
        if os.path.isdir(full) or os.path.isfile(full):
            return full
        if os.path.isfile(full + ".html"):
            return full + ".html"
        return os.path.join(ROOT, "404.html")

    def send_head(self):
        if self.translate_path(self.path).endswith("404.html") and not self.path.endswith("404.html"):
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            return open(os.path.join(ROOT, "404.html"), "rb")
        return super().send_head()


if __name__ == "__main__":
    print(f"Serving {ROOT} at http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
