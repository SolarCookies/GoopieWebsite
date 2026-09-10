/**
 * Helpers for reading the GoopieLauncher app version and gating features on it.
 *
 * The Tauri launcher's shim injects `window.getVersion()`, which returns the
 * launcher's CARGO_PKG_VERSION (e.g. "1.2.1") via a synchronous bridge call.
 * The legacy CEF launcher injects a `getVersion` too, so we only trust the
 * value when `isInTauriLauncher()` says we're in the new launcher.
 *
 * Usage:
 *   import { getLauncherVersion, isLauncherVersionAtLeast } from '../utils/launcherVersion';
 */

import { isInTauriLauncher } from './externalLink';

/**
 * Memoized result of the `window.getVersion()` bridge call.
 * `undefined` until successfully computed; `null` when not in the Tauri
 * launcher. Deliberately *not* set when the bridge call itself fails — see
 * `getLauncherVersion`.
 */
let cachedVersion: string | null | undefined;

/**
 * Returns the running Tauri launcher's version string (e.g. "1.2.1"), or
 * `null` in the plain web build and the legacy CEF launcher.
 *
 * `window.getVersion` is a *synchronous* bridge call (blocking XHR — see
 * GoopieLauncher's `bridge/shim.js`), and the launcher version cannot change
 * for the life of the page, so a successful result is memoized and safe to
 * call from render paths.
 *
 * A *failed* call is never memoized. The shim is injected before any page
 * script, so `window.getVersion` exists from the very first render — but it
 * returns `null` for any bridge error, including the startup window where the
 * webview is already running and the bridge server isn't answering yet.
 * Caching that would pin the version at `"null"` (→ `0.0.0`) for the life of
 * the page, silently disabling every `isLauncherVersionAtLeast` feature gate.
 * Returning an uncached `null` instead means the next call retries.
 */
export function getLauncherVersion(): string | null {
  if (cachedVersion !== undefined) return cachedVersion;
  const w = window as any;
  if (!isInTauriLauncher()) {
    cachedVersion = null;
    return cachedVersion;
  }
  if (typeof w.getVersion !== 'function') return null;
  let raw: unknown;
  try {
    raw = w.getVersion();
  } catch {
    return null;
  }
  // Bridge not ready (or an unexpected shape) — retry on the next call.
  if (typeof raw !== 'string' || raw === '') return null;
  cachedVersion = raw;
  return cachedVersion;
}

/**
 * Returns true when running inside a Tauri launcher whose version is at
 * least `min`. Use this to hide UI for features the user's launcher doesn't
 * support yet:
 *
 *   {isLauncherVersionAtLeast('1.3.0') && <NewFeature />}
 *
 * Compares dotted numeric segments ("1.10.0" > "1.2.1"). Returns false in
 * the plain web build and the legacy CEF launcher.
 */
export function isLauncherVersionAtLeast(min: string): boolean {
  const version = getLauncherVersion();
  if (version === null) return false;
  const a = version.split('.').map(Number);
  const b = min.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return true;
}
