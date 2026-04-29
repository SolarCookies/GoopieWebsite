import React from 'react';

// Simple animated Wii-style background with floating rectangles (channels)
export function WiiBackground() {
  return (
    <div className="wii-bg-anim absolute inset-0 w-full h-full overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Soft blue gradient background */}
      <svg width="100%" height="100%" className="absolute inset-0 w-full h-full" style={{ position: 'absolute', zIndex: 0 }}>
        <defs>
          <linearGradient id="wii-bg-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6f2fb" />
            <stop offset="100%" stopColor="#b3e6ff" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#wii-bg-gradient)" />
      </svg>
      {/* Floating channel rectangles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`wii-channel wii-channel-${i}`}
          style={{
            position: 'absolute',
            left: `${10 + (i % 4) * 22}%`,
            top: `${12 + Math.floor(i / 4) * 32}%`,
            width: '17%',
            height: '28%',
            borderRadius: '18px',
            background: 'rgba(255,255,255,0.85)',
            boxShadow: '0 4px 32px 0 rgba(0,80,160,0.08)',
            border: '2px solid rgba(180,200,220,0.18)',
            animation: `wiiChannelFloat 4.5s ease-in-out ${i * 0.7}s infinite alternate`,
            zIndex: 1,
          }}
        />
      ))}
      <style>{`
        @keyframes wiiChannelFloat {
          0% { transform: translateY(0px) scale(1); box-shadow: 0 4px 32px 0 rgba(0,80,160,0.08); }
          100% { transform: translateY(-18px) scale(1.03); box-shadow: 0 12px 40px 0 rgba(0,80,160,0.13); }
        }
      `}</style>
    </div>
  );
}

export default WiiBackground;
