import { useEffect, useRef } from 'react';

interface Block {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  shape: 'square' | 'circle' | 'triangle';
}

const PALETTE = ['#ff5aa0', '#5acaff', '#ffd84a', '#7be77b', '#b58bff', '#ff8a4a'];

/**
 * Toy theme background: bright pastel sky with bouncy floating shapes
 * (squares, circles, triangles) drifting around. Playful and cheerful.
 */
export function ToyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let blocks: Block[] = [];
    const COUNT = 28;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const makeBlock = (): Block => {
      const shapes: Block['shape'][] = ['square', 'circle', 'triangle'];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        size: 16 + Math.random() * 28,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.02,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      };
    };

    const init = () => {
      resize();
      blocks = [];
      for (let i = 0; i < COUNT; i++) blocks.push(makeBlock());
    };

    const drawSky = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#ffe4f1');
      grad.addColorStop(0.5, '#e6f4ff');
      grad.addColorStop(1, '#ffe4f1');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawBlock = (b: Block) => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      switch (b.shape) {
        case 'square':
          ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, b.size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -b.size / 2);
          ctx.lineTo(b.size / 2, b.size / 2);
          ctx.lineTo(-b.size / 2, b.size / 2);
          ctx.closePath();
          ctx.fill();
          break;
      }
      // White rim for a "toy plastic" feel
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      drawSky();
      for (const b of blocks) drawBlock(b);
    };

    const update = () => {
      for (const b of blocks) {
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vrot;
        if (b.x < -40) b.x = canvas.width + 40;
        if (b.x > canvas.width + 40) b.x = -40;
        if (b.y < -40) b.y = canvas.height + 40;
        if (b.y > canvas.height + 40) b.y = -40;
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
