import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkle: number;
}

interface Cloud {
  x: number;
  y: number;
  vx: number;
  scale: number;
  alpha: number;
  puffs: { dx: number; dy: number; r: number }[];
}

interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  flap: number;
  flapSpeed: number;
}

/**
 * Gothic theme background: dark blue night sky with stars, slow-drifting
 * clouds, a moon, and a few silhouetted bats flapping across the screen.
 * Designed to be cheap (canvas2D, no shadowBlur, capped particle counts).
 */
export function GothicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let stars: Star[] = [];
    let clouds: Cloud[] = [];
    let bats: Bat[] = [];
    let frame = 0;

    const STAR_COUNT = 90;
    const CLOUD_COUNT = 6;
    const BAT_COUNT = 5;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const makeCloud = (initial = false): Cloud => {
      const scale = 0.6 + Math.random() * 1.1;
      const puffCount = 4 + Math.floor(Math.random() * 4);
      const puffs: Cloud['puffs'] = [];
      for (let i = 0; i < puffCount; i++) {
        puffs.push({
          dx: (i - puffCount / 2) * (18 + Math.random() * 8),
          dy: (Math.random() - 0.5) * 10,
          r: 18 + Math.random() * 16,
        });
      }
      return {
        x: initial ? Math.random() * canvas.width : -120 * scale,
        y: 30 + Math.random() * (canvas.height * 0.55),
        vx: 0.08 + Math.random() * 0.12,
        scale,
        alpha: 0.18 + Math.random() * 0.22,
        puffs,
      };
    };

    const makeBat = (initial = false): Bat => {
      const fromLeft = Math.random() < 0.5;
      return {
        x: initial ? Math.random() * canvas.width : fromLeft ? -30 : canvas.width + 30,
        y: 40 + Math.random() * (canvas.height * 0.65),
        vx: (fromLeft ? 1 : -1) * (0.4 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 0.15,
        size: 6 + Math.random() * 6,
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 0.18 + Math.random() * 0.12,
      };
    };

    const init = () => {
      resize();
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.85,
          r: Math.random() * 1.2 + 0.3,
          baseAlpha: 0.4 + Math.random() * 0.5,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      clouds = [];
      for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(makeCloud(true));
      bats = [];
      for (let i = 0; i < BAT_COUNT; i++) bats.push(makeBat(true));
    };

    const drawSky = () => {
      // Vertical gradient: deep midnight blue -> near black.
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a1230');
      grad.addColorStop(0.55, '#05081a');
      grad.addColorStop(1, '#02030a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawMoon = () => {
      const mx = canvas.width * 0.82;
      const my = canvas.height * 0.18;
      const r = 42;
      // Soft halo
      const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3);
      halo.addColorStop(0, 'rgba(140, 155, 195, 0.10)');
      halo.addColorStop(1, 'rgba(140, 155, 195, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, r * 3, 0, Math.PI * 2);
      ctx.fill();
      // Moon disc (dim, slightly cool)
      ctx.fillStyle = '#7a839c';
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
      // Craters: clip to disc so they never spill outside.
      ctx.save();
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.clip();
      const craters: { dx: number; dy: number; cr: number }[] = [
        { dx: -0.55, dy: -0.20, cr: 0.13 },
        { dx: -0.10, dy: -0.55, cr: 0.10 },
        { dx:  0.50, dy: -0.40, cr: 0.16 },
        { dx:  0.60, dy:  0.25, cr: 0.11 },
        { dx:  0.05, dy:  0.55, cr: 0.18 },
        { dx: -0.45, dy:  0.45, cr: 0.09 },
        { dx: -0.20, dy:  0.10, cr: 0.07 },
      ];
      for (const c of craters) {
        const cx = mx + c.dx * r;
        const cy = my + c.dy * r;
        const cr = c.cr * r;
        ctx.fillStyle = '#5e6680';
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
        // Subtle highlight rim on the bottom-right
        ctx.fillStyle = 'rgba(170, 180, 205, 0.35)';
        ctx.beginPath();
        ctx.arc(cx + cr * 0.25, cy + cr * 0.25, cr * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawStars = () => {
      for (const s of stars) {
        const a = s.baseAlpha * (0.7 + Math.sin(s.twinkle + frame * 0.04) * 0.3);
        ctx.fillStyle = `rgba(220, 230, 255, ${a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
    };

    const drawClouds = () => {
      for (const c of clouds) {
        ctx.fillStyle = `rgba(20, 28, 55, ${c.alpha})`;
        for (const p of c.puffs) {
          ctx.beginPath();
          ctx.arc(c.x + p.dx * c.scale, c.y + p.dy * c.scale, p.r * c.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawBat = (b: Bat) => {
      const wing = Math.sin(b.flap) * 0.5 + 0.5; // 0..1
      const s = b.size;
      const dir = b.vx >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(dir, 1);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      // Body
      ctx.ellipse(0, 0, s * 0.35, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings (two triangles, flapping height)
      const wingY = -s * 0.2 - wing * s * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-s * 1.6, wingY);
      ctx.lineTo(-s * 0.9, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 1.6, wingY);
      ctx.lineTo(s * 0.9, s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      drawSky();
      drawStars();
      drawMoon();
      drawClouds();
      for (const b of bats) drawBat(b);
    };

    const update = () => {
      frame++;
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.x += c.vx;
        if (c.x - 200 * c.scale > canvas.width) clouds[i] = makeCloud();
      }
      for (let i = 0; i < bats.length; i++) {
        const b = bats[i];
        b.x += b.vx;
        b.y += b.vy + Math.sin(b.flap * 0.5) * 0.2;
        b.flap += b.flapSpeed;
        if (b.x < -50 || b.x > canvas.width + 50) bats[i] = makeBat();
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
