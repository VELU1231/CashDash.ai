/* ═══════════════════════════════════════════════════════════════
   CashBash Service Worker — Offline-First PWA
   Caches app shell, API responses, and handles background sync
   ═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'cashbash-v3';
const STATIC_CACHE = 'cashbash-static-v3';
const API_CACHE = 'cashbash-api-v3';

/* ─── App Shell — CacheFirst ─── */
const APP_SHELL = [
  '/',
  '/dashboard',
  '/offline.html',
  '/favicon.ico',
  '/manifest.webmanifest',
];

/* ─── Static assets to precache ─── */
const STATIC_ASSETS = [
  '/app-icon.svg',
  '/app-icon-maskable.svg',
  '/apple-icon.png',
];

/* ─── Install: Precache app shell ─── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
    ]).then(() => self.skipWaiting())
  );
});

/* ─── Activate: Clean old caches ─── */
self.addEventListener('activate', (event) => {
  const VALID_CACHES = [CACHE_VERSION, STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !VALID_CACHES.includes(key)).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ─── Fetch: Strategy Router ─── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (Supabase, external APIs)
  if (url.origin !== self.location.origin) return;

  // API routes → NetworkFirst with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Next.js chunks & static assets → CacheFirst
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|webp|ico)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Pages → NetworkFirst (so user always gets latest, but offline works)
  event.respondWith(networkFirst(request, CACHE_VERSION));
});

/* ─── CacheFirst strategy ─── */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

/* ─── NetworkFirst strategy ─── */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For page requests, return offline fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/~offline');
      if (offlinePage) return offlinePage;
      return new Response(
        '<!DOCTYPE html><html><head><title>Offline - CashBash</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0B1120;color:#e2e8f0"><div style="text-align:center"><h1>You\'re offline</h1><p>Your data is saved locally. It will sync when you reconnect.</p><button onclick="location.reload()" style="margin-top:1rem;padding:.75rem 2rem;border-radius:1rem;background:#10b981;color:white;border:none;cursor:pointer;font-size:.9rem">Try Again</button></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

/* ─── Background Sync (for pending transactions) ─── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncPendingFromSW());
  }
});

async function syncPendingFromSW() {
  // The actual sync is handled by the client-side offline-store.ts
  // This is a fallback for when the browser supports Background Sync API
  const allClients = await self.clients.matchAll();
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_TRANSACTIONS' });
  }
}

/* ─── Push notification handler (future use) ─── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'CashBash', {
      body: data.body || 'You have a new notification',
      icon: '/app-icon.svg',
      badge: '/favicon.ico',
    })
  );
});