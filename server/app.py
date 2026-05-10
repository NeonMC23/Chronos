"""Chronos — offline-first single-page app (SPA) server.

Serves a single page (SPA) and local static assets (no external network).
"""

from __future__ import annotations

from flask import Flask, render_template, jsonify

from port_manager import get_port


def create_app() -> Flask:
    app = Flask(__name__, static_folder="../static", template_folder="../templates")

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/port.json")
    def port_json():
        return jsonify({"port": get_port(default=5000)})

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000, debug=True)
