import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Download } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { CoverArtBackground } from '../components/CoverArtBackground';
import { GameGrid } from '../components/GameGrid';
import { ContentEditor, EditButton } from '../components/ContentEditor';
import { useGameStore } from '../data/GameStore';
import { useAuth } from '../auth/AuthContext';
import { useRatings } from '../data/useRatings';
import { useSiteContent } from '../data/useSiteContent';
import { Game } from '../types/game';

const DEFAULT_TAGLINE =
  'A community driven launcher and library for Xbox 360 recompilations made with RexGlue. Browse the catalog, rate the recomps, and play restored experiences on modern hardware.';

export function Home() {
  const { user } = useAuth();
  const { games, getVisibleGames } = useGameStore();
  const { gameRatings } = useRatings(user?.uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInCEF, setIsInCEF] = useState(false);
  const tagline = useSiteContent<{ text: string }>('homeTagline', { text: DEFAULT_TAGLINE });
  const [taglineEditorOpen, setTaglineEditorOpen] = useState(false);

  useEffect(() => {
    setIsInCEF(typeof (window as any).GetPlatform === 'function');
  }, []);

  const visibleGames = useMemo(
    () => getVisibleGames(user?.role, user?.assignedGames || []),
    [games, user, getVisibleGames]
  );

  const sortedGames = useMemo(() => {
    const statusOrder: Record<Game['status'], number> = {
      Enhanced: 0,
      Stable: 1,
      Playable: 2,
      Ingame: 3,
      External: 4,
    };
    let totalSum = 0;
    let totalCount = 0;
    for (const info of Object.values(gameRatings)) {
      totalSum += info.averageRating * info.totalRatings;
      totalCount += info.totalRatings;
    }
    const C = totalCount > 0 ? totalSum / totalCount : 0;
    const m = 3;
    return [...visibleGames]
      .filter(g => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          g.title.toLowerCase().includes(q) ||
          g.og_developer.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const sd = statusOrder[a.status] - statusOrder[b.status];
        if (sd !== 0) return sd;
        const ia = gameRatings[a.id];
        const ib = gameRatings[b.id];
        const ra = ia?.averageRating ?? 0;
        const rb = ib?.averageRating ?? 0;
        const va = ia?.totalRatings ?? 0;
        const vb = ib?.totalRatings ?? 0;
        if (ra === rb) return vb - va;
        const wA = ia ? (va / (va + m)) * ra + (m / (va + m)) * C : 0;
        const wB = ib ? (vb / (vb + m)) * rb + (m / (vb + m)) * C : 0;
        if (wA !== wB) return wB - wA;
        return vb - va;
      });
  }, [visibleGames, searchQuery, gameRatings]);

  const scrollToGames = () => {
    document.getElementById('home-games-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${SIDEBAR_WIDTH_CLASS}`}
      style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}
    >
      <Sidebar />
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isInCEF={isInCEF}
      />

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-6 py-20 md:py-28 min-h-[80vh] overflow-hidden"
        style={{ contain: 'layout paint' }}
      >
        <CoverArtBackground games={visibleGames} />
        <img
          src="https://x02.me/i/EQQTVA.png"
          alt="Goopie logo"
          className="relative z-10 w-40 h-40 md:w-56 md:h-56 object-contain mb-6"
          style={{ filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.95)) drop-shadow(0 4px 8px rgba(0,0,0,0.85))' }}
        />
        <h1
          className="relative z-10 text-6xl md:text-8xl font-bold mb-6 select-none"
          style={{
            fontFamily: '"Chewy", cursive',
            color: '#ffffff',
            letterSpacing: '0.05em',
            lineHeight: 1.25,
            paddingBottom: '0.15em',
            paddingLeft: '0.1em',
            paddingRight: '0.1em',
            textShadow: '0 6px 18px rgba(0,0,0,0.95), 0 3px 6px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          Goopie
        </h1>
        <div
          className="relative z-10 max-w-2xl mb-10 px-6 py-5 rounded-xl"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
          }}
        >
          <p
            className="text-lg md:text-xl leading-relaxed"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {tagline.value.text || DEFAULT_TAGLINE}
          </p>
          {tagline.isAdmin && (
            <div className="mt-3 flex justify-end">
              <EditButton onClick={() => setTaglineEditorOpen(true)} label="Edit tagline" />
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4">
          {!isInCEF && (
            <Link
              to="/downloads"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90 w-full sm:w-auto justify-center"
              style={{
                background: `linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))`,
                color: 'var(--theme-text-primary)',
                boxShadow: '0 10px 28px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6)',
              }}
            >
              <Download className="w-5 h-5" />
              Download the Launcher
            </Link>
          )}
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 mt-4">
          <button
            onClick={scrollToGames}
            className="px-6 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90"
            style={{
              background: `linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))`,
              color: 'var(--theme-text-primary)',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6)',
            }}
          >
            Browse Games
          </button>
          <Link
            to="/library"
            className="px-6 py-3 rounded-lg text-base font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--theme-item-selected)',
              color: 'var(--theme-text-primary)',
              boxShadow: '0 10px 28px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.6)',
            }}
          >
            Open Library
          </Link>
        </div>

        <button
          onClick={scrollToGames}
          aria-label="Scroll to games"
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-bounce p-2 rounded-full"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <ChevronDown className="w-8 h-8" />
        </button>
      </section>

      {/* Games grid */}
      <section
        id="home-games-grid"
        className="px-4 md:px-10 py-12 md:py-16 border-t"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Game Library
          </h2>
          <p
            className="text-sm md:text-base mb-8"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {sortedGames.length} {sortedGames.length === 1 ? 'game' : 'games'} available
          </p>

          <GameGrid games={sortedGames} ratings={gameRatings} />
        </div>
      </section>
      <Footer />

      <ContentEditor
        open={taglineEditorOpen}
        title="Edit homepage tagline"
        fields={[
          {
            key: 'text',
            label: 'Tagline',
            multiline: true,
            placeholder: DEFAULT_TAGLINE,
            helperText: 'Shown in the hero section under the Goopie logo.',
          },
        ]}
        initial={{ text: tagline.value.text || DEFAULT_TAGLINE }}
        onClose={() => setTaglineEditorOpen(false)}
        onSave={(vals) => tagline.save({ text: vals.text })}
      />
    </div>
  );
}
