import { useEffect, useRef } from 'react';

interface Cloud {
  x: number;
  y: number;
  vx: number;
  scale: number;
  alpha: number;
  puffs: { dx: number; dy: number; r: number }[];
}

/**
 * Sunny day theme background: sky-blue gradient, a warm sun with a soft
 * halo and slowly rotating rays, and a few drifting white clouds.
 */
export function SunnyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let clouds: Cloud[] = [];
    let frame = 0;
    const CLOUD_COUNT = 6;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const makeCloud = (initial = false): Cloud => {
      const scale = 0.7 + Math.random() * 1.3;
      const puffCount = 4 + Math.floor(Math.random() * 4);
      const puffs: Cloud['puffs'] = [];
      for (let i = 0; i < puffCount; i++) {
        puffs.push({
          dx: (i - puffCount / 2) * (20 + Math.random() * 8),
          dy: (Math.random() - 0.5) * 12,
          r: 22 + Math.random() * 18,
        });
      }
      return {
        x: initial ? Math.random() * canvas.width : -160 * scale,
        y: 30 + Math.random() * (canvas.height * 0.55),
        vx: 0.10 + Math.random() * 0.15,
        scale,
        alpha: 0.55 + Math.random() * 0.30,
        puffs,
      };
    };

    const init = () => {
      resize();
      clouds = [];
      for (let i = 0; i < CLOUD_COUNT; i++) clouds.push(makeCloud(true));
    };

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#7ec8ff');
      grad.addColorStop(1, '#cfe9ff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawSun = () => {
      const sx = canvas.width * 0.18;
      const sy = canvas.height * 0.20;
      const r = 50;
      // Halo
      const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 4);
      halo.addColorStop(0, 'rgba(255, 230, 120, 0.55)');
      halo.addColorStop(1, 'rgba(255, 230, 120, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 4, 0, Math.PI * 2);
      ctx.fill();
      // Slowly rotating rays
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(frame * 0.002);
      ctx.strokeStyle = 'rgba(255, 215, 80, 0.45)';
      ctx.lineWidth = 3;
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * Math.PI * 2;
        const inner = r * 1.15;
        const outer = r * 1.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.stroke();
      }
      ctx.restore();
      // Disc
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawClouds = () => {
      for (const c of clouds) {
        ctx.fillStyle = `rgba(255, 255, 255, ${c.alpha})`;
        for (const p of c.puffs) {
          ctx.beginPath();
          ctx.arc(c.x + p.dx * c.scale, c.y + p.dy * c.scale, p.r * c.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const draw = () => {
      drawSky();
      drawSun();
      drawClouds();
    };

    const update = () => {
      frame++;
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        c.x += c.vx;
        if (c.x - 220 * c.scale > canvas.width) clouds[i] = makeCloud();
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
