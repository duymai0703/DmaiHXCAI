const CACHE_NAME = "dmaihxcai-shell-v85";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260708-room-v39",
  "/portal.js?v=20260708-room-v58",
  "/styles.css?v=20260708-mobile-v37",
  "/app.js?v=20260708-mobile-v46",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest",
  "/assets/board/board-skin-dark.svg",
  "/assets/board/board-skin-light.svg",
  "/assets/posters/darkmagi1.png",
  "/assets/posters/darkmagi2.png",
  "/assets/posters/darkmagi3.png",
  "/assets/posters/white1.png",
  "/assets/posters/white2.png",
  "/assets/posters/white3.png",
  "/assets/icons/backgr.png",
  "/assets/icons/icon-192.png",
  "/assets/icons/header-logo.png",
  "/assets/icons/logow.png",
  "/assets/icons/logob.png",
  "/assets/icons/logow-header.png",
  "/assets/icons/logob-header.png",
  "/assets/icons/mb1-light.png",
  "/assets/icons/mb2-light.png",
  "/assets/icons/mb3-light.png",
  "/assets/icons/mb4-light.png",
  "/assets/icons/mb5-light.png",
  "/assets/icons/mb1-dark.png",
  "/assets/icons/mb2-dark.png",
  "/assets/icons/mb3-dark.png",
  "/assets/icons/mb4-dark.png",
  "/assets/icons/mb5-dark.png",
  "/assets/effects/sat-cutout.png",
  "/assets/review-badges/book.png",
  "/assets/review-badges/sao.png",
  "/assets/review-badges/like.png",
  "/assets/review-badges/bang.png",
  "/assets/review-badges/x.png"
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
