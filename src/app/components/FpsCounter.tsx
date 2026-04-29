import { useEffect, useState } from 'react';

const STORAGE_KEY = 'rex_show_fps';

export function getFpsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFpsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    window.dispatchEvent(new CustomEvent('rex_fps_toggle', { detail: enabled }));
  } catch {
    // ignore
  }
}

/**
 * Lightweight FPS overlay. Samples frames over ~500ms windows so the readout
 * stays stable. Mounted at the app root and only renders when enabled in
 * Settings.
 */
export function FpsCounter() {
  const [enabled, setEnabled] = useState<boolean>(() => getFpsEnabled());
  const [fps, setFps] = useState<number>(0);

  useEffect(() => {
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setEnabled(Boolean(detail));
    };
    window.addEventListener('rex_fps_toggle', onToggle);
    return () => window.removeEventListener('rex_fps_toggle', onToggle);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let animId = 0;
    let frames = 0;
    let last = performance.now();

    const tick = () => {
      frames++;
      const now = performance.now();
      const elapsed = now - last;
      if (elapsed >= 500) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [enabled]);

  if (!enabled) return null;

  const color = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(0, 0, 0, 0.65)',
        color,
        font: '600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {fps} FPS
    </div>
  );
}
