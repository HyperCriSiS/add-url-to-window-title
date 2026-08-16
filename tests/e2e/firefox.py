#!/usr/bin/env python3
import contextlib
import http.server
import os
import pathlib
import shutil
import socketserver
import sys
import threading

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

FIXTURES = {
    "/static": """<!doctype html><html><head><meta charset='utf-8'><title>Static Title</title></head><body>static</body></html>""",
    "/dynamic": """<!doctype html><html><head><meta charset='utf-8'><title>Initial</title></head><body><script>setTimeout(() => { document.title = 'Updated'; }, 100);</script></body></html>""",
    "/spa": """<!doctype html><html><head><meta charset='utf-8'><title>SPA Start</title></head><body><script>setTimeout(() => { history.pushState({}, '', '/spa-next?source=test#result'); document.title = 'SPA Next'; }, 100);</script></body></html>""",
    "/late-title": """<!doctype html><html><head><meta charset='utf-8'></head><body><script>setTimeout(() => { document.title = 'Late Title'; }, 100);</script></body></html>""",
    "/replace-title": """<!doctype html><html><head><meta charset='utf-8'><title>Before Replace</title></head><body><script>setTimeout(() => { const oldTitle = document.querySelector('title'); const newTitle = document.createElement('title'); newTitle.textContent = 'After Replace'; oldTitle.replaceWith(newTitle); }, 100);</script></body></html>""",
    "/move-title": """<!doctype html><html><head><meta charset='utf-8'><title>Before Move</title></head><body><script>setTimeout(() => { const title = document.querySelector('title'); document.body.appendChild(title); title.textContent = 'After Move'; }, 100);</script></body></html>""",
    "/rebase": """<!doctype html><html><head><meta charset='utf-8'><title>Inbox</title></head><body><script>setTimeout(() => { document.title = '(2) ' + document.title; }, 250);</script></body></html>""",
    "/stress": """<!doctype html><html><head><meta charset='utf-8'><title>Stress 0</title></head><body><script>let i=0; const timer=setInterval(() => { i += 1; document.title='Stress ' + i; if (i === 30) clearInterval(timer); }, 20);</script></body></html>""",
}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?", 1)[0]
        body = FIXTURES.get(path)
        if body is None:
            self.send_response(404)
            self.end_headers()
            return
        payload = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def local_server():
    class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
        daemon_threads = True

    server = ThreadingServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def wait_for_title(driver, expected, timeout=10):
    WebDriverWait(driver, timeout).until(lambda current: current.title == expected)
    assert driver.title == expected, (driver.title, expected)


def run_case(driver, base_url, path, expected):
    driver.get(base_url + path)
    wait_for_title(driver, expected)
    print(f"PASS {path}: {driver.title}", flush=True)


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: firefox.py <extension.xpi>")

    extension_path = pathlib.Path(sys.argv[1]).resolve()
    if not extension_path.is_file():
        raise SystemExit(f"extension package does not exist: {extension_path}")

    options = Options()
    options.add_argument("-headless")
    firefox_path = os.environ.get("FIREFOX_PATH")
    if firefox_path:
        options.binary_location = firefox_path

    geckodriver_path = os.environ.get("GECKODRIVER_PATH") or shutil.which("geckodriver")
    if not geckodriver_path:
        raise SystemExit("geckodriver was not found in PATH")

    print(f"Using geckodriver: {geckodriver_path}", flush=True)
    service = Service(executable_path=geckodriver_path)

    with local_server() as base_url:
        driver = webdriver.Firefox(options=options, service=service)
        try:
            addon_id = driver.install_addon(str(extension_path), temporary=True)
            assert addon_id == "add-url-to-window-title@w3b.world", addon_id
            print(f"PASS temporary add-on install: {addon_id}", flush=True)

            host = "127.0.0.1/"
            run_case(driver, base_url, "/static", f"Static Title - {host}")
            run_case(driver, base_url, "/dynamic", f"Updated - {host}")
            run_case(driver, base_url, "/spa", f"SPA Next - {host}")
            assert driver.current_url.endswith("/spa-next?source=test#result"), driver.current_url
            run_case(driver, base_url, "/late-title", f"Late Title - {host}")
            run_case(driver, base_url, "/replace-title", f"After Replace - {host}")
            run_case(driver, base_url, "/move-title", f"After Move - {host}")
            run_case(driver, base_url, "/rebase", f"(2) Inbox - {host}")
            run_case(driver, base_url, "/stress", f"Stress 30 - {host}")
            assert driver.title.count(host) == 1, driver.title
        finally:
            driver.quit()


if __name__ == "__main__":
    main()
