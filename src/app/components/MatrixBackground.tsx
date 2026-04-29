import { useEffect, useRef } from 'react';

/**
 * Matrix theme background: classic falling green katakana/digit rain on
 * black. Uses a column-based simulation; each column tracks a head row
 * and a tail length, which is cheap (no per-glyph object allocation).
 */
export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let cols = 0;
    let rows = 0;
    let heads: number[] = [];
    let speeds: number[] = [];
    let glyphs: string[] = [];
    const FONT_SIZE = 16;

    const CHARSET =
      '\u30A0\u30A1\u30A2\u30A3\u30A4\u30A5\u30A6\u30A7\u30A8\u30A9\u30AA\u30AB\u30AC\u30AD\u30AE\u30AF\u30B0' +
      '\u30B1\u30B2\u30B3\u30B4\u30B5\u30B6\u30B7\u30B8\u30B9\u30BA\u30BB\u30BC\u30BD\u30BE\u30BF\u30C0' +
      '0123456789@#$%&*+-/=<>?';

    const randomGlyph = () => CHARSET[(Math.random() * CHARSET.length) | 0];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      cols = Math.ceil(canvas.width / FONT_SIZE);
      rows = Math.ceil(canvas.height / FONT_SIZE);
      heads = new Array(cols);
      speeds = new Array(cols);
      glyphs = new Array(cols * rows);
      for (let c = 0; c < cols; c++) {
        heads[c] = Math.random() * rows;
        speeds[c] = 0.25 + Math.random() * 0.55;
      }
      for (let i = 0; i < glyphs.length; i++) glyphs[i] = randomGlyph();
    };

    const draw = () => {
      // Trail effect: don't fully clear, paint a translucent black on top.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px ui-monospace, "Courier New", monospace`;
      ctx.textBaseline = 'top';

      for (let c = 0; c < cols; c++) {
        const headRow = heads[c];
        const x = c * FONT_SIZE;
        // Bright head glyph
        const headIdx = Math.floor(headRow);
        const headY = headIdx * FONT_SIZE;
        // Occasionally swap glyphs for a flickering feel
        if (Math.random() < 0.05) {
          glyphs[c * rows + (headIdx % rows)] = randomGlyph();
        }
        ctx.fillStyle = '#d6ffd6';
        ctx.fillText(glyphs[c * rows + (headIdx % rows)] || randomGlyph(), x, headY);

        // Trail (a few glyphs above the head, fading)
        for (let t = 1; t < 6; t++) {
          const r = headIdx - t;
          if (r < 0) break;
          const alpha = (1 - t / 6) * 0.7;
          ctx.fillStyle = `rgba(0, 220, 90, ${alpha})`;
          const g = glyphs[c * rows + (r % rows)] || randomGlyph();
          ctx.fillText(g, x, r * FONT_SIZE);
        }

        heads[c] += speeds[c];
        if (heads[c] * FONT_SIZE > canvas.height + FONT_SIZE * 6) {
          heads[c] = -Math.random() * 20;
          speeds[c] = 0.25 + Math.random() * 0.55;
        }
      }
    };

    // First fully clear once so trail accumulation starts from black.
    const init = () => {
      resize();
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Fixed-timestep loop so the rain runs at the same speed regardless of
    // the display's refresh rate (60Hz, 144Hz, 240Hz, ...).
    const STEP_MS = 55; // ~18 ticks/sec — classic chunky matrix cadence
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      acc += delta;
      // Cap the accumulator so a long pause (tab unhide) doesn't burst-draw.
      if (acc > STEP_MS * 4) acc = STEP_MS * 4;
      while (acc >= STEP_MS) {
        draw();
        acc -= STEP_MS;
      }
      animId = requestAnimationFrame(loop);
    };

    init();
    animId = requestAnimationFrame((t) => {
      last = t;
      loop(t);
    });
    window.addEventListener('resize', init);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else {
        last = performance.now();
        acc = 0;
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
      style={{ zIndex: 0, display: 'block', backgroundColor: '#000' }}
    />
  );
}
