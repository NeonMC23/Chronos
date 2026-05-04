from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "static" / "data" / "timezones_source.csv"
OUT = ROOT / "static" / "data" / "timezones.json"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(
            f"Missing source file: {SRC}\n"
            "Create it with columns: continent,country,city,timezone,flagEmoji,lat,lon (lat/lon optional)."
        )

    entries: list[dict] = []
    with SRC.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"continent", "country", "city", "timezone", "flagEmoji"}
        if not required.issubset(reader.fieldnames or set()):
            raise SystemExit(f"CSV must contain columns: {', '.join(sorted(required))}")

        for row in reader:
            lat = row.get("lat", "").strip()
            lon = row.get("lon", "").strip()
            entry: dict = {
                "continent": (row.get("continent") or "").strip(),
                "country": (row.get("country") or "").strip(),
                "city": (row.get("city") or "").strip(),
                "timezone": (row.get("timezone") or "").strip(),
                "flagEmoji": (row.get("flagEmoji") or "").strip(),
            }
            if lat and lon:
                try:
                    entry["coordinates"] = [float(lat), float(lon)]
                except ValueError:
                    pass
            if entry["timezone"]:
                entries.append(entry)

    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {OUT}")


if __name__ == "__main__":
    main()

