const CACHE_NAME = "cambio-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok && shouldCache(url.pathname)) {
        cache.put(event.request, response.clone());
      }
      return response;
    }),
  );
});

function shouldCache(pathname) {
  return (
    pathname === "/" ||
    pathname.startsWith("/_next/static/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon-192" ||
    pathname === "/icon-512" ||
    pathname === "/apple-icon" ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image"
  );
}
