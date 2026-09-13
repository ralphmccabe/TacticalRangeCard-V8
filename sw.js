/* TRC-VERSION - v8.0.0.0 */
const CACHE_NAME = 'trc-v8.0.0.0';
const ASSETS = [
    './',
    './index.html?v=7.27.48.85',
    './style.css?v=118',
    './trc_core.js?v=7.27.48.85',
    './blog_logic.js?v=7.27.48.85',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './splash-page.jpg',
    './workstation_logic.js?v=7.27.48.85',
    './officer_card_logic.js?v=7.27.48.85',
    './gametag_logic.js?v=7.27.48.85',
    './bolo_logic.js?v=7.27.48.85',
    './license_logic.js?v=7.27.48.85',
    './tailwind.css?v=1.1',
    './lucide.min.js?v=1.5',
    './html2canvas.min.js?v=1.5',
    './idb_helper.js?v=1.6',
    './lib/supabase.min.js',
    './master_op_card_logic.js?v=7.27.48.85',
    './supply_depot_logic.js?v=7.27.48.85'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching New Version:', CACHE_NAME);
            return cache.addAll(ASSETS).catch(err => {
                console.error('[SW] Cache addAll failed:', err);
                // Continue installing even if a specific asset fails
            });
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => {
                    console.log('[SW] Deleting Old Cache:', key);
                    return caches.delete(key);
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Dynamic Offline Caching Strategy
self.addEventListener('fetch', event => {
    // Bypass cache for these â€” large data files / live APIs that must never be stored
    const bypassPatterns = [
        'VERSION_HISTORY.txt',
        'api.open-meteo.com',
        'supabase.co',              // live Supabase API calls
        'us-states.js',
        'us-states.json',
        'colorado_2026.json',       // large data files â€” never cache
        'arcgisonline.com',         // map tiles â€” browser handles its own cache
        'qrserver.com'
    ];
    if (bypassPatterns.some(p => event.request.url.includes(p))) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // If not in cache, fetch from network and dynamically add it to the cache
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return networkResponse;
            }).catch(error => {
                console.error('[SW] Fetch failed; returning offline fallback.', error);
                if (event.request.mode === 'navigate' || event.request.destination === 'document') {
                    return caches.match('./index.html') || caches.match('./');
                }
                throw error;
            });
        })
    );
});






















































































































