import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { StarRating } from './StarRating';
import { useAuth } from '../auth/AuthContext';
import { useFavorites } from '../data/useFavorites';
import type { Game } from '../types/game';
import type { GameRatingInfo } from '../data/useRatings';

interface GameGridProps {
  games: Game[];
  ratings: Record<string, GameRatingInfo>;
  emptyMessage?: string;
  /** When true, disables flip and lets parent drag the card. */
  draggableItems?: boolean;
  /** Id of the currently dragged game (so parent can style). */
  draggingId?: string | null;
  onItemDragStart?: (gameId: string) => void;
  onItemDragOver?: (gameId: string, e: React.DragEvent) => void;
  onItemDrop?: (gameId: string, e: React.DragEvent) => void;
  onItemDragEnd?: () => void;
  /** Optional overlay rendered on top of each card (e.g. remove button). */
  renderOverlay?: (game: Game) => React.ReactNode;
}

export function GameGrid({
  games,
  ratings,
  emptyMessage = 'No games found.',
  draggableItems = false,
  draggingId = null,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  onItemDragEnd,
  renderOverlay,
}: GameGridProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(user?.uid);

  if (games.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--theme-text-muted)' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {games.map(game => {
        const rating = ratings[game.id];
        const fav = isFavorite(game.id);
        // The cover image is a full Xbox 360 case wrap: ~700px back +
        // ~80px spine + ~700px front. To show only one side per face we
        // scale the wrap so the front portion fills the card width
        // (1480 / 700 ≈ 211%), then anchor right (front) or left (back).
        const wrap = game.coverImage;
        const FACE_BG_SIZE = '211% 100%';
        const isBeingDragged = draggingId === game.id;
        return (
          <div
            key={game.id}
            className="flex flex-col"
            draggable={draggableItems}
            onDragStart={draggableItems ? () => onItemDragStart?.(game.id) : undefined}
            onDragOver={draggableItems ? (e) => onItemDragOver?.(game.id, e) : undefined}
            onDrop={draggableItems ? (e) => onItemDrop?.(game.id, e) : undefined}
            onDragEnd={draggableItems ? () => onItemDragEnd?.() : undefined}
            style={{
              opacity: isBeingDragged ? 0.5 : 1,
              cursor: draggableItems ? 'grab' : undefined,
            }}
          >
            <div
              className="relative w-full group/card"
              style={{ perspective: '1200px' }}
            >
              <Link
                to={`/library/${game.recompName}`}
                className={`block relative w-full aspect-[3/4] transition-transform duration-700 [transform-style:preserve-3d] ${draggableItems ? '' : 'group-hover/card:[transform:rotateY(180deg)] motion-reduce:group-hover/card:[transform:none]'}`}
              >
                {/* Front — front cover from the wrap (right portion) */}
                <div
                  className="absolute inset-0 rounded-sm overflow-hidden [backface-visibility:hidden]"
                  style={{
                    backgroundColor: '#000',
                    backgroundImage: `url(${wrap})`,
                    backgroundSize: FACE_BG_SIZE,
                    backgroundPosition: 'right center',
                    backgroundRepeat: 'no-repeat',
                    border: '1px solid var(--theme-border)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
                  }}
                >
                  {/* Glossy case highlight */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(100deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 75%, rgba(0,0,0,0.20) 100%)',
                    }}
                  />
                </div>

                {!draggableItems && (
                  /* Back — back cover from the wrap (left portion) */
                  <div
                    className="absolute inset-0 rounded-sm overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    style={{
                      backgroundColor: '#000',
                      backgroundImage: `url(${wrap})`,
                      backgroundSize: FACE_BG_SIZE,
                      backgroundPosition: 'left center',
                      backgroundRepeat: 'no-repeat',
                      border: '1px solid var(--theme-border)',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(260deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 75%, rgba(0,0,0,0.20) 100%)',
                      }}
                    />
                  </div>
                )}
              </Link>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(game.id);
                }}
                className="absolute top-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full transition-opacity"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  color: fav ? '#facc15' : 'rgba(255,255,255,0.85)',
                  opacity: fav ? 1 : 0.85,
                }}
                title={fav ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={fav ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
                aria-pressed={fav}
              >
                <Star className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
              </button>

              {renderOverlay?.(game)}
            </div>

            <Link
              to={`/library/${game.recompName}`}
              className="mt-1 flex flex-col"
            >
              <h3
                className="text-sm font-semibold leading-tight line-clamp-2"
                style={{ color: 'var(--theme-text-primary)' }}
                title={game.title}
              >
                {game.title}
              </h3>
              <StarRating
                averageRating={rating?.averageRating ?? 0}
                totalRatings={rating?.totalRatings ?? 0}
                readonly
                size="sm"
              />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
