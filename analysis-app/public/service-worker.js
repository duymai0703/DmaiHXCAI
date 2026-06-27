const CACHE_NAME = "dmaihxcai-shell-v10";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=20260627-tight-desktop-mobile-lock",
  "/app.js?v=20260627-tight-desktop-mobile-lock",
  "/config.js",
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
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
