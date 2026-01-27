
const CACHE_NAME = 'noworries-app-v1';
const MEDIA_CACHE_NAME = 'noworries-media-v1';
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/vite.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.log('Suppressing cache error for development files', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MEDIA_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests that aren't http/https (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // 1. Media Caching Strategy (Cache First with Expiration Check)
  // Cache images, videos, and fonts for a longer time
  if (
      event.request.destination === 'image' || 
      event.request.destination === 'video' || 
      event.request.destination === 'font' ||
      url.pathname.match(/\.(mp4|webm|avif|png|jpg|jpeg|webp|svg|gif|ico)$/i)
  ) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse) {
          // Check for expiration via Date header if available
          const dateHeader = cachedResponse.headers.get('date');
          if (dateHeader) {
            const cachedDate = new Date(dateHeader);
            const now = new Date();
            // If cache is older than 30 days, try to refresh
            if (now.getTime() - cachedDate.getTime() > CACHE_EXPIRATION_MS) {
               return fetch(event.request).then((networkResponse) => {
                  if (networkResponse.ok) {
                     cache.put(event.request, networkResponse.clone());
                     return networkResponse;
                  }
                  return cachedResponse; // Fallback to stale if network fails
               }).catch(() => cachedResponse); // Fallback to stale if offline
            }
          }
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Only cache valid responses
          if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Default Strategy (Stale-While-Revalidate for App Shell)
  // Serves cached content immediately, but updates cache in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
         if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone());
            });
         }
         return networkResponse;
      }).catch((err) => {
         // Network failed, nothing to do
         console.debug('Background fetch failed', err);
      });
      
      return cachedResponse || fetchPromise;
    })
  );
});

// NEW: Listen for manual cache clear messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_MEDIA_CACHE') {
    event.waitUntil(
      caches.delete(MEDIA_CACHE_NAME).then(() => {
        console.log('Media cache cleared manually');
        // Reply to the client to confirm
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: true });
        }
      }).catch((err) => {
        console.error('Failed to clear media cache', err);
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ success: false, error: err.toString() });
        }
      })
    );
  }
});
