import { ThemeManager } from "./modules/Theme.js";
import { WorldClock } from "./modules/Clock.js";
import { Stopwatch } from "./modules/Stopwatch.js";
import { CountdownTimer } from "./modules/Timer.js";
import { UI } from "./modules/UI.js";
import { setTextWithPulse } from "./modules/Anim.js";
import { formatTimeHMS, findBestTimezoneEntry } from "./pages/shared.js";

const appRoot = document.getElementById("app");

const theme = new ThemeManager({
  storageKey: "chronos_theme",
  themes: ["light", "dark", "ocean", "forest", "sunset", "purple", "monochrome", "emerald"],
});
theme.init();

const ui = new UI();
ui.init();

const homePreview = {
  tzFlag: document.getElementById("homeTzFlag"),
  tzLocation: document.getElementById("homeTzLocation"),
  tzTime: document.getElementById("homeTzTime"),
  tzTz: document.getElementById("homeTzTz"),
  clockFlag: document.getElementById("homeClockFlag"),
  clockLocation: document.getElementById("homeClockLocation"),
  clockTime: document.getElementById("homeClockTime"),
  clockTz: document.getElementById("homeClockTz"),
  swTime: document.getElementById("homeSwTime"),
  swStatus: document.getElementById("homeSwStatus"),
  tmTime: document.getElementById("homeTmTime"),
  tmStatus: document.getElementById("homeTmStatus"),
};

const worldClock = new WorldClock({
  labelEl: document.getElementById("activeTzLabel"),
  timeEl: document.getElementById("worldTime"),
  dateEl: document.getElementById("worldDate"),
  storageKey: "chronos_active_timezone",
});
worldClock.start();

const stopwatch = new Stopwatch({
  timeEl: document.getElementById("swTime"),
  startPauseBtn: document.getElementById("swStartPause"),
  lapBtn: document.getElementById("swLap"),
  resetBtn: document.getElementById("swReset"),
  lapsEl: document.getElementById("swLaps"),
});
stopwatch.init();

const timer = new CountdownTimer({
  displayEl: document.getElementById("tmTime"),
  subEl: document.getElementById("tmSub"),
  setterEl: document.getElementById("tmSetter"),
  startPauseBtn: document.getElementById("tmStartPause"),
  resetBtn: document.getElementById("tmReset"),
  alertEl: document.getElementById("tmAlert"),
});
timer.init();

let tzEntries = [];
fetch("/static/data/timezones.json")
  .then((r) => r.json())
  .then((data) => {
    tzEntries = Array.isArray(data) ? data : [];
    updateTimezonePreviews(true);
  })
  .catch(() => {});

function updateTimezonePreviews(force) {
  const now = new Date();
  const tz = worldClock.timeZone;
  const entry = findBestTimezoneEntry(tzEntries, tz);
  const flagEmoji = entry?.flagEmoji || "🏳️";
  const location = entry ? `${entry.city}, ${entry.country}` : tz;
  const timeText = formatTimeHMS(now, tz);

  setTextWithPulse(homePreview.tzFlag, flagEmoji, "soft");
  setTextWithPulse(homePreview.tzLocation, location, "soft");
  setTextWithPulse(homePreview.tzTz, tz, "soft");
  setTextWithPulse(homePreview.tzTime, timeText, "tick");

  setTextWithPulse(homePreview.clockFlag, flagEmoji, "soft");
  setTextWithPulse(homePreview.clockLocation, location, "soft");
  setTextWithPulse(homePreview.clockTz, tz, "soft");
  setTextWithPulse(homePreview.clockTime, timeText, "tick");

  if (force) return;
}

const previewTicker = window.setInterval(() => updateTimezonePreviews(false), 1000);
window.addEventListener("beforeunload", () => window.clearInterval(previewTicker));

function getViewFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  if (!view) return "home";
  if (!["home", "timezones", "stopwatch", "timer"].includes(view)) return "home";
  return view;
}

function setView(view, { push = true } = {}) {
  const views = document.querySelectorAll(".view[data-view]");
  for (const el of views) {
    const active = el.dataset.view === view;
    el.hidden = !active;
    if (active) {
      el.classList.remove("view-enter");
      // Force reflow so the animation restarts consistently.
      // eslint-disable-next-line no-unused-expressions
      el.offsetWidth;
      el.classList.add("view-enter");
    }
  }

  const navItems = document.querySelectorAll(".nav-item[data-nav]");
  for (const item of navItems) {
    const isCurrent = item.dataset.nav === view;
    if (isCurrent) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }

  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("view");
  else url.searchParams.set("view", view);
  if (push) history.pushState({ view }, "", url);

  appRoot?.setAttribute("data-view", view);
  ui.onViewChanged(view);
}

setView(getViewFromUrl(), { push: false });
window.addEventListener("popstate", () => setView(getViewFromUrl(), { push: false }));

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.goto));
});
document.querySelectorAll(".nav-item[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.nav));
});

ui.onThemeToggle(() => theme.cycle());
ui.onThemeSelected((next) => theme.set(next));

ui.onTimezoneSelected((tz) => {
  worldClock.setTimezone(tz);
  updateTimezonePreviews(true);
  setView("home");
});

document.addEventListener("chronos:stopwatch", (e) => {
  const d = e?.detail;
  if (!d) return;
  if (d.timeText) setTextWithPulse(homePreview.swTime, d.timeText, "tick");
  if (homePreview.swStatus) {
    homePreview.swStatus.textContent = d.statusLabel || "Stopped";
    homePreview.swStatus.dataset.status = d.status || "stopped";
  }
});

document.addEventListener("chronos:timer", (e) => {
  const d = e?.detail;
  if (!d) return;
  if (d.timeText) setTextWithPulse(homePreview.tmTime, d.timeText, "tick");
  if (homePreview.tmStatus) {
    homePreview.tmStatus.textContent = d.statusLabel || "Stopped";
    homePreview.tmStatus.dataset.status = d.status || "stopped";
  }
});

function isTypingTarget(target) {
  const el = target instanceof Element ? target : null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (el.isContentEditable) return true;
  return false;
}

window.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (isTypingTarget(e.target)) return;

  if (e.key === "Escape") {
    e.preventDefault();
    setView("home");
    return;
  }

  if (e.key === "t" || e.key === "T") {
    e.preventDefault();
    theme.cycle();
    return;
  }

  const activeView = getViewFromUrl();
  if (activeView !== "stopwatch" && activeView !== "timer") return;

  if (e.code === "Space") {
    e.preventDefault();
    if (activeView === "stopwatch") stopwatch.toggle();
    else timer.toggle();
    return;
  }

  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    if (activeView === "stopwatch") stopwatch.reset();
    else timer.reset();
    return;
  }

  if (activeView === "stopwatch" && (e.key === "l" || e.key === "L")) {
    e.preventDefault();
    stopwatch.lap();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/static/sw.js").catch(() => {});
  });
}

