// KPILOTE Service Worker
// Stratégie : cache-first pour les assets statiques, network-first pour les données

const CACHE_VERSION = 'kpilote-v3';

const STATIC_ASSETS = [
  '/',
  '/choix',
  '/manager/dashboard',
  '/icon.svg',
  '/manifest.json',
];

// ── Installation ──────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── Activation ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Ne jamais mettre en cache les chunks Next.js / Turbopack (HMR)
  // ni les appels API ni Supabase — toujours réseau
  const bypassCache =
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in');

  if (bypassCache) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first uniquement pour les vraies ressources statiques (icônes, manifest)
  const isStaticAsset = url.pathname.match(/\.(svg|png|jpg|jpeg|webp|woff|woff2|ico|json)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached || fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
      )
    );
    return;
  }

  // Pages HTML : network-first avec fallback
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
