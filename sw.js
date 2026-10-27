const CACHE_VERSION = "estoque-v3.1";

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './js/app.js',
    './js/ui.js',
    './js/i18n.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './libs/tailwindcss.js',
    './libs/fontawesome.min.css',
    './libs/jspdf.umd.min.js',
    './libs/html2pdf.bundle.min.js',
    './libs/webfonts/fa-solid-900.woff2',
    './libs/webfonts/fa-regular-400.woff2',
    './libs/webfonts/fa-brands-400.woff2',
    './libs/webfonts/fa-v4compatibility.woff2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                // Offline e fora do precache. Devolver index.html so faz sentido para
                // navegacao: para um .js ou .css o script receberia HTML e quebraria
                // em silencio, foi o que aconteceu com o html2pdf.
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return Response.error();
            });
        })
    );
});
