/**
 * Helpers for opening URLs outside the launcher's webview.
 *
 * Both launchers (Tauri and the legacy CEF one) inject a bridge function
 * `window.OpenExternalLink(url)` that asks the OS to open the URL in the
 * default browser.  Without it, `target="_blank"` links and `window.open`
 * are swallowed by the webview with no visible effect.
 *
 * Usage:
 *   import { isInLauncher, openExternal } from '../utils/externalLink';
 */

/** Returns true when the page is running inside a launcher (Tauri or CEF). */
export function isInLauncher(): boolean {
  return typeof (window as any).GetPlatform === 'function';
}

/**
 * Open `url` in the system browser when inside a launcher, otherwise open a
 * new tab.  Safe to call from any component without a React hook.
 */
export function openExternal(url: string): void {
  const w = window as any;
  if (typeof w.GetPlatform === 'function' && typeof w.OpenExternalLink === 'function') {
    w.OpenExternalLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
