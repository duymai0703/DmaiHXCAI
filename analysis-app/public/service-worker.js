const CACHE_NAME = "dmaihxcai-shell-v129";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260710-room-v64",
  "/portal.js?v=20260710-room-v90",
  "/styles.css?v=20260710-mobile-v63",
  "/app.js?v=20260710-mobile-v76",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest",
  "/assets/board/board-skin-dark.svg",
  "/assets/board/board-skin-light.svg",
  "/assets/board/board-skin-mobile.svg",
  "/assets/board/board-skin-gold.svg",
  "/assets/board/board-skin-stone.svg",
  "/assets/board/board-skin-emerald.svg",
  "/assets/pieces/mobile-red-rook.png",
  "/assets/pieces/mobile-red-knight.png",
  "/assets/pieces/mobile-red-elephant.png",
  "/assets/pieces/mobile-red-advisor.png",
  "/assets/pieces/mobile-red-king.png",
  "/assets/pieces/mobile-red-cannon.png",
  "/assets/pieces/mobile-red-pawn.png",
  "/assets/pieces/sets/boquan1/red-rook.png",
  "/assets/pieces/sets/boquan1/red-knight.png",
  "/assets/pieces/sets/boquan1/red-elephant.png",
  "/assets/pieces/sets/boquan1/red-advisor.png",
  "/assets/pieces/sets/boquan1/red-king.png",
  "/assets/pieces/sets/boquan1/red-cannon.png",
  "/assets/pieces/sets/boquan1/red-pawn.png",
  "/assets/pieces/sets/boquan1/black-rook.png",
  "/assets/pieces/sets/boquan1/black-knight.png",
  "/assets/pieces/sets/boquan1/black-elephant.png",
  "/assets/pieces/sets/boquan1/black-advisor.png",
  "/assets/pieces/sets/boquan1/black-king.png",
  "/assets/pieces/sets/boquan1/black-cannon.png",
  "/assets/pieces/sets/boquan1/black-pawn.png",
  "/assets/pieces/sets/boquan2/red-rook.png",
  "/assets/pieces/sets/boquan2/red-knight.png",
  "/assets/pieces/sets/boquan2/red-elephant.png",
  "/assets/pieces/sets/boquan2/red-advisor.png",
  "/assets/pieces/sets/boquan2/red-king.png",
  "/assets/pieces/sets/boquan2/red-cannon.png",
  "/assets/pieces/sets/boquan2/red-pawn.png",
  "/assets/pieces/sets/boquan2/black-rook.png",
  "/assets/pieces/sets/boquan2/black-knight.png",
  "/assets/pieces/sets/boquan2/black-elephant.png",
  "/assets/pieces/sets/boquan2/black-advisor.png",
  "/assets/pieces/sets/boquan2/black-king.png",
  "/assets/pieces/sets/boquan2/black-cannon.png",
  "/assets/pieces/sets/boquan2/black-pawn.png",
  "/assets/pieces/sets/boquan3/red-rook.png",
  "/assets/pieces/sets/boquan3/red-knight.png",
  "/assets/pieces/sets/boquan3/red-elephant.png",
  "/assets/pieces/sets/boquan3/red-advisor.png",
  "/assets/pieces/sets/boquan3/red-king.png",
  "/assets/pieces/sets/boquan3/red-cannon.png",
  "/assets/pieces/sets/boquan3/red-pawn.png",
  "/assets/pieces/sets/boquan3/black-rook.png",
  "/assets/pieces/sets/boquan3/black-knight.png",
  "/assets/pieces/sets/boquan3/black-elephant.png",
  "/assets/pieces/sets/boquan3/black-advisor.png",
  "/assets/pieces/sets/boquan3/black-king.png",
  "/assets/pieces/sets/boquan3/black-cannon.png",
  "/assets/pieces/sets/boquan3/black-pawn.png",
  "/assets/pieces/sets/boquan4/red-rook.png",
  "/assets/pieces/sets/boquan4/red-knight.png",
  "/assets/pieces/sets/boquan4/red-elephant.png",
  "/assets/pieces/sets/boquan4/red-advisor.png",
  "/assets/pieces/sets/boquan4/red-king.png",
  "/assets/pieces/sets/boquan4/red-cannon.png",
  "/assets/pieces/sets/boquan4/red-pawn.png",
  "/assets/pieces/sets/boquan4/black-rook.png",
  "/assets/pieces/sets/boquan4/black-knight.png",
  "/assets/pieces/sets/boquan4/black-elephant.png",
  "/assets/pieces/sets/boquan4/black-advisor.png",
  "/assets/pieces/sets/boquan4/black-king.png",
  "/assets/pieces/sets/boquan4/black-cannon.png",
  "/assets/pieces/sets/boquan4/black-pawn.png",
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
  "/assets/icons/cole-light.png",
  "/assets/icons/guom-light.png",
  "/assets/icons/sosach-light.png",
  "/assets/icons/mb1-dark.png",
  "/assets/icons/mb2-dark.png",
  "/assets/icons/mb3-dark.png",
  "/assets/icons/mb4-dark.png",
  "/assets/icons/mb5-dark.png",
  "/assets/icons/cole-dark.png",
  "/assets/icons/guom-dark.png",
  "/assets/icons/sosach-dark.png",
  "/assets/device-avatars/goku.png",
  "/assets/device-avatars/vegeta.png",
  "/assets/device-avatars/naruto.png",
  "/assets/device-avatars/luffy.png",
  "/assets/device-avatars/ichigo.png",
  "/assets/device-avatars/gojo.png",
  "/assets/device-avatars/sungjinwoo.png",
  "/assets/device-avatars/Yugi.png",
  "/assets/device-avatars/Kaiba.png",
  "/assets/device-avatars/Eren.png",
  "/assets/device-avatars/Siesta.png",
  "/assets/device-avatars/Meliodas.png",
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
