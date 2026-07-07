const CACHE_NAME = "madeira-ative-v47";
const CORE_ASSETS = [
  "/madeira/",
  "/madeira/index.html",
  "/madeira/events.json",
  "/madeira/watchlist.json",
  "/madeira/manifest.webmanifest",
  "/madeira/icon.svg",
  "/madeira/apple-touch-icon.png",
  "/madeira/icon-192.png",
  "/madeira/icon-512.png",
  "/madeira/splash/apple-splash-1290-2796.png",
  "/madeira/splash/apple-splash-1179-2556.png",
  "/madeira/splash/apple-splash-1170-2532.png",
  "/madeira/splash/apple-splash-1125-2436.png",
  "/madeira/splash/apple-splash-1242-2688.png",
  "/madeira/splash/apple-splash-828-1792.png",
  "/madeira/splash/apple-splash-750-1334.png",
  "/madeira/splash/apple-splash-1668-2388.png",
  "/madeira/splash/apple-splash-2048-2732.png"
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
    event.respondWith(networkFirst(request, "/madeira/"));
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
