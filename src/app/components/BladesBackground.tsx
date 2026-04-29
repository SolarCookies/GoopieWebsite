import { useEffect, useRef } from 'react';

const DEFAULT_COLOR = '#4caf50';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function resolveColor(color?: string): [number, number, number] {
  const c = (color || '').toLowerCase().replace('#', '');
  // treat black / unset as default
  if (!c || c === '000000') return hexToRgb(DEFAULT_COLOR);
  try {
    const rgb = hexToRgb(color!);
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) return hexToRgb(DEFAULT_COLOR);
    return rgb;
  } catch {
    return hexToRgb(DEFAULT_COLOR);
  }
}

interface BladesBackgroundProps {
  color?: string;
}

export function BladesBackground({ color }: BladesBackgroundProps) {
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
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resize();

    const PETALS = 8;
    const RING_COUNT = 12;

    const draw = () => {
      const [cr, cg, cb] = colorRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.hypot(cx, cy);

      // Dark-to-mid base derived from accent color (30/45/30% so it looks rich, not black)
      const br = Math.max(15, Math.round(cr * 0.30));
      const bg = Math.max(20, Math.round(cg * 0.45));
      const bb = Math.max(15, Math.round(cb * 0.30));
      ctx.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx.fillRect(0, 0, w, h);

      // Central glow — much more visible
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.55);
      glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.50)`);
      glow.addColorStop(0.3, `rgba(${Math.round(cr*0.7)},${Math.round(cg*0.7)},${Math.round(cb*0.7)},0.25)`);
      glow.addColorStop(0.7, `rgba(${Math.round(cr*0.35)},${Math.round(cg*0.35)},${Math.round(cb*0.35)},0.08)`);
      glow.addColorStop(1, `rgba(${br},${bg},${bb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Rose-petal ripple rings
      const phase = time * 0.0004;

      for (let ring = 0; ring < RING_COUNT; ring++) {
        const baseRadius = (ring + 1) / RING_COUNT * maxR * 0.85;
        const pulse = Math.sin(phase * 2 - ring * 0.5) * 8;
        const r = baseRadius + pulse;

        const opacity = 0.14 + 0.08 * Math.sin(phase + ring * 0.7);
        // Slightly vary brightness per ring
        const scale = 0.70 + 0.30 * (1 - ring / RING_COUNT);
        const rr = Math.round(cr * scale);
        const rg = Math.round(cg * scale);
        const rb = Math.round(cb * scale);

        ctx.beginPath();
        const steps = 180;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const petalWave = 1 + 0.12 * Math.cos(PETALS * angle + phase + ring * 0.4);
          const px = cx + Math.cos(angle) * r * petalWave;
          const py = cy + Math.sin(angle) * r * petalWave;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},${opacity})`;
        ctx.lineWidth = 1.5 + (1 - ring / RING_COUNT) * 1.5;
        ctx.stroke();
      }

      // Filled petal layers
      ctx.save();
      ctx.globalAlpha = 0.08;
      for (let layer = 0; layer < 3; layer++) {
        const lr = maxR * (0.25 + layer * 0.15);
        const layerPhase = phase * 0.7 + layer * 1.2;
        ctx.beginPath();
        const steps = 180;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const wave = 1 + 0.25 * Math.cos(PETALS * angle + layerPhase);
          const px = cx + Math.cos(angle) * lr * wave;
          const py = cy + Math.sin(angle) * lr * wave;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},1)`;
        ctx.fill();
      }
      ctx.restore();

      time += 16;
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
