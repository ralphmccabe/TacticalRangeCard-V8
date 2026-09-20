/* TRC-VERSION - v8.29 */
const CACHE_NAME = 'trc-v8.29';
const ASSETS = [
    './',
    './index.html?v=8.29',
    './style.css?v=8.29',
    './trc_core.js?v=8.29',
    './js/modules/sfu_audio.js?v=8.29',
    './field_intel_logic.js?v=8.29',
    './blog_logic.js?v=8.29',
    './manifest.json',
    './icon-512.png',
    './icon-192.png',
    './splash-page.jpg',
    './workstation_logic.js?v=8.29',
    './officer_card_logic.js?v=8.29',
    './gametag_logic.js?v=8.29',
    './bolo_logic.js?v=8.29',
    './license_logic.js?v=8.29',
    './tailwind.css?v=8.29',
    './lucide.min.js?v=1.5',
    './html2canvas.min.js?v=1.5',
    './idb_helper.js?v=8.29',
    './lib/supabase.min.js',
    './master_op_card_logic.js?v=8.29',
    './supply_depot_logic.js?v=8.29',
    './lib/leaflet.css',
    './lib/leaflet.js',
    './lib/Sortable.min.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching New Version:', CACHE_NAME);
            return Promise.allSettled(
                ASSETS.map(url => cache.add(url).catch(err => {
                    console.warn('[SW] Cache item skipped:', url, err.message);
                }))
            );
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

    // Network-First for all app logic & HTML: ensures code updates land immediately
    const networkFirstPatterns = ['index.html', 'trc_core.js', 'sfu_audio.js', 'style.css', 'style.min.css'];
    const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
    const isCoreApp = networkFirstPatterns.some(p => event.request.url.includes(p));

    if (isNavigation || isCoreApp) {
        event.respondWith(
            fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        if (event.request.url.startsWith('http')) cache.put(event.request, clone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    if (isNavigation) return caches.match('./index.html') || caches.match('./');
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

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
                if (isNavigation) {
                    return caches.match('./index.html') || caches.match('./');
                }
                throw error;
            });
        })
    );
});























































































































