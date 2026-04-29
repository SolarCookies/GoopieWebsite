import { useEffect, useRef } from 'react';

const DEFAULT_COLOR = '#cc0000';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function resolveColor(color?: string): [number, number, number] {
  const c = (color || '').toLowerCase().replace('#', '');
  if (!c || c === '000000') return hexToRgb(DEFAULT_COLOR);
  try {
    const rgb = hexToRgb(color!);
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) return hexToRgb(DEFAULT_COLOR);
    return rgb;
  } catch {
    return hexToRgb(DEFAULT_COLOR);
  }
}

interface XMBBackgroundProps {
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
  phase: number;
}

function makeParticle(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 2 + 0.4,
    speed: Math.random() * 0.35 + 0.08,
    opacity: Math.random() * 0.55 + 0.15,
    drift: (Math.random() - 0.5) * 0.25,
    phase: Math.random() * Math.PI * 2,
  };
}

export function XMBBackground({ color }: XMBBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef<[number, number, number]>(resolveColor(color));

  useEffect(() => {
    colorRef.current = resolveColor(color);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const PARTICLE_COUNT = 120;
    const WAVE_COUNT = 3;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        makeParticle(canvas.width, canvas.height)
      );
    };

    resize();

    const draw = () => {
      const [cr, cg, cb] = colorRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Very dark background, faint colour tint
      const br = Math.max(4, Math.round(cr * 0.06));
      const bg = Math.max(3, Math.round(cg * 0.05));
      const bb = Math.max(3, Math.round(cb * 0.05));
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(0, 0, w, h);

      // Subtle radial glow at centre
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.65);
      glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.2)`);
      glow.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.03)`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // ── XMB fabric waves ──────────────────────────
      // Waves are bunched in the lower-center area like draped silk.
      // Each wave is a filled ribbon (closed shape between two offset paths)
      // so there is no harsh centre line — just soft overlapping folds.
      const centerY = h * 0.62;   // anchor slightly below screen centre
      const phase = t * 0.00032;

      ctx.save();

      for (let i = 0; i < WAVE_COUNT; i++) {
        // Spread waves tightly: ±28 % of height around centerY
        const waveFrac = (i / (WAVE_COUNT - 1)) * 2 - 1; // -1 → 1
        const baseY = centerY + waveFrac * h * 0.28;

        const dist = Math.abs(waveFrac);           // 0 = center, 1 = edge
        const alpha = (1 - dist * dist) * 1.52;   // fade toward edges, all soft
        if (alpha < 0.015) continue;

        // Ribbon half-thickness: thicker near centre, still wide at edges
        const halfThick = h * (0.075 - dist * 0.018);

        // Each ribbon has its own slow undulation
        const freq  = 0.0018 + i * 0.00018;
        const amp   = h * (0.032 + (1 - dist) * 0.028);
        const spd   = phase * (0.6 + i * 0.045);
        const spd2  = phase * (0.4 - i * 0.022);

        // Build top edge of ribbon (forward)
        const topPts: [number, number][] = [];
        const botPts: [number, number][] = [];
        for (let x = 0; x <= w; x += 4) {
          const mid =
            baseY +
            Math.sin(x * freq  + spd)  * amp +
            Math.sin(x * freq * 1.7 - spd2) * amp * 0.35;
          // Slightly different wave on each edge to give fabric thickness variation
          const edgeWarp = Math.sin(x * freq * 0.6 + spd * 0.8) * halfThick * 0.18;
          topPts.push([x, mid - halfThick + edgeWarp]);
          botPts.push([x, mid + halfThick + edgeWarp]);
        }

        // Draw filled ribbon (closed path top→right→bottom reversed→left)
        ctx.beginPath();
        topPts.forEach(([x, y], idx) => {
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        for (let j = botPts.length - 1; j >= 0; j--) {
          ctx.lineTo(botPts[j][0], botPts[j][1]);
        }
        ctx.closePath();

        // Gradient fill across the ribbon height for a silky sheen
        const ribbonTop = baseY - halfThick * 1.4;
        const ribbonBot = baseY + halfThick * 1.4;
        const grad = ctx.createLinearGradient(0, ribbonTop, 0, ribbonBot);
        grad.addColorStop(0,   `rgba(${cr},${cg},${cb},0)`);
        grad.addColorStop(0.35,`rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(0.5, `rgba(${Math.min(255,cr+60)},${Math.min(255,cg+40)},${Math.min(255,cb+40)},${alpha * 0.55})`);
        grad.addColorStop(0.65,`rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.restore();

      // ── Particles ──────────────────────────────────
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(t * 0.001 + p.phase) * 0.18;

        if (p.y < -p.size) {
          p.y = canvas.height + p.size;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        const twinkle = 0.45 + 0.55 * Math.sin(t * 0.0025 + p.phase);
        const a = p.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * 0.75})`;
        ctx.fill();

        // Cross flare on larger particles
        if (p.size > 1.5) {
          ctx.save();
          ctx.strokeStyle = `rgba(255,255,255,${a * 0.55})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size * 2.2, p.y);
          ctx.lineTo(p.x + p.size * 2.2, p.y);
          ctx.moveTo(p.x, p.y - p.size * 2.2);
          ctx.lineTo(p.x, p.y + p.size * 2.2);
          ctx.stroke();
          ctx.restore();
        }
      }

      t += 16;
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
