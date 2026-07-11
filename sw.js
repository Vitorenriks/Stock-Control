const CACHE_VERSION = "estoque-v2.6";

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
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).catch(() => {
                return caches.match('./index.html');
            });
        })
    );
});
