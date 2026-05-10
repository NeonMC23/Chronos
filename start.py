from __future__ import annotations

import socket
import sys
import threading
import time
import webbrowser
import os

from server.app import create_app
from port_manager import get_port


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def open_browser(url: str) -> None:
    time.sleep(0.6)
    try:
        webbrowser.open_new(url)
    except Exception:
        pass


if __name__ == "__main__":
    host = "127.0.0.1"
    port = get_port(default=5000)
    url = f"http://{host}:{port}"

    if not is_port_available(host, port):
        print(f"Port {port} is already in use. Try another port.")
        sys.exit(1)

    app = create_app()

    # In debug mode, Flask's reloader can start the app twice; only open the browser once.
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        threading.Thread(target=open_browser, args=(url,), daemon=True).start()

    app.run(debug=True, use_reloader=True, host="0.0.0.0", port=port)
