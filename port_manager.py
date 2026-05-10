import json
import os

# Absolute path to port.json (project root), safe even when CWD is not the project folder
_ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT_FILE = os.path.join(_ROOT_DIR, "port.json")


def get_port(default=5000):
    """
    Read the port from port.json or return the default.
    Creates port.json if missing.
    If the file is corrupted or invalid, it is recreated using the default.
    """
    if not os.path.exists(PORT_FILE):
        _write_port(default)
        return default

    try:
        with open(PORT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        port = data["port"]
        if port is None:
            return default
        port = int(port)
        if port <= 0 or port > 65535:
            raise ValueError("port out of range")
        return port
    except (json.JSONDecodeError, KeyError, TypeError, ValueError):
        _write_port(default)
        return default


def set_port(port):
    """Update port.json with the given port."""
    _write_port(int(port))


def _write_port(port):
    tmp = PORT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"port": port}, f)
    os.replace(tmp, PORT_FILE)
