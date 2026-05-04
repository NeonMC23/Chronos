function pad2(n) {
  return String(n).padStart(2, "0");
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(days)}:${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    const t0 = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.stop(t0 + 0.62);
    o.onended = () => ctx.close().catch(() => {});
  } catch {
    // Audio disabled/unavailable.
  }
}

export class CountdownTimer {
  constructor({ displayEl, subEl, setterEl, inputEl, applyBtn, startPauseBtn, resetBtn, alertEl }) {
    this.displayEl = displayEl;
    this.subEl = subEl;
    this.setterEl = setterEl;
    this.inputEl = inputEl; // legacy
    this.applyBtn = applyBtn; // legacy
    this.startPauseBtn = startPauseBtn;
    this.resetBtn = resetBtn;
    this.alertEl = alertEl;

    this._running = false;
    this._rafId = null;
    this._durationMs = 0; // last started duration (for paused state comparison)
    this._remainingMs = 0; // what is currently shown / running
    this._configuredMs = 0; // value currently set in the wheel setter
    this._endPerf = 0;
    this._lastRendered = "";
    this._alerting = false;
    this._alertInterval = null;

    this._units = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    this._unitEls = new Map();
    this._lastStatusKey = "";
  }

  init() {
    this._render(true);
    this._wire();
    this._emitPreview();
  }

  _wire() {
    this.startPauseBtn?.addEventListener("click", () => this.toggle());
    this.resetBtn?.addEventListener("click", () => this.reset());

    if (this.setterEl) this._wireSetter();

    // Legacy input support (kept for backward compatibility).
    this.applyBtn?.addEventListener("click", () => this.applyFromInput());
    this.inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.applyFromInput();
    });
  }

  applyFromInput() {
    const text = (this.inputEl?.value || "").trim();
    const ms = this._parseDurationToMs(text);
    if (ms === null || ms <= 0) {
      this._setSub("Invalid format. Example: 00:00:30 or 00:00:10:00");
      return;
    }
    this._setConfigured(ms);
    this._setRemaining(ms);
    this._setSub("Ready");
    this._stopAlert();
    this._render(true);
    this._updateButtons();
    this._emitPreview();
  }

  toggle() {
    if (this._running) this.pause();
    else this.start();
  }

  start() {
    if (this._running) return;
    if (this._remainingMs <= 0) {
      const ms = this._configuredMs || this._durationFromSetter();
      if (ms <= 0) return this._setSub("Set a duration first");
      this._setConfigured(ms);
      this._setRemaining(ms);
      this._durationMs = ms;
    }
    this._running = true;
    this._endPerf = performance.now() + this._remainingMs;
    this._loop();
    this._updateButtons();
    this._emitPreview();
  }

  pause() {
    if (!this._running) return;
    this._running = false;
    this._remainingMs = Math.max(0, this._endPerf - performance.now());
    this._durationMs = Math.max(this._durationMs, this._remainingMs);
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._render(false);
    this._updateButtons();
    this._setSub("Paused");
    this._emitPreview();
  }

  reset() {
    this._running = false;
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    // Reset goes to 0, but keeps the configured wheel values.
    this._remainingMs = 0;
    this._stopAlert();
    this._render(true);
    this._setSub(this._configuredMs > 0 ? "Ready" : "Set a duration");
    this._updateButtons();
    this._emitPreview();
  }

  _loop() {
    const remaining = Math.max(0, this._endPerf - performance.now());
    this._remainingMs = remaining;
    this._render(false);

    if (remaining <= 0) {
      this._running = false;
      this._rafId = null;
      this._setSub("Completed");
      this._startAlert();
      this._updateButtons();
      this._emitPreview();
      return;
    }

    this._rafId = requestAnimationFrame(() => this._loop());
    this._emitPreview();
  }

  _render(force) {
    const text = formatRemaining(this._remainingMs);
    if (!force && text === this._lastRendered) return;
    this._lastRendered = text;
    if (this.displayEl) this.displayEl.textContent = text;
  }

  _setSub(text) {
    if (this.subEl) this.subEl.textContent = text;
  }

  _updateButtons() {
    const label = this.startPauseBtn?.querySelector("span");
    const icon = this.startPauseBtn?.querySelector("img");
    if (!label || !icon) return;
    if (this._running) {
      label.textContent = "Pause";
      icon.src = "/static/assets/icons/pause.svg";
      this.startPauseBtn.classList.remove("control-start");
      this.startPauseBtn.classList.add("control-pause");
    } else {
      label.textContent = "Start";
      icon.src = "/static/assets/icons/play.svg";
      this.startPauseBtn.classList.remove("control-pause");
      this.startPauseBtn.classList.add("control-start");
    }
  }

  _startAlert() {
    if (this._alerting) return;
    this._alerting = true;
    if (this.alertEl) {
      this.alertEl.hidden = false;
      this.alertEl.classList.add("flash");
    }
    beep();
    this._alertInterval = window.setInterval(() => beep(), 1200);
  }

  _stopAlert() {
    this._alerting = false;
    if (this.alertEl) {
      this.alertEl.hidden = true;
      this.alertEl.classList.remove("flash");
    }
    if (this._alertInterval !== null) window.clearInterval(this._alertInterval);
    this._alertInterval = null;
  }

  _wireSetter() {
    const els = this.setterEl.querySelectorAll(".unit-value[data-unit]");
    els.forEach((el) => {
      const unit = el.getAttribute("data-unit");
      if (!unit) return;
      this._unitEls.set(unit, el);

      el.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const direction = Math.sign(e.deltaY); // +1 down, -1 up
          this._adjustUnit(unit, -direction);
        },
        { passive: false },
      );

      el.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this._adjustUnit(unit, +1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          this._adjustUnit(unit, -1);
        }
      });
    });

    this._syncSetterFromMs(this._configuredMs || this._durationMs);
  }

  _adjustUnit(unit, delta) {
    const u = this._units;
    if (unit === "days") u.days = clamp(u.days + delta, 0, 99);
    if (unit === "hours") u.hours = (u.hours + delta + 24) % 24;
    if (unit === "minutes") u.minutes = (u.minutes + delta + 60) % 60;
    if (unit === "seconds") u.seconds = (u.seconds + delta + 60) % 60;
    this._renderSetter();
    this._configuredMs = this._durationFromSetter();
    // If not running and currently at 0, keep display at 0 (per requirement).
    if (!this._running && this._remainingMs > 0) {
      this._setRemaining(this._configuredMs);
      this._render(true);
    }
  }

  _renderSetter() {
    const u = this._units;
    this._unitEls.get("days") && (this._unitEls.get("days").textContent = pad2(u.days));
    this._unitEls.get("hours") && (this._unitEls.get("hours").textContent = pad2(u.hours));
    this._unitEls.get("minutes") && (this._unitEls.get("minutes").textContent = pad2(u.minutes));
    this._unitEls.get("seconds") && (this._unitEls.get("seconds").textContent = pad2(u.seconds));
  }

  _durationFromSetter() {
    if (!this.setterEl) return this._durationMs;
    const u = this._units;
    return ((u.days * 86400 + u.hours * 3600 + u.minutes * 60 + u.seconds) * 1000) | 0;
  }

  _syncSetterFromMs(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    this._units.days = clamp(days, 0, 99);
    this._units.hours = hours;
    this._units.minutes = minutes;
    this._units.seconds = seconds;
    this._renderSetter();
  }

  _setConfigured(ms) {
    this._configuredMs = ms;
    this._syncSetterFromMs(ms);
  }

  _setRemaining(ms) {
    this._remainingMs = ms;
  }

  _parseDurationToMs(text) {
    if (!text) return null;
    const parts = text.trim().split(":").map((p) => p.trim());
    if (parts.some((p) => p === "" || !/^\d+$/.test(p))) return null;

    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 4) [days, hours, minutes, seconds] = parts.map(Number);
    else if (parts.length === 3) [hours, minutes, seconds] = parts.map(Number);
    else if (parts.length === 2) [minutes, seconds] = parts.map(Number);
    else if (parts.length === 1) [seconds] = parts.map(Number);
    else return null;

    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  }

  _statusForPreview() {
    if (this._running) return { status: "running", label: "Running" };
    if (this._configuredMs <= 0) return { status: "stopped", label: "Stopped" };
    if (this._remainingMs <= 0) return { status: "stopped", label: "Stopped" };
    if (this._remainingMs < this._durationMs) return { status: "paused", label: "Paused" };
    return { status: "stopped", label: "Stopped" };
  }

  _emitPreview() {
    const { status, label } = this._statusForPreview();
    const timeText = formatRemaining(this._remainingMs);
    const key = `${status}|${timeText}`;
    if (key === this._lastStatusKey) return;
    this._lastStatusKey = key;
    document.dispatchEvent(
      new CustomEvent("chronos:timer", { detail: { status, statusLabel: label, timeText } }),
    );
  }
}
