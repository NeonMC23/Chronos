export class UI {
  init() {
    this._themeBtn = document.getElementById("themeBtn");
    this._themeMenu = document.getElementById("themeMenu");
    this._tzSearch = document.getElementById("tzSearch");
    this._tzSort = document.getElementById("tzSort");
    this._tzList = document.getElementById("tzList");

    this._themeToggleCb = null;
    this._themeSelectedCb = null;
    this._tzSelectedCb = null;

    this._timezones = [];
    this._tzTicker = null;
    this._lastTzTimes = new Map();
    this._activeView = "home";

    this._renderList = [];
    this._renderedCount = 0;
    this._pageSize = 60;

    this._wireThemeMenu();
    this._wireTimezones();

    document.addEventListener("chronos:theme", (e) => {
      const next = e?.detail?.theme;
      this._syncThemeMenu(next);
    });
  }

  onThemeToggle(cb) {
    this._themeToggleCb = cb;
  }
  onThemeSelected(cb) {
    this._themeSelectedCb = cb;
  }
  onTimezoneSelected(cb) {
    this._tzSelectedCb = cb;
  }

  onViewChanged(view) {
    this._activeView = view;
    if (view === "timezones") this._startTimezoneTicker();
    else this._stopTimezoneTicker();
  }

  _wireThemeMenu() {
    if (!this._themeBtn || !this._themeMenu) return;

    this._themeBtn.addEventListener("click", () => {
      if (this._themeMenu.hidden) this._openThemeMenu();
      else this._closeThemeMenu();
    });

    document.addEventListener("click", (e) => {
      const target = e.target instanceof Node ? e.target : null;
      if (!target) return;
      if (this._themeMenu.hidden) return;
      if (this._themeMenu.contains(target)) return;
      if (this._themeBtn.contains(target)) return;
      this._closeThemeMenu();
    });

    this._themeMenu.querySelectorAll(".theme-item[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        if (theme) this._themeSelectedCb?.(theme);
        this._closeThemeMenu();
      });
    });
  }

  _openThemeMenu() {
    this._themeMenu.hidden = false;
    const active = document.documentElement.dataset.theme;
    this._syncThemeMenu(active);
  }

  _closeThemeMenu() {
    this._themeMenu.hidden = true;
  }

  _syncThemeMenu(active) {
    if (!this._themeMenu) return;
    this._themeMenu.querySelectorAll(".theme-item[data-theme]").forEach((btn) => {
      const isActive = btn.dataset.theme === active;
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  _wireTimezones() {
    if (!this._tzList) return;

    Promise.resolve()
      .then(() => fetch("/static/data/timezones.json"))
      .then((r) => r.json())
      .then((data) => {
        this._timezones = Array.isArray(data) ? data : [];
        this._renderTimezoneList();
        if (this._activeView === "timezones") this._startTimezoneTicker();
      })
      .catch(() => {
        this._tzList.textContent = "Unable to load timezones.json";
      });

    this._tzSearch?.addEventListener("input", () => this._renderTimezoneList());
    this._tzSort?.addEventListener("change", () => this._renderTimezoneList());

    this._tzList.addEventListener("scroll", () => {
      if (!this._renderList.length) return;
      const nearBottom = this._tzList.scrollTop + this._tzList.clientHeight >= this._tzList.scrollHeight - 240;
      if (nearBottom) this._appendTimezoneChunk();
    });
  }

  _filteredSorted() {
    const q = (this._tzSearch?.value || "").trim().toLowerCase();
    const sortMode = this._tzSort?.value || "continent";

    let list = this._timezones;
    if (q) {
      list = list.filter((z) => {
        const city = String(z.city || "").toLowerCase();
        const country = String(z.country || "").toLowerCase();
        const tz = String(z.timezone || "").toLowerCase();
        return city.includes(q) || country.includes(q) || tz.includes(q);
      });
    }

    if (sortMode === "time") {
      const now = new Date();
      list = [...list].sort((a, b) => {
        const ta = this._formatHHMM(now, a.timezone);
        const tb = this._formatHHMM(now, b.timezone);
        return ta.localeCompare(tb);
      });
    } else if (sortMode === "continent") {
      list = [...list].sort((a, b) => {
        const ca = String(a.continent || "");
        const cb = String(b.continent || "");
        const order = { Africa: 0, Americas: 1, Asia: 2, Europe: 3, Oceania: 4 };
        const oa = order[ca] ?? 99;
        const ob = order[cb] ?? 99;
        const ccmp = oa === ob ? ca.localeCompare(cb, "en") : oa - ob;
        if (ccmp !== 0) return ccmp;
        const pa = String(a.country || "");
        const pb = String(b.country || "");
        const pcmp = pa.localeCompare(pb, "en");
        if (pcmp !== 0) return pcmp;
        return String(a.city || "").localeCompare(String(b.city || ""), "en");
      });
    } else {
      list = [...list].sort((a, b) => String(a.city).localeCompare(String(b.city), "en"));
    }
    return list;
  }

  _renderTimezoneList() {
    if (!this._tzList) return;
    const list = this._filteredSorted();
    this._tzList.textContent = "";
    this._lastTzTimes.clear();

    this._renderList = list;
    this._renderedCount = 0;
    this._appendTimezoneChunk(true);
  }

  _appendTimezoneChunk(forceTick) {
    if (!this._tzList) return;
    if (this._renderedCount >= this._renderList.length) {
      if (forceTick) this._tickTimezoneTimes(true);
      return;
    }

    const end = Math.min(this._renderList.length, this._renderedCount + this._pageSize);
    for (let i = this._renderedCount; i < end; i++) {
      const entry = this._renderList[i];
      const card = this._buildTimezoneCard(entry);
      this._tzList.appendChild(card);
    }
    this._renderedCount = end;
    this._tickTimezoneTimes(!!forceTick);
  }

  _buildTimezoneCard(entry) {
    const card = document.createElement("div");
    card.className = "tz-card";
    card.setAttribute("role", "listitem");

    const flagEmoji = entry.flagEmoji || "🏳️";
    const title = `${entry.city || "—"}, ${entry.country || "—"}`;
    const meta = entry.continent ? String(entry.continent) : "";

    const timeEl = document.createElement("div");
    timeEl.className = "tz-time";
    timeEl.textContent = "--:--";

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.innerHTML =
      '<img src="/static/assets/icons/arrow-right.svg" alt="" aria-hidden="true" /><span>Use this timezone</span>';
    btn.addEventListener("click", () => {
      const tz = entry.timezone;
      if (tz) this._tzSelectedCb?.(tz);
    });

    card.innerHTML = `
      <div class="flag"><span class="flag-emoji" aria-hidden="true">${escapeHtml(flagEmoji)}</span></div>
      <div class="tz-main">
        <div class="tz-title">${escapeHtml(title)}</div>
        <div class="tz-meta">${escapeHtml(meta)}</div>
      </div>
    `;
    card.appendChild(timeEl);
    card.appendChild(btn);
    card.dataset.timezone = entry.timezone || "";

    return card;
  }

  _startTimezoneTicker() {
    if (!this._tzList) return;
    if (this._tzTicker !== null) return;
    this._tzTicker = window.setInterval(() => this._tickTimezoneTimes(false), 1000);
  }

  _stopTimezoneTicker() {
    if (this._tzTicker === null) return;
    window.clearInterval(this._tzTicker);
    this._tzTicker = null;
  }

  _tickTimezoneTimes(force) {
    if (!this._tzList) return;
    const now = new Date();
    this._tzList.querySelectorAll(".tz-card[data-timezone]").forEach((card) => {
      const tz = card.dataset.timezone;
      const timeEl = card.querySelector(".tz-time");
      if (!(timeEl instanceof HTMLElement)) return;
      const next = this._formatHHMM(now, tz);
      const last = this._lastTzTimes.get(tz);
      if (!force && last === next) return;
      this._lastTzTimes.set(tz, next);
      timeEl.textContent = next;
    });
  }

  _formatHHMM(date, timeZone) {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "--:--";
    }
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
