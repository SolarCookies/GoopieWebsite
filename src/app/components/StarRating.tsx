import { useState, type MouseEvent } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  averageRating: number;
  totalRatings: number;
  userRating?: number;
  onRate?: (stars: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
  guestPrompt?: boolean;
}

export function StarRating({ averageRating, totalRatings, userRating, onRate, readonly, size = 'md', guestPrompt }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || userRating || Math.round(averageRating);
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-sm';

  const isLeftHalf = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2;
  };

  const handleStarClick = (star: number) => (e: MouseEvent<HTMLButtonElement>) => {
    if (readonly) return;
    if (star === 1 && isLeftHalf(e)) {
      onRate?.(0);
      return;
    }
    onRate?.(star);
  };

  const handleStarHover = (star: number) => (e: MouseEvent<HTMLButtonElement>) => {
    if (readonly) return;
    if (star === 1 && isLeftHalf(e)) {
      setHoverRating(0);
      return;
    }
    setHoverRating(star);
  };

  const stars = (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={handleStarClick(star)}
            onMouseEnter={handleStarHover(star)}
            onMouseMove={star === 1 ? handleStarHover(star) : undefined}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-all p-0 border-0 bg-transparent`}
            title={star === 1 && !readonly ? 'Click left half to remove rating' : undefined}
          >
            <Star
              className={starSize}
              fill={star <= displayRating ? '#facc15' : 'transparent'}
              stroke={star <= displayRating ? '#facc15' : 'var(--theme-text-muted)'}
            />
          </button>
        ))}
      </div>
      <span className={textSize} style={{ color: 'var(--theme-text-muted)' }}>
        {averageRating > 0 ? averageRating.toFixed(1) : '—'} ({totalRatings})
      </span>
    </div>
  );

  if (guestPrompt) {
    return (
      <div className="flex flex-col gap-1">
        <span className={textSize} style={{ color: 'var(--theme-text-muted)' }}>
          Login to rate game
        </span>
        {stars}
      </div>
    );
  }

  return stars;
}
