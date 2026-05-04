"""Chronos — offline-first single-page app (SPA) server.

Serves a single page (SPA) and local static assets (no external network).
"""

from __future__ import annotations

from flask import Flask, render_template


def create_app() -> Flask:
    app = Flask(__name__, static_folder="../static", template_folder="../templates")

    @app.get("/")
    def index():
        return render_template("index.html")

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
