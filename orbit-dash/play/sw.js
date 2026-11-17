// Orbit Dash service worker: na het eerste bezoek start het spel uit de cache (sneller, ook offline).
// Elke build krijgt een eigen cache (versie hieronder); een nieuwe build vervangt de oude in zijn geheel,
// zodat pagina, engine en spel altijd bij elkaar horen. Het scorebord (andere server) gaat nooit via de cache.
const VERSION = "20261117234346";
const CACHE = "orbit-dash-" + VERSION;
const FILES = [
  "./",
  "index.js?v=" + VERSION,
  "index.pck",
  "engine-gz.wasm",
  "index.audio.worklet.js",
  "index.icon.png",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("orbit-dash-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(new URL("./", self.location).pathname)) return;
  const key = req.mode === "navigate" ? "./" : req;
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(key, { ignoreSearch: req.mode === "navigate" }).then((hit) => hit || fetch(req))
    )
  );
});
