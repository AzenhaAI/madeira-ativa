const CACHE_NAME = "madeira-ativa-v63";
const CORE_ASSETS = [
  "/ativa/",
  "/ativa/index.html",
  "/ativa/events.json",
  "/ativa/watchlist.json",
  "/ativa/manifest.webmanifest",
  "/ativa/icon.svg",
  "/ativa/apple-touch-icon.png",
  "/ativa/icon-192.png",
  "/ativa/icon-512.png",
  "/ativa/splash/apple-splash-1290-2796.png",
  "/ativa/splash/apple-splash-1179-2556.png",
  "/ativa/splash/apple-splash-1170-2532.png",
  "/ativa/splash/apple-splash-1125-2436.png",
  "/ativa/splash/apple-splash-1242-2688.png",
  "/ativa/splash/apple-splash-828-1792.png",
  "/ativa/splash/apple-splash-750-1334.png",
  "/ativa/splash/apple-splash-1668-2388.png",
  "/ativa/splash/apple-splash-2048-2732.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/ativa/"));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const url = new URL(request.url);
    if (url.search) {
      const unversioned = await cache.match(url.pathname);
      if (unversioned) return unversioned;
    }
    throw error;
  }
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const url = new URL(request.url);
    if (url.search) {
      const unversioned = await cache.match(url.pathname);
      if (unversioned) return unversioned;
    }
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}
