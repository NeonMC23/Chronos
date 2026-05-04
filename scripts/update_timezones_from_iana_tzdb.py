from __future__ import annotations

import json
import re
import urllib.request
import csv
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "static" / "data" / "timezones.json"
OUT_CSV = ROOT / "static" / "data" / "timezones_source.csv"

# Public-domain TZDB files (principal locations per TZ since 1970)
TZDB_BASE = "https://ftp.iana.org/tz/tzdb-2024a"
URL_ZONE1970 = f"{TZDB_BASE}/zone1970.tab"
URL_ISO3166 = f"{TZDB_BASE}/iso3166.tab"


CONTINENT_MAP = {
    "Africa": "Africa",
    "America": "Americas",
    "Antarctica": None,  # skip
    "Arctic": None,  # skip
    "Asia": "Asia",
    "Atlantic": None,  # skip ocean
    "Australia": "Oceania",
    "Europe": "Europe",
    "Indian": None,  # skip ocean
    "Pacific": "Oceania",
    "Etc": None,  # skip
}


def flag_emoji_from_cc(cc: str) -> str:
    cc = cc.strip().upper()
    if not re.fullmatch(r"[A-Z]{2}", cc):
        return "🏳️"
    return chr(0x1F1E6 + (ord(cc[0]) - ord("A"))) + chr(0x1F1E6 + (ord(cc[1]) - ord("A")))


def parse_iso6709_latlon(s: str) -> tuple[float, float] | None:
    # Formats used in zone1970.tab:
    # ±DDMM±DDDMM or ±DDMMSS±DDDMMSS
    m = re.fullmatch(r"([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?", s.strip())
    if not m:
        return None

    lat_sign, lat_deg, lat_min, lat_sec, lon_sign, lon_deg, lon_min, lon_sec = m.groups()

    lat = int(lat_deg) + int(lat_min) / 60 + (int(lat_sec) / 3600 if lat_sec else 0.0)
    lon = int(lon_deg) + int(lon_min) / 60 + (int(lon_sec) / 3600 if lon_sec else 0.0)

    if lat_sign == "-":
        lat = -lat
    if lon_sign == "-":
        lon = -lon
    return (lat, lon)


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Chronos/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def parse_iso3166_tab(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        cc, name = line.split("\t", 1)
        out[cc.strip().upper()] = name.strip()
    return out


@dataclass(frozen=True)
class ZoneRow:
    country_codes: list[str]
    coordinates: tuple[float, float]
    tzid: str
    comment: str | None


def parse_zone1970_tab(text: str) -> list[ZoneRow]:
    rows: list[ZoneRow] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        ccs = [c.strip().upper() for c in parts[0].split(",") if c.strip()]
        coords = parse_iso6709_latlon(parts[1])
        if not coords:
            continue
        tzid = parts[2].strip()
        comment = parts[3].strip() if len(parts) >= 4 and parts[3].strip() else None
        rows.append(ZoneRow(country_codes=ccs, coordinates=coords, tzid=tzid, comment=comment))
    return rows


def city_from_row(row: ZoneRow) -> str:
    if row.comment:
        # Prefer the first descriptive token before parentheses.
        base = row.comment.split("(")[0].strip()
        if base:
            return base
    # Fallback: last segment of TZID.
    last = row.tzid.split("/")[-1]
    return last.replace("_", " ")


def continent_from_tzid(tzid: str) -> str | None:
    head = tzid.split("/", 1)[0]
    return CONTINENT_MAP.get(head)


def main() -> None:
    iso_text = fetch_text(URL_ISO3166)
    zone_text = fetch_text(URL_ZONE1970)

    countries = parse_iso3166_tab(iso_text)
    rows = parse_zone1970_tab(zone_text)

    entries: list[dict] = []
    for row in rows:
        continent = continent_from_tzid(row.tzid)
        if not continent:
            continue
        city = city_from_row(row)
        lat, lon = row.coordinates

        for cc in row.country_codes:
            country = countries.get(cc)
            if not country:
                continue
            entries.append(
                {
                    "continent": continent,
                    "country": country,
                    "city": city,
                    "timezone": row.tzid,
                    "flagEmoji": flag_emoji_from_cc(cc),
                    "coordinates": [round(lat, 4), round(lon, 4)],
                }
            )

    order = {"Africa": 0, "Americas": 1, "Asia": 2, "Europe": 3, "Oceania": 4}
    entries.sort(
        key=lambda e: (
            order.get(e["continent"], 99),
            e["country"],
            e["city"],
            e["timezone"],
        )
    )

    OUT_JSON.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # utf-8-sig helps Windows apps (Excel/Notepad) detect UTF-8 correctly.
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["continent", "country", "city", "timezone", "flagEmoji", "lat", "lon"])
        for e in entries:
            lat, lon = e.get("coordinates", [None, None])
            w.writerow([e["continent"], e["country"], e["city"], e["timezone"], e["flagEmoji"], lat, lon])

    print(f"Wrote {len(entries)} entries to {OUT_JSON}")
    print(f"Wrote {len(entries)} entries to {OUT_CSV}")


if __name__ == "__main__":
    main()
