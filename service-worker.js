// ============================================
// MST Service Worker
// Provides offline functionality and caching
// ============================================

const CACHE_VERSION = 'mst-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const DATA_CACHE_NAME = `${CACHE_VERSION}-data`;

// Determine scope-aware URLs so the PWA works from subdirectories (e.g. GitHub Pages)
const SCOPE_URL = new URL('./', self.location.href);
const resolveUrl = (path = './') => new URL(path, SCOPE_URL).toString();

// Files to cache for offline use
const STATIC_FILE_PATHS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  './storage/indexeddb.js',
  './storage/migration.js',
  './storage/backup.js',
  './storage/vacuum.js',
  './admin/backupPanel.js',
  './utils/toast.js',
  './utils/validation.js',
  './utils/crud.js',
  './utils/charts.js',
  './utils/advanced-charts.js',
  './utils/export.js',
  './utils/analytics.js',
  './utils/pdf-viewer.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

const STATIC_FILES = STATIC_FILE_PATHS.map((path) => resolveUrl(path));

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );

  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control of all pages
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API or data requests (if any)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Fallback to cache if network fails
            return cache.match(request);
          });
      })
    );
    return;
  }

  // Static files - cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Cache the new resource
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.error('[Service Worker] Fetch failed:', error);

          // Return offline page if available
          if (request.destination === 'document') {
            return caches.match(resolveUrl('./')).then((cachedRoot) => {
              if (cachedRoot) {
                return cachedRoot;
              }
              return caches.match(resolveUrl('index.html'));
            });
          }

          return new Response('Network error', {
            status: 408,
            statusText: 'Network error'
          });
        });
    })
  );
});

// Background sync for backups
self.addEventListener('sync', (event) => {
  if (event.tag === 'mst-backup-sync') {
    event.waitUntil(performBackupSync());
  }
});

// Periodic sync for auto-backups (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mst-auto-backup') {
    event.waitUntil(performPeriodicBackup());
  }
});

// Message handler for commands from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification from MST',
    icon: resolveUrl('icons/icon-192x192.png'),
    badge: resolveUrl('icons/icon-192x192.png'),
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('MST - Solar Tracker', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(resolveUrl('./'))
  );
});

// Helper: Perform backup sync
async function performBackupSync() {
  try {
    console.log('[Service Worker] Performing backup sync...');
    // Trigger backup through client message
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'TRIGGER_BACKUP',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[Service Worker] Backup sync failed:', error);
  }
}

// Helper: Perform periodic backup
async function performPeriodicBackup() {
  try {
    console.log('[Service Worker] Performing periodic backup...');
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'TRIGGER_AUTO_BACKUP',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[Service Worker] Periodic backup failed:', error);
  }
}

console.log('[Service Worker] Loaded');
