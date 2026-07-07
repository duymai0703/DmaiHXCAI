const CACHE_NAME = "dmaihxcai-shell-v63";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260707-room-v29",
  "/portal.js?v=20260707-room-v42",
  "/styles.css?v=20260707-mobile-v19",
  "/app.js?v=20260706-mobile-v27",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest",
  "/assets/board/board-skin-dark.svg",
  "/assets/board/board-skin-light.svg",
  "/assets/posters/darkmagi1.png",
  "/assets/posters/darkmagi2.png",
  "/assets/posters/darkmagi3.png",
  "/assets/posters/blueeye1.png",
  "/assets/posters/blueeye2.png",
  "/assets/posters/blueeye3.png",
  "/assets/icons/back.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/header-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  const isHtml = event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/";
  if (isHtml) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((response) => {
      cache.put(request, response.clone());
    }).catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}
