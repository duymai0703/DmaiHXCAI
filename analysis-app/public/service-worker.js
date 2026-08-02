const CACHE_NAME = "dxiangqi-shell-v227";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260802-lobby-effects-v1",
  "/puzzle-data.js?v=20260727-puzzle-v1",
  "/endgame-data.js?v=20260728-endgame-v3",
  "/portal.js?v=20260803-opening-book-branches-v1",
  "/styles.css?v=20260802-lobby-effects-v1",
  "/app.js?v=20260802-lobby-effects-v1",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest",
  "/assets/avtchibi/lgnew.png?v=20260730-brand-wordmark-v2",
  "/assets/board/bancomoi.png?v=20260729-bancomoi-v1",
  "/assets/board/bancomoi-gold.png?v=20260729-bancomoi-v1",
  "/assets/board/bancomoi-emerald.png?v=20260729-bancomoi-v1",
  "/assets/board/bancomoi-stone.png?v=20260729-bancomoi-v1",
  "/assets/board/bancomoi-pink.png?v=20260729-bancomoi-v1",
  "/assets/board/bancomoi-dark.png?v=20260729-bancomoi-v1",
  "/assets/posters/kybinh.png?v=20260729-dark-only-v1",
  "/assets/posters/camap.png?v=20260729-dark-only-v1",
  "/assets/posters/phapsu.png?v=20260729-dark-only-v1",
  "/assets/sounds/diquan.mp3?v=20260713-audio-v9",
  "/assets/sounds/an.mp3?v=20260713-audio-v9",
  "/assets/sounds/chieu.mp3?v=20260713-audio-v9",
  "/assets/sounds/tuyetsat1.mp3?v=20260713-audio-v9",
  "/assets/pieces/red-rook.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-knight.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-elephant.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-advisor.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-king.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-cannon.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/red-pawn.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-rook.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-knight.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-elephant.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-advisor.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-king.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-cannon.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/black-pawn.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-rook.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-knight.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-elephant.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-advisor.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-king.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-cannon.png?v=20260726-mobile-pieces-v1",
  "/assets/pieces/mobile-red-pawn.png?v=20260726-mobile-pieces-v1",
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
  "/assets/pieces/sets/boquan2/red-rook.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-knight.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-elephant.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-advisor.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-king.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-cannon.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/red-pawn.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-rook.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-knight.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-elephant.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-advisor.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-king.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-cannon.png?v=20260729-boquan2-smooth-v1",
  "/assets/pieces/sets/boquan2/black-pawn.png?v=20260729-boquan2-smooth-v1",
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
  "/assets/avtchibi/backbl.png?v=20260730-opening-icons-v1",
  "/assets/avtchibi/backbl.png?v=20260730-mobile-back-img-v1",
  "/assets/avtchibi/logoblue.png?v=20260730-logoblue-controls-v1",
  "/assets/avtchibi/setting.png?v=20260730-mobile-controls-restore-v1",
  "/assets/avtchibi/red.png?v=20260730-mobile-controls-restore-v1",
  "/assets/avtchibi/black.png?v=20260730-mobile-controls-restore-v1",
  "/assets/avtchibi/saved.png?v=20260730-mobile-controls-restore-v1",
  "/assets/avtchibi/robo.png?v=20260730-mobile-controls-restore-v1",
  "/assets/icons/mb1-dark.png",
  "/assets/icons/mb2-dark.png",
  "/assets/icons/mb3-dark.png",
  "/assets/icons/mb4-dark.png",
  "/assets/icons/mb5-dark.png",
  "/assets/icons/cole-dark.png",
  "/assets/icons/sosach-dark.png",
  "/assets/avtchibi/play1.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play2.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play3.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play4.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play5.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play6.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play7.png?v=20260728-chibi-v1",
  "/assets/avtchibi/play8.png?v=20260728-chibi-v1",
  "/assets/effects/satpro.png?v=20260729-move-effects-v1",
  "/assets/effects/chieupro.png?v=20260729-move-effects-v1",
  "/assets/effects/anpro.png?v=20260729-move-effects-v1",
  "/assets/avtchibi/bot1.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot2.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot3.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot4.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot5.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot6.png?v=20260728-chibi-v1",
  "/assets/avtchibi/bot7.png?v=20260728-chibi-v1",
  "/assets/avtchibi/cothe.png?v=20260728-puzzle-map-v1",
  "/assets/avtchibi/bando.png?v=20260728-puzzle-map-v1",
  "/assets/avtchibi/tctd.png?v=20260729-endgame-fix-v1",
  "/assets/avtchibi/phantich.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/hoantac.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/tieptheo.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/datlai.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/xoayban.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/suaban.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/xoaban.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/nhandienanh.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/databook.png?v=20260729-dxiangqi-brand-v1",
  "/assets/avtchibi/lsu.png?v=20260729-dxiangqi-brand-v1",
  "/assets/review-badges/book.png",
  "/assets/review-badges/sao.png",
  "/assets/review-badges/like.png",
  "/assets/review-badges/bang.png",
  "/assets/review-badges/x.png",
  "/assets/ranks/source-dong.png?v=20260727-rank-source-v2",
  "/assets/ranks/source-bac.png?v=20260727-rank-source-v2",
  "/assets/ranks/source-vang.png?v=20260727-rank-source-v2",
  "/assets/ranks/source-kimcuong.png?v=20260727-rank-source-v2",
  "/assets/ranks/source-tinhanh.png?v=20260727-rank-source-v2",
  "/assets/ranks/source-vodich.png?v=20260727-rank-source-v2"
];
const CRITICAL_ASSETS = [
  "/",
  "/index.html",
  "/analysis.html",
  "/portal.css?v=20260802-lobby-effects-v1",
  "/portal.js?v=20260803-opening-book-branches-v1",
  "/styles.css?v=20260802-lobby-effects-v1",
  "/app.js?v=20260802-lobby-effects-v1",
  "/config.js",
  "/xiangqi-core.js",
  "/manifest.webmanifest"
];
const OPTIONAL_ASSETS = [
  "/assets/avtchibi/solo.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/danhbot.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/leorank.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/theco.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/tancuoc.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/nhanban.png?v=20260728-match-modes-v2",
  "/assets/avtchibi/lichsu.png?v=20260729-library-modes-v1",
  "/assets/avtchibi/taobook.png?v=20260729-library-modes-v1",
  "/assets/avtchibi/luubook.png?v=20260729-library-modes-v1",
  "/assets/avtchibi/danhthu.png?v=20260729-library-modes-v1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => (
      cache.addAll(CRITICAL_ASSETS).then(() => {
        warmOptionalCache(cache);
      })
    ))
  );
  self.skipWaiting();
});

function warmOptionalCache(cache) {
  const critical = new Set(CRITICAL_ASSETS);
  const assets = [...new Set([...STATIC_ASSETS, ...OPTIONAL_ASSETS])]
    .filter((asset) => !critical.has(asset));
  Promise.allSettled(assets.map((asset) => cache.add(asset))).catch(() => {});
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  const isHtml = event.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/";
  if (isHtml) {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      event.respondWith(cacheFirstNavigation(event.request, "/index.html"));
      return;
    }
    if (url.pathname === "/analysis.html" && url.searchParams.get("mobile") === "1") {
      event.respondWith(cacheFirstNavigation(event.request, "/analysis.html"));
      return;
    }
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

async function cacheFirstNavigation(request, fallbackPath) {
  const cache = await caches.open(CACHE_NAME);
  const fallbackRequest = new Request(new URL(fallbackPath, self.location.origin).href);
  const cached = await cache.match(fallbackRequest) || await cache.match(request);
  const network = fetch(request).then((response) => {
    cache.put(fallbackRequest, response.clone());
    return response;
  }).catch(() => null);
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  return (await network) || Response.error();
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
