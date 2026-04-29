import { useEffect, useMemo, useState } from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { GameGrid } from '../components/GameGrid';
import { Footer } from '../components/Footer';
import { useGameStore } from '../data/GameStore';
import { useAuth } from '../auth/AuthContext';
import { useRatings } from '../data/useRatings';

export function Externals() {
  const { user } = useAuth();
  const { games, getVisibleGames } = useGameStore();
  const { gameRatings } = useRatings(user?.uid);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInCEF, setIsInCEF] = useState(false);

  useEffect(() => {
    setIsInCEF(typeof (window as any).GetPlatform === 'function');
  }, []);

  const visibleGames = useMemo(
    () => getVisibleGames(user?.role, user?.assignedGames || []),
    [games, user, getVisibleGames],
  );

  const externals = useMemo(() => {
    return visibleGames
      .filter(g => !!g.externalLauncherUrl)
      .filter(g => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return g.title.toLowerCase().includes(q) || g.og_developer.toLowerCase().includes(q);
      });
  }, [visibleGames, searchQuery]);

  return (
    <div
      className={`min-h-screen flex flex-col ${SIDEBAR_WIDTH_CLASS}`}
      style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}
    >
      <Sidebar />
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} isInCEF={isInCEF} />

      <section className="px-4 md:px-10 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <ExternalLinkIcon className="w-7 h-7" style={{ color: 'var(--theme-text-primary)' }} />
            <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              External Games
            </h2>
          </div>
          <p className="text-sm md:text-base mb-8" style={{ color: 'var(--theme-text-secondary)' }}>
            {externals.length > 0
              ? `${externals.length} ${externals.length === 1 ? 'game' : 'games'} • Use the developer's own launcher or website.`
              : "Use the developer's own launcher or website."}
          </p>
          <GameGrid
            games={externals}
            ratings={gameRatings}
            emptyMessage="No external-launcher games available."
          />
        </div>
      </section>
      <Footer />
    </div>
  );
}
