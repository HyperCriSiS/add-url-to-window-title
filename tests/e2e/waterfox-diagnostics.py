#!/usr/bin/env python3
import contextlib
import http.server
import json
import os
import pathlib
import shutil
import socketserver
import sys
import tempfile
import threading
import zipfile

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

PAGE = "<!doctype html><html><head><meta charset='utf-8'><title>Static Title</title></head><body>probe</body></html>"


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        payload = PAGE.encode("utf-8")
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
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def read_zip(path):
    with zipfile.ZipFile(path) as source:
        files = {name: source.read(name) for name in source.namelist() if not name.endswith("/")}
    manifest = json.loads(files["manifest.json"].decode("utf-8"))
    return files, manifest


def write_variant(source_path, target_path, transform, extra_files=None):
    files, manifest = read_zip(source_path)
    transform(manifest)
    files["manifest.json"] = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
    for name, content in (extra_files or {}).items():
        files[name] = content.encode("utf-8")
    with zipfile.ZipFile(target_path, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for name, content in files.items():
            target.writestr(name, content)


def drop_main_world(manifest):
    manifest["content_scripts"] = [
        entry for entry in manifest.get("content_scripts", []) if entry.get("world") != "MAIN"
    ]


def drop_advanced_matching(manifest):
    drop_main_world(manifest)
    for entry in manifest.get("content_scripts", []):
        entry.pop("match_about_blank", None)
        entry.pop("match_origin_as_fallback", None)


def minimal_probe(manifest):
    manifest["name"] = "Waterfox Content Script Probe"
    manifest["content_scripts"] = [{
        "matches": ["http://*/*", "https://*/*"],
        "js": ["waterfox-probe.js"],
        "run_at": "document_start"
    }]
    manifest["permissions"] = []
    manifest.pop("host_permissions", None)
    manifest.pop("options_ui", None)
    manifest["browser_specific_settings"] = {
        "gecko": {
            "id": "waterfox-content-script-probe@w3b.world",
            "data_collection_permissions": {"required": ["none"]}
        }
    }


def minimal_mv2_probe(manifest):
    manifest.clear()
    manifest.update({
        "manifest_version": 2,
        "name": "Waterfox MV2 Content Script Probe",
        "version": "1.0.0",
        "permissions": ["http://*/*", "https://*/*"],
        "content_scripts": [{
            "matches": ["http://*/*", "https://*/*"],
            "js": ["waterfox-probe.js"],
            "run_at": "document_start"
        }],
        "browser_specific_settings": {
            "gecko": {
                "id": "waterfox-mv2-content-script-probe@w3b.world"
            }
        }
    })


def make_options():
    options = Options()
    options.add_argument("-headless")
    firefox_path = os.environ.get("FIREFOX_PATH")
    if firefox_path:
        options.binary_location = firefox_path
    return options


def run_probe(extension_path, url, expected_title, label):
    geckodriver_path = os.environ.get("GECKODRIVER_PATH") or shutil.which("geckodriver")
    if not geckodriver_path:
        raise SystemExit("geckodriver was not found in PATH")

    driver = webdriver.Firefox(
        options=make_options(),
        service=Service(executable_path=geckodriver_path)
    )
    try:
        try:
            addon_id = driver.install_addon(str(extension_path), temporary=True)
        except Exception as error:
            print(f"DIAGNOSTIC INSTALL FAIL {label}: {error}", flush=True)
            return False

        driver.get(url)
        try:
            WebDriverWait(driver, 8).until(lambda current: current.title == expected_title)
            print(
                f"DIAGNOSTIC PASS {label}: addon={addon_id} title={driver.title!r} "
                f"url={driver.current_url!r}",
                flush=True,
            )
            return True
        except Exception:
            print(
                f"DIAGNOSTIC FAIL {label}: addon={addon_id} title={driver.title!r} "
                f"url={driver.current_url!r} browser={driver.capabilities.get('browserName')!r} "
                f"version={driver.capabilities.get('browserVersion')!r}",
                flush=True,
            )
            return False
    finally:
        driver.quit()


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: waterfox-diagnostics.py <extension.xpi>")

    source = pathlib.Path(sys.argv[1]).resolve()
    if not source.is_file():
        raise SystemExit(f"extension package does not exist: {source}")

    with tempfile.TemporaryDirectory(prefix="au2wt-waterfox-diagnostics-") as temp_dir, local_server() as url:
        temp = pathlib.Path(temp_dir)

        no_main = temp / "no-main-world.xpi"
        write_variant(source, no_main, drop_main_world)
        run_probe(no_main, url, "Static Title - 127.0.0.1/", "product logic without MAIN-world navigation hook on localhost")

        basic_matching = temp / "basic-matching.xpi"
        write_variant(source, basic_matching, drop_advanced_matching)
        run_probe(basic_matching, url, "Static Title - 127.0.0.1/", "product logic without advanced match flags on localhost")

        probe = temp / "minimal-probe.xpi"
        write_variant(
            source,
            probe,
            minimal_probe,
            {"waterfox-probe.js": "document.title = 'Waterfox Probe';\n"},
        )
        run_probe(probe, url, "Waterfox Probe", "minimal MV3 content script on localhost")
        run_probe(probe, "https://example.com/", "Waterfox Probe", "minimal MV3 content script on public HTTPS")

        mv2_probe = temp / "minimal-mv2-probe.xpi"
        write_variant(
            source,
            mv2_probe,
            minimal_mv2_probe,
            {"waterfox-probe.js": "document.title = 'Waterfox MV2 Probe';\n"},
        )
        run_probe(mv2_probe, url, "Waterfox MV2 Probe", "minimal MV2 content script on localhost")


if __name__ == "__main__":
    main()
