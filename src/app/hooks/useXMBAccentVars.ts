import { useEffect } from 'react';

/**
 * In the XMB theme, override the global theme CSS variables so the UI tints
 * itself with the currently selected game's accent color.
 *
 * Only runs (and only sets vars) while `theme === 'xmb'`. When the theme
 * changes away from XMB, the CSS variables remain at whatever value they had
 * — `ThemeContext` re-applies the theme defaults on its own.
 */
export function useXMBAccentVars(theme: string, accentColor: string | undefined) {
  useEffect(() => {
    if (theme !== 'xmb') return;

    const DEFAULT = '#cc0000';
    const raw = (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) ? accentColor : DEFAULT;
    const r = parseInt(raw.slice(1, 3), 16);
    const g = parseInt(raw.slice(3, 5), 16);
    const b = parseInt(raw.slice(5, 7), 16);

    const rh = Math.min(255, r + 30);
    const gh = Math.min(255, g + 25);
    const bh = Math.min(255, b + 25);
    const rd = Math.round(r * 0.45);
    const gd = Math.round(g * 0.45);
    const bd = Math.round(b * 0.45);

    const root = document.documentElement;
    root.style.setProperty('--theme-sidebar-bg',    `rgba(${r},${g},${b},0.10)`);
    root.style.setProperty('--theme-topbar-bg',     `rgba(${r},${g},${b},0.12)`);
    root.style.setProperty('--theme-card-bg',       `rgba(${r},${g},${b},0.08)`);
    root.style.setProperty('--theme-border',        `rgba(${r},${g},${b},0.28)`);
    root.style.setProperty('--theme-item-selected', `rgba(${r},${g},${b},0.28)`);
    root.style.setProperty('--theme-item-hover',    `rgba(${r},${g},${b},0.16)`);
    root.style.setProperty('--theme-item-default',  `rgba(${r},${g},${b},0.05)`);
    root.style.setProperty('--theme-accent',        raw);
    root.style.setProperty('--theme-accent-hover',  `rgb(${rh},${gh},${bh})`);
    root.style.setProperty('--theme-input-bg',      `rgba(${r},${g},${b},0.10)`);
    root.style.setProperty('--theme-gradient-from', raw);
    root.style.setProperty('--theme-gradient-to',   `rgb(${rd},${gd},${bd})`);
  }, [theme, accentColor]);
}
