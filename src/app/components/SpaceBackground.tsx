import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkle: number;
}

interface Streak {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  life: number;
  maxLife: number;
}

/**
 * Space theme background: deep purple/black gradient, two faint nebula
 * blobs, twinkling stars, and the occasional shooting star.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let stars: Star[] = [];
    let streaks: Streak[] = [];
    let frame = 0;
    const STAR_COUNT = 140;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const init = () => {
      resize();
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.4 + 0.3,
          baseAlpha: 0.4 + Math.random() * 0.55,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      streaks = [];
    };

    const spawnStreak = () => {
      const fromTop = Math.random() < 0.5;
      const speed = 6 + Math.random() * 4;
      streaks.push({
        x: Math.random() * canvas.width,
        y: fromTop ? -20 : Math.random() * canvas.height * 0.5,
        vx: -speed,
        vy: speed * 0.5,
        len: 60 + Math.random() * 40,
        life: 0,
        maxLife: 60,
      });
    };

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0420');
      grad.addColorStop(0.6, '#06021a');
      grad.addColorStop(1, '#02010a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawNebula = () => {
      // Two soft radial blobs, drawn once per frame (cheap with createRadialGradient).
      const nebula = (cx: number, cy: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      };
      nebula(canvas.width * 0.25, canvas.height * 0.35, Math.max(canvas.width, canvas.height) * 0.45, 'rgba(120, 60, 220, 0.18)');
      nebula(canvas.width * 0.78, canvas.height * 0.7, Math.max(canvas.width, canvas.height) * 0.5, 'rgba(40, 100, 220, 0.14)');
    };

    const drawStars = () => {
      for (const s of stars) {
        const a = s.baseAlpha * (0.6 + Math.sin(s.twinkle + frame * 0.05) * 0.4);
        ctx.fillStyle = `rgba(230, 230, 255, ${a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
    };

    const drawStreaks = () => {
      for (const s of streaks) {
        const t = s.life / s.maxLife;
        const alpha = Math.sin(t * Math.PI);
        ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + (s.vx / 6) * s.len, s.y + (s.vy / 6) * s.len);
        ctx.stroke();
      }
    };

    const draw = () => {
      drawSky();
      drawNebula();
      drawStars();
      drawStreaks();
    };

    const update = () => {
      frame++;
      if (Math.random() < 0.005 && streaks.length < 3) spawnStreak();
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        if (s.life >= s.maxLife || s.x < -100 || s.y > canvas.height + 50) {
          streaks.splice(i, 1);
        }
      }
    };

    const loop = () => {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    };

    init();
    loop();
    window.addEventListener('resize', init);

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(animId);
      else animId = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', init);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, display: 'block' }}
    />
  );
}
