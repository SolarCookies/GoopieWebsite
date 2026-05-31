/**
 * Image preload + Cache-API persistence.
 *
 * `preloadImages` fetches each URL into the browser's Cache API so that
 * subsequent `<img src=...>` loads are served from the cache (no network
 * round-trip, no white flash).  It also warms the decode pipeline via
 * `img.decode()` so the first paint is immediate.
 *
 * Falls back gracefully when the Cache API or `decode()` is unavailable
 * (e.g. Firefox private mode, old WebViews).
 */

const CACHE_NAME = 'goopie-image-cache-v1';

/**
 * Preload a list of image URLs into the Cache API and pre-decode them.
 * Resolves once all images are ready (errors for individual URLs are
 * swallowed so one bad URL never blocks the others).
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;

  await Promise.all(unique.map(url => preloadOne(url)));
}

async function preloadOne(url: string): Promise<void> {
  try {
    // 1. Ensure the response is in the Cache API (persists across reloads).
    if (typeof caches !== 'undefined') {
      const cache = await caches.open(CACHE_NAME);
      const existing = await cache.match(url);
      if (!existing) {
        // Fetch and store; ignore opaque (cross-origin no-cors) failures.
        const resp = await fetch(url, { mode: 'cors', credentials: 'omit' }).catch(() => null);
        if (resp && resp.ok) {
          await cache.put(url, resp);
        }
      }
    }

    // 2. Pre-decode so the first paint renders immediately.
    const img = new Image();
    img.src = url;
    if (typeof img.decode === 'function') {
      await img.decode().catch(() => { /* ignore */ });
    } else {
      // Fallback: wait for load / error event.
      await new Promise<void>(resolve => {
        if (img.complete) { resolve(); return; }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }
  } catch {
    // Never let one bad URL block the rest.
  }
}
