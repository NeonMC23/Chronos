import { setTextWithPulse } from "./Anim.js";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function formatMs(ms) {
  const totalMs = Math.max(0, Math.floor(ms));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(millis)}`;
}

export class Stopwatch {
  constructor({ timeEl, startPauseBtn, lapBtn, resetBtn, lapsEl }) {
    this.timeEl = timeEl;
    this.startPauseBtn = startPauseBtn;
    this.lapBtn = lapBtn;
    this.resetBtn = resetBtn;
    this.lapsEl = lapsEl;

    this._running = false;
    this._startPerf = 0;
    this._elapsedMs = 0;
    this._rafId = null;
    this._lastRendered = "";

    this._laps = [];
    this._lastSecond = -1;
  }

  init() {
    this._render(true);
    this._wire();
    this._emitPreview(true);
  }

  _wire() {
    this.startPauseBtn?.addEventListener("click", () => this.toggle());
    this.lapBtn?.addEventListener("click", () => this.lap());
    this.resetBtn?.addEventListener("click", () => this.reset());
  }

  toggle() {
    if (this._running) this.pause();
    else this.start();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._startPerf = performance.now();
    this._loop();
    this._updateButtons();
    this._emitPreview(true);
  }

  pause() {
    if (!this._running) return;
    this._running = false;
    this._elapsedMs += performance.now() - this._startPerf;
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._render(false);
    this._updateButtons();
    this._emitPreview(true);
  }

  reset() {
    this._running = false;
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._elapsedMs = 0;
    this._laps = [];
    this._render(true);
    this._renderLaps();
    this._updateButtons();
    this._emitPreview(true);
  }

  lap() {
    if (!this._running) return;
    const total = this._currentElapsed();
    const lastTotal = this._laps.length ? this._laps[0].total : 0;
    const delta = total - lastTotal;
    this._laps.unshift({ total, delta });
    this._renderLaps();
  }

  _currentElapsed() {
    if (!this._running) return this._elapsedMs;
    return this._elapsedMs + (performance.now() - this._startPerf);
  }

  _loop() {
    const elapsed = this._currentElapsed();
    this._render(false, elapsed);
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());
    this._emitPreview(false);
  }

  _render(force, elapsedOverride) {
    const elapsed = typeof elapsedOverride === "number" ? elapsedOverride : this._currentElapsed();
    const text = formatMs(elapsed);
    if (!force && text === this._lastRendered) return;
    this._lastRendered = text;
    if (this.timeEl) {
      // Avoid animating every millisecond: pulse only when the visible second changes.
      const sec = Math.floor(elapsed / 1000);
      const shouldPulse = sec !== this._lastSecond;
      this._lastSecond = sec;
      if (shouldPulse) setTextWithPulse(this.timeEl, text, "tick");
      else this.timeEl.textContent = text;
    }
    this._emitPreview(false);
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

  _statusForPreview() {
    if (this._running) return { status: "running", label: "Running" };
    if (this._elapsedMs <= 0) return { status: "stopped", label: "Stopped" };
    return { status: "paused", label: "Paused" };
  }

  _emitPreview(force) {
    const { status, label } = this._statusForPreview();
    const timeText = this._lastRendered || "00:00:00.000";
    const key = `${status}|${timeText}`;
    if (!force && key === this._lastPreviewKey) return;
    this._lastPreviewKey = key;
    document.dispatchEvent(
      new CustomEvent("chronos:stopwatch", { detail: { status, statusLabel: label, timeText } }),
    );
  }

  _renderLaps() {
    if (!this.lapsEl) return;
    this.lapsEl.textContent = "";
    if (!this._laps.length) return;

    for (let i = 0; i < this._laps.length; i++) {
      const lapIndex = this._laps.length - i;
      const lap = this._laps[i];
      const row = document.createElement("div");
      row.className = "lap-row";
      row.innerHTML = `<span>#${lapIndex}</span><span>${formatMs(lap.delta)}</span><span>${formatMs(
        lap.total,
      )}</span>`;
      this.lapsEl.appendChild(row);
    }
  }
}
