/* Chronos service worker — offline-first SPA (no external network). */
const CACHE_NAME = "chronos-cache-v10";

const PRECACHE_URLS = [
  "/",
  "/static/css/styles.css",
  "/static/js/main.js",
  "/static/js/pages/shared.js",
  "/static/js/modules/Theme.js",
  "/static/js/modules/Clock.js",
  "/static/js/modules/Stopwatch.js",
  "/static/js/modules/Timer.js",
  "/static/js/modules/UI.js",
  "/static/data/timezones.json",
  "/static/manifest.webmanifest",
  "/static/assets/icons/Chronos-logo.svg",
  "/static/assets/icons/settings.svg",
  "/static/assets/icons/home.svg",
  "/static/assets/icons/globe.svg",
  "/static/assets/icons/stopwatch.svg",
  "/static/assets/icons/timer.svg",
  "/static/assets/icons/arrow-right.svg",
  "/static/assets/icons/clock.svg",
  "/static/assets/icons/play.svg",
  "/static/assets/icons/pause.svg",
  "/static/assets/icons/rotate-ccw.svg",
  "/static/assets/icons/flag.svg",
  "/static/assets/icons/check.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => (name === CACHE_NAME ? undefined : caches.delete(name)))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // SPA navigation fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match("/").then((cached) => cached || fetch(req).catch(() => caches.match("/"))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin successful GETs.
          try {
            const url = new URL(req.url);
            if (url.origin === self.location.origin && req.method === "GET" && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            }
          } catch {
            // ignore
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
