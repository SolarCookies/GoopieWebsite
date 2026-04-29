import { useEffect, useRef } from 'react';

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  wobble: number;
  phase: number;
  opacity: number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBubble(w: number, h: number): Bubble {
  return {
    x: rand(0, w),
    y: rand(h * 0.3, h),
    r: rand(2, 7),
    speed: rand(0.3, 0.4),
    wobble: rand(0.3, 0.8),
    phase: rand(0, Math.PI * 5),
    opacity: rand(0.35, 0.75),
  };
}

export function AquaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const BUBBLE_COUNT = 38;
    let bubbles: Bubble[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      bubbles = Array.from({ length: BUBBLE_COUNT }, () => makeBubble(canvas.width, canvas.height));
    };

    resize();

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Water background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#02334a');
      bg.addColorStop(0.35, '#033d5a');
      bg.addColorStop(0.70, '#014a5e');
      bg.addColorStop(1, '#012535');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Bubbles
      for (const b of bubbles) {
        b.y -= b.speed;
        b.x += Math.sin(t * b.wobble * 0.01 + b.phase) * 0.5;

        if (b.y + b.r < 0) {
          b.y = canvas.height + b.r;
          b.x = rand(0, canvas.width);
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180,240,255,${b.opacity * 0.8})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(b.x - b.r * 0.28, b.y - b.r * 0.28, b.r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240,255,255,${b.opacity * 0.55})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,210,240,${b.opacity * 0.12})`;
        ctx.fill();
        ctx.restore();
      }

      // Surface shimmer
      const shimHeight = h * 0.045;
      const shimGrad = ctx.createLinearGradient(0, 0, 0, shimHeight);
      shimGrad.addColorStop(0, 'rgba(160,240,255,0.22)');
      shimGrad.addColorStop(0.6, 'rgba(80,180,230,0.08)');
      shimGrad.addColorStop(1, 'rgba(0,120,180,0)');
      ctx.fillStyle = shimGrad;
      ctx.fillRect(0, 0, w, shimHeight);

      ctx.beginPath();
      ctx.moveTo(0, shimHeight * 0.55);
      for (let sx = 0; sx <= w; sx += 6) {
        const sy = shimHeight * 0.55 + Math.sin(sx * 0.025 + t * 0.002) * 4 + Math.sin(sx * 0.011 - t * 0.0015) * 2.5;
        ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(180,245,255,0.35)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      t += 1;
      animId = requestAnimationFrame(draw);
    };

    draw();

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
