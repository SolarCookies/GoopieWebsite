import { useEffect, useRef } from 'react';

export function PeaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const RIPPLE_COUNT = 22;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.hypot(cx, cy) * 1.15;

      const t = time * 0.001;
      const hueBase = (time * 0.018) % 360;

      // Deep water base — dark shifting teal/violet
      ctx.fillStyle = `hsl(${(hueBase + 210) % 360}, 55%, 5%)`;
      ctx.fillRect(0, 0, w, h);

      // Soft deep glow at the ripple source
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.45);
      glow.addColorStop(0,   `hsla(${(hueBase + 180) % 360}, 80%, 22%, 0.55)`);
      glow.addColorStop(0.45,`hsla(${(hueBase + 200) % 360}, 70%, 10%, 0.20)`);
      glow.addColorStop(1,   `hsla(${(hueBase + 220) % 360}, 60%, 5%, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // --- Primary ripples from center ---
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const phase = i / RIPPLE_COUNT;
        const progress = ((t * 0.01125 + phase) % 1.0); // 0→1 as ring expands
        const r = progress * maxR;

        // Fade in from center, peak half-way, fade at edge  
        const opacity = Math.sin(progress * Math.PI) * 0.70;
        if (opacity <= 0.01) continue;

        // Hue shifts across rings AND over time — iridescent refraction look
        const hue = (hueBase + i * (360 / RIPPLE_COUNT) + progress * 80) % 360;
        const lw = (1 - progress) * 7 + 2;

        // Slightly wobbly ring path (water-surface distortion)
        const WOBBLE_STEPS = 360;
        const wobbleAmp = r * 0.007 * (1 - progress);
        ctx.beginPath();
        for (let s = 0; s <= WOBBLE_STEPS; s++) {
          const ang = (s / WOBBLE_STEPS) * Math.PI * 2;
          const wobble = wobbleAmp * Math.sin(ang * 7 + t * 2.3 + i * 0.8)
                       + wobbleAmp * 0.5 * Math.sin(ang * 13 - t * 1.7 + i * 1.3);
          const pr = r + wobble;
          const px = cx + Math.cos(ang) * pr;
          const py = cy + Math.sin(ang) * pr;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Bright refraction crest
        ctx.strokeStyle = `hsla(${hue}, 100%, 72%, ${opacity})`;
        ctx.lineWidth = lw;
        ctx.stroke();

        // Soft wide halo around the crest (subsurface scatter)
        ctx.strokeStyle = `hsla(${(hue + 20) % 360}, 85%, 55%, ${opacity * 0.22})`;
        ctx.lineWidth = lw * 7;
        ctx.stroke();
      }


      time += 11;
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
