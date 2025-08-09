// Gigateer PWA Service Worker
// Provides advanced caching, offline support, and background sync

const CACHE_NAME = 'gigateer-v1';
const OFFLINE_URL = '/offline';
const API_CACHE_NAME = 'gigateer-api-v1';
const GIGS_SYNC_TAG = 'gigs-sync';

// Core assets to cache for offline shell
const CORE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// API endpoints that support background sync
const SYNC_ENDPOINTS = [
  '/api/gigs',
  '/api/meta',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      try {
        // Cache core assets
        await cache.addAll(CORE_ASSETS);
        console.log('[SW] Core assets cached');
      } catch (error) {
        console.error('[SW] Failed to cache core assets:', error);
        // Cache individual assets that succeed
        for (const asset of CORE_ASSETS) {
          try {
            await cache.add(asset);
          } catch (e) {
            console.warn('[SW] Failed to cache:', asset, e);
          }
        }
      }
      
      // Skip waiting and activate immediately
      await self.skipWaiting();
    })()
  );
});

// Activate event - cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName !== CACHE_NAME && 
            cacheName !== API_CACHE_NAME
          )
          .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
      
      // Claim all clients immediately
      await self.clients.claim();
      console.log('[SW] Service worker activated and claimed clients');
    })()
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  event.respondWith(handleStaticAssets(request));
});

// Handle API requests with network-first strategy and TTL
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${url.pathname}${url.search}`;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses with timestamp
      const cache = await caches.open(API_CACHE_NAME);
      const responseClone = networkResponse.clone();
      
      // Add timestamp to cached response
      const timestampedResponse = new Response(await responseClone.text(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: {
          ...Object.fromEntries(responseClone.headers.entries()),
          'sw-cache-timestamp': Date.now().toString(),
        },
      });
      
      await cache.put(cacheKey, timestampedResponse);
      console.log('[SW] Cached API response:', cacheKey);
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed for API request:', cacheKey);
    
    // Try cache fallback
    const cache = await caches.open(API_CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const age = Date.now() - parseInt(timestamp || '0');
      const maxAge = url.pathname.includes('meta') ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5min for meta, 15min for gigs
      
      if (age < maxAge) {
        console.log('[SW] Serving cached API response:', cacheKey);
        return cachedResponse;
      } else {
        console.log('[SW] Cached API response expired:', cacheKey);
        // Remove expired cache entry
        await cache.delete(cacheKey);
      }
    }
    
    // Schedule background sync for failed API requests
    if ('serviceWorker' in self && 'sync' in self.registration) {
      try {
        await self.registration.sync.register(GIGS_SYNC_TAG);
        console.log('[SW] Background sync registered for:', cacheKey);
      } catch (syncError) {
        console.warn('[SW] Background sync registration failed:', syncError);
      }
    }
    
    // Return offline response for API
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: 'Data cached offline may be available',
      offline: true,
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle navigation requests with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Navigation request failed, serving offline page');
    
    // Serve offline page
    const cache = await caches.open(CACHE_NAME);
    const offlineResponse = await cache.match(OFFLINE_URL);
    
    return offlineResponse || new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Serve from cache and update in background
    fetch(request).then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
    }).catch(() => {
      // Ignore background update failures
    });
    
    return cachedResponse;
  }
  
  try {
    // If not in cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    
    // Return generic offline response for failed assets
    return new Response('Asset unavailable offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === GIGS_SYNC_TAG) {
    event.waitUntil(syncGigsData());
  }
});

// Sync gigs data in background
async function syncGigsData() {
  console.log('[SW] Starting background sync for gigs data');
  
  try {
    // Sync main gigs endpoint
    const gigsResponse = await fetch('/api/gigs');
    if (gigsResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      const timestampedResponse = new Response(await gigsResponse.text(), {
        status: gigsResponse.status,
        statusText: gigsResponse.statusText,
        headers: {
          ...Object.fromEntries(gigsResponse.headers.entries()),
          'sw-cache-timestamp': Date.now().toString(),
        },
      });
      
      await cache.put('/api/gigs', timestampedResponse);
      console.log('[SW] Background sync completed for /api/gigs');
    }
    
    // Sync meta endpoint
    const metaResponse = await fetch('/api/meta');
    if (metaResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      const timestampedResponse = new Response(await metaResponse.text(), {
        status: metaResponse.status,
        statusText: metaResponse.statusText,
        headers: {
          ...Object.fromEntries(metaResponse.headers.entries()),
          'sw-cache-timestamp': Date.now().toString(),
        },
      });
      
      await cache.put('/api/meta', timestampedResponse);
      console.log('[SW] Background sync completed for /api/meta');
    }
    
    // Notify clients about successful sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now(),
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error; // Causes sync to retry
  }
}

// Push notification event (infrastructure only)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const options = {
    body: 'New gigs available in your area!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icon-192x192.png',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.message || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Gigateer', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click event');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Message event for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
});

// Get cache statistics
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    stats[cacheName] = requests.length;
  }
  
  return stats;
}

console.log('[SW] Service worker script loaded');