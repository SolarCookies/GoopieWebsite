import { useEffect, useRef } from 'react';

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  hue: number;
}

/**
 * Embers theme background: pitch-black canvas with slowly rising red/orange
 * embers and a faint vignette. Cheap to render (canvas2D, ~45 particles).
 */
export function EmbersBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let embers: Ember[] = [];
    const COUNT = 45;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const spawn = (initial = false): Ember => {
      const maxLife = 200 + Math.random() * 300;
      return {
        x: Math.random() * canvas.width,
        y: initial ? Math.random() * canvas.height : canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.3 + Math.random() * 0.7),
        radius: 0.6 + Math.random() * 1.8,
        life: initial ? Math.random() * maxLife : 0,
        maxLife,
        hue: 350 + Math.random() * 25, // red -> orange-red
      };
    };

    const init = () => {
      resize();
      embers = [];
      for (let i = 0; i < COUNT; i++) embers.push(spawn(true));
    };

    const draw = () => {
      // Solid dark fill with faint radial vignette
      ctx.fillStyle = '#0a0000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height,
        0,
        canvas.width / 2,
        canvas.height,
        Math.max(canvas.width, canvas.height) * 0.9,
      );
      grad.addColorStop(0, 'rgba(120, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cheap glow: draw a soft outer disc + a bright inner core, no shadowBlur.
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        const t = e.life / e.maxLife;
        const alpha = Math.sin(t * Math.PI) * 0.85;
        // Outer halo
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 90%, 45%, ${alpha * 0.18})`;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${e.hue}, 95%, 60%, ${alpha})`;
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const update = () => {
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.x += e.vx;
        e.y += e.vy;
        e.vx += (Math.random() - 0.5) * 0.02;
        e.life++;
        if (e.life >= e.maxLife || e.y < -20) {
          embers[i] = spawn();
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
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        animId = requestAnimationFrame(loop);
      }
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
