# Chronos (Offline SPA)

Chronos is an offline-first single-page web app (Flask + Vanilla JS) that merges:

- World clock (always visible)
- Time zones browser + search + apply
- Chronometer (laps)
- Timer (wheel-based setter + alert)

No CDN, no external APIs.

## Run (Windows / Linux)

```bash
python -m venv .venv
```

Windows:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe start.py
```

Linux/macOS:

```bash
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python start.py
```

Then open `http://127.0.0.1:5000` (a browser tab should open automatically).

## Keyboard shortcuts

- Global: `T` cycle themes · `Esc` go Home
- Chronometer view: `Space` Start/Pause · `R` Reset · `L` Lap
- Timer view: `Space` Start/Pause · `R` Reset
- Timer setter: focus a unit, then `↑/↓` adjusts it (mouse wheel also works)

Shortcuts are ignored when typing in an `<input>/<textarea>/<select>`.

## Time zones data & flags

- Data file: `static/data/timezones.json`
- Flags: stored as emojis in `flagEmoji` (no flag SVG assets needed)

This repo currently ships a small curated dataset (so it works immediately).

To generate a large offline dataset of principal cities per timezone (TZDB):

- Run `python scripts/update_timezones_from_iana_tzdb.py` (downloads public-domain `zone1970.tab` + `iso3166.tab` from IANA and regenerates `static/data/timezones.json`).

Recommended continent labels (used by the app sorting):
`Africa`, `Americas`, `Asia`, `Europe`, `Oceania`.

## Themes

Built-in themes:

- light, dark, ocean, forest
- sunset, purple, monochrome, emerald

## What the UI looks like (text screenshot)

- Header: Chronos logo + live world clock + themes menu.
- Home: 4 widgets with live previews (timezone time, chronometer state, timer remaining).
- Time Zones: search + sorting (continent/country by default) + infinite scroll list, each row shows local time and “Use this timezone”.
- Chronometer: big timer + Start/Pause/Reset/Lap + laps list.
- Timer: wheel/arrow-based setter (Days/Hours/Minutes/Seconds) + Start/Pause/Reset + sound + flashing alert at 0.
