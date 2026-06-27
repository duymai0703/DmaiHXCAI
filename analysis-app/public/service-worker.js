const CACHE_NAME = "dmaihxcai-shell-v18";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260627-lobby-v6",
  "/portal.js?v=20260627-lobby-v6",
  "/styles.css?v=20260627-room-fix-v2",
  "/app.js?v=20260627-room-fix-v2",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png",
  "/assets/icons/header-logo.png",
  "/assets/pieces/black-advisor.png",
  "/assets/pieces/black-cannon.png",
  "/assets/pieces/black-elephant.png",
  "/assets/pieces/black-king.png",
  "/assets/pieces/black-knight.png",
  "/assets/pieces/black-pawn.png",
  "/assets/pieces/black-rook.png",
  "/assets/pieces/red-advisor.png",
  "/assets/pieces/red-cannon.png",
  "/assets/pieces/red-elephant.png",
  "/assets/pieces/red-king.png",
  "/assets/pieces/red-knight.png",
  "/assets/pieces/red-pawn.png",
  "/assets/pieces/red-rook.png"
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
