const CACHE_NAME = "cambio-v2";

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

  // Never cache-first document navigations — stale HTML + new chunk hashes
  // causes an infinite reload loop after deploys.
  if (event.request.mode === "navigate" || isDocumentPath(url.pathname)) {
    event.respondWith(networkOnly(event.request));
    return;
  }

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

function isDocumentPath(pathname) {
  return (
    pathname === "/" || pathname.startsWith("/play/") || pathname === "/play"
  );
}

async function networkOnly(request) {
  return fetch(request);
}

function shouldCache(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/icon-192" ||
    pathname === "/icon-512" ||
    pathname === "/apple-icon" ||
    pathname === "/opengraph-image" ||
    pathname === "/twitter-image"
  );
}
