"""Chronos — Flask app object.

Use `python start.py` to run and open the browser.
"""

from __future__ import annotations

from server.app import create_app

app = create_app()

__all__ = ["app"]
