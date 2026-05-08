import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Game } from '../types/game';

export interface ReleaseAsset {
  name: string;
  url: string; // browser_download_url
  size?: number;
}

export interface GameRelease {
  tag: string;
  name: string;
  prerelease: boolean;
  publishedAt?: string;
  assets: ReleaseAsset[];
}

export interface InstalledInfo {
  version?: string;
  asset?: string;
}

const NIGHTLY_KEY = 'goopie:showNightlies';
const SELECTION_KEY = (gameId: string) => `goopie:gameVersion:${gameId}`;
const RELEASES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedReleases {
  fetchedAt: number;
  releases: GameRelease[];
}

const releasesCache = new Map<string, CachedReleases>();

/**
 * Derive `owner/repo` from any of the github fields on a Game.
 */
export function getGitHubRepo(game: Pick<Game, 'githubRepo' | 'githubReleaseUrl' | 'githubApiUrl'>): string | null {
  if (game.githubRepo && game.githubRepo.includes('/')) return game.githubRepo;
  if (game.githubReleaseUrl) {
    const m = game.githubReleaseUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)/i);
    if (m) return m[1];
  }
  if (game.githubApiUrl) {
    const m = game.githubApiUrl.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)/i);
    if (m) return m[1];
  }
  return null;
}

/**
 * Returns the preferred default asset name for a given game, falling back to
 * the release-flavoured exe and then the plain exe when present in `assets`.
 */
export function pickDefaultAsset(game: Pick<Game, 'recompName' | 'preferredAssetSuffix'>, assets: ReleaseAsset[]): string | undefined {
  if (assets.length === 0) return undefined;
  const exes = assets.filter(a => a.name.toLowerCase().endsWith('.exe'));
  if (exes.length === 0) return assets[0].name;
  const candidates = [
    game.preferredAssetSuffix && `${game.recompName}${game.preferredAssetSuffix}`,
    `${game.recompName}-windows-x64-release.exe`,
    `${game.recompName}-windows-x64.exe`,
  ].filter(Boolean) as string[];
  for (const c of candidates) {
    const hit = exes.find(a => a.name.toLowerCase() === c.toLowerCase());
    if (hit) return hit.name;
  }
  return exes[0].name;
}

/**
 * Build the canonical download URL prefix passed to the launcher's `Update`
 * function for a given release tag (the launcher appends the asset name).
 */
export function buildReleaseDownloadPrefix(repo: string, tag: string): string {
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/`;
}

export function getShowNightlies(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(NIGHTLY_KEY) === '1';
}

export function setShowNightliesPersisted(v: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NIGHTLY_KEY, v ? '1' : '0');
}

interface PersistedSelection {
  tag?: string;
  asset?: string;
}

function loadSelection(gameId: string): PersistedSelection {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY(gameId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSelection(gameId: string, sel: PersistedSelection) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SELECTION_KEY(gameId), JSON.stringify(sel));
  } catch { /* ignore quota errors */ }
}

/**
 * Hook that fetches the releases for a game and exposes the user's
 * version/build selection plus a "show nightlies" toggle.
 */
export function useGameReleases(game: Game | undefined) {
  const repo = useMemo(() => (game ? getGitHubRepo(game) : null), [game]);
  const [releases, setReleases] = useState<GameRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNightlies, setShowNightliesState] = useState<boolean>(() => getShowNightlies());

  const setShowNightlies = useCallback((v: boolean) => {
    setShowNightliesState(v);
    setShowNightliesPersisted(v);
  }, []);

  const [selectedTag, setSelectedTagState] = useState<string | undefined>(undefined);
  const [selectedAsset, setSelectedAssetState] = useState<string | undefined>(undefined);
  const initializedForId = useRef<string | undefined>(undefined);

  // Reload persisted selection when game changes.
  useEffect(() => {
    if (!game) {
      setSelectedTagState(undefined);
      setSelectedAssetState(undefined);
      initializedForId.current = undefined;
      return;
    }
    if (initializedForId.current === game.id) return;
    const sel = loadSelection(game.id);
    setSelectedTagState(sel.tag);
    setSelectedAssetState(sel.asset);
    initializedForId.current = game.id;
  }, [game?.id]);

  // Fetch releases.
  useEffect(() => {
    if (!repo) {
      setReleases([]);
      return;
    }
    let cancelled = false;
    const cached = releasesCache.get(repo);
    if (cached && Date.now() - cached.fetchedAt < RELEASES_CACHE_TTL_MS) {
      setReleases(cached.releases);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`https://api.github.com/repos/${repo}/releases?per_page=50`, {
      headers: { 'Accept': 'application/vnd.github+json' },
    })
      .then(res => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return res.json();
      })
      .then((data: any[]) => {
        if (cancelled) return;
        const list: GameRelease[] = (Array.isArray(data) ? data : [])
          .filter(r => !r.draft)
          .map(r => ({
            tag: String(r.tag_name ?? ''),
            name: String(r.name ?? r.tag_name ?? ''),
            prerelease: !!r.prerelease,
            publishedAt: r.published_at ?? r.created_at,
            assets: Array.isArray(r.assets)
              ? r.assets.map((a: any) => ({
                  name: String(a.name ?? ''),
                  url: String(a.browser_download_url ?? ''),
                  size: typeof a.size === 'number' ? a.size : undefined,
                }))
              : [],
          }))
          .filter(r => r.tag);
        releasesCache.set(repo, { fetchedAt: Date.now(), releases: list });
        setReleases(list);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [repo]);

  // Visible releases according to nightly toggle.
  const visibleReleases = useMemo(() => {
    return showNightlies ? releases : releases.filter(r => !r.prerelease);
  }, [releases, showNightlies]);

  // Resolve the effective selected tag (fallback to latest visible).
  const effectiveTag = useMemo(() => {
    if (selectedTag && visibleReleases.some(r => r.tag === selectedTag)) return selectedTag;
    return visibleReleases[0]?.tag;
  }, [selectedTag, visibleReleases]);

  const selectedRelease = useMemo(() => {
    return visibleReleases.find(r => r.tag === effectiveTag);
  }, [visibleReleases, effectiveTag]);

  // Resolve the effective selected asset.
  const effectiveAsset = useMemo(() => {
    if (!selectedRelease || !game) return undefined;
    if (selectedAsset && selectedRelease.assets.some(a => a.name === selectedAsset)) return selectedAsset;
    return pickDefaultAsset(game, selectedRelease.assets);
  }, [selectedRelease, selectedAsset, game]);

  const setSelectedTag = useCallback((tag: string | undefined) => {
    setSelectedTagState(tag);
    if (game) saveSelection(game.id, { tag, asset: selectedAsset });
  }, [game, selectedAsset]);

  const setSelectedAsset = useCallback((asset: string | undefined) => {
    setSelectedAssetState(asset);
    if (game) saveSelection(game.id, { tag: selectedTag, asset });
  }, [game, selectedTag]);

  return {
    repo,
    loading,
    error,
    releases,
    visibleReleases,
    showNightlies,
    setShowNightlies,
    selectedTag: effectiveTag,
    selectedAsset: effectiveAsset,
    selectedRelease,
    setSelectedTag,
    setSelectedAsset,
  };
}

/**
 * Read the locally-installed version metadata via the launcher (CEF) bridge.
 * Returns null when not running inside the launcher or when no metadata is
 * available yet.
 */
export function readInstalledInfo(recompName: string): InstalledInfo | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  if (typeof w.getInstalledVersion !== 'function') return null;
  try {
    const raw = w.getInstalledVersion(recompName);
    if (!raw) return null;
    if (typeof raw === 'object') return raw as InstalledInfo;
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed as InstalledInfo : null;
  } catch {
    return null;
  }
}
