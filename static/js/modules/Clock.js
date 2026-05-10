import { pulse, setTextWithPulse } from "./Anim.js";

function defaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function localeForTimezone(timeZone) {
  if (typeof timeZone !== "string") return "en-GB";
  if (timeZone.startsWith("America/")) return "en-US";
  return "en-GB";
}

export class WorldClock {
  constructor({ labelEl, timeEl, dateEl, storageKey }) {
    this.labelEl = labelEl;
    this.timeEl = timeEl;
    this.dateEl = dateEl;
    this.storageKey = storageKey;

    this._timeoutId = null;
    this._lastTime = "";
    this._lastDate = "";

    const stored = window.localStorage.getItem(this.storageKey);
    this.timeZone = stored || defaultTimezone();
  }

  setTimezone(timeZone) {
    if (!timeZone) return;
    this.timeZone = timeZone;
    window.localStorage.setItem(this.storageKey, timeZone);
    this._lastTime = "";
    this._lastDate = "";
    this._render(true);
  }

  start() {
    this.stop();
    this._render(true);
    this._scheduleNextTick();
  }

  stop() {
    if (this._timeoutId !== null) window.clearTimeout(this._timeoutId);
    this._timeoutId = null;
  }

  _render(force) {
    const tz = this.timeZone;
    const locale = localeForTimezone(tz);
    const now = new Date();

    let timeText = "--:--:--";
    let dateText = "--/--/----";

    try {
      timeText = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);

      dateText = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(now);
    } catch {
      // Keep placeholders
    }

    if (this.labelEl) setTextWithPulse(this.labelEl, tz, "soft");

    if (force || timeText !== this._lastTime) {
      this._lastTime = timeText;
      if (this.timeEl) setTextWithPulse(this.timeEl, timeText, "tick");
    }

    if (force || dateText !== this._lastDate) {
      this._lastDate = dateText;
      if (this.dateEl) setTextWithPulse(this.dateEl, dateText, "soft");
    }
  }

  _scheduleNextTick() {
    const now = Date.now();
    const msToNextSecond = 1000 - (now % 1000);
    this._timeoutId = window.setTimeout(() => {
      this._render(false);
      this._scheduleNextTick();
    }, msToNextSecond + 10);
  }
}
