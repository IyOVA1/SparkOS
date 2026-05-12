// Fire OS - Service Worker (sw.js)
const CACHE_NAME = 'fire-os-v1-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // Add any local assets here (icons, fonts, local scripts)
];

// 1. Install Event: Cache core OS files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

// 3. The "Fourth Wall" Proxy Logic
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // PROXY LOGIC: Intercept NoteRaft or external resource requests
  // This prevents iframe "Top-level navigation" breaks
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to modify headers if needed
          const newHeaders = new Headers(response.headers);
          
          // Ensure COOP/COEP headers don't block the OS if you decide to use SharedArrayBuffers later
          // Also helps with keeping external resources "contained"
          newHeaders.set('X-Frame-Options', 'ALLOWALL'); 
          
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        })
        .catch(() => {
          // If offline, try to serve from cache or return a custom "Offline App" page
          return caches.match(event.request);
        })
    );
    return;
  }

  // STANDARD LOGIC: Offline-first for OS system files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => {
        // Optionally cache new resources as they are discovered
        return response;
      });
    })
  );
});
