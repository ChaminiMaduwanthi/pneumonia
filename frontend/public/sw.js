/*
 * LungVision AI service worker.
 *
 * Caching policy is deliberately conservative, because this is a clinical
 * decision-support tool:
 *
 *   /pneumonia/backend/*  -> NEVER cached. API responses, uploaded X-rays,
 *                            Grad-CAM overlays and PDF reports are all
 *                            per-patient and must never be served stale.
 *   /_next/static/*       -> cache-first. Content-hashed by Next.js, so a
 *                            cached copy can never be the wrong version.
 *   icons / manifest      -> cache-first.
 *   navigations (HTML)    -> network-first, falling back to /offline.html so
 *                            the installed app shows something sane with no
 *                            signal instead of the browser error page.
 *
 * Only GET is ever touched; uploads and logins always go straight to the network.
 */

// Bump on every change to a precached asset (icons, offline page) so installed
// clients drop the old cache instead of keeping stale files.
const VERSION = "lungvision-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never interfere with uploads, logins, deletes, or anything non-GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin; leave cross-origin (fonts, etc.) to the browser.
  if (url.origin !== self.location.origin) return;

  // Patient data and API traffic: always live.
  if (url.pathname.startsWith("/pneumonia/backend/") || url.pathname.startsWith("/api/")) {
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
  }
});
