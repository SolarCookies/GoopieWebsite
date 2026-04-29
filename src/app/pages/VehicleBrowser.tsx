import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { renderToDataURL } from '../components/WebGLViewport';
import type { AttributeBuffer } from '../components/WebGLViewport';

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX_SHADER = /* glsl */`\
#version 300 es
precision highp float;
layout (location=0) in vec4 position;
layout (location=1) in vec3 color;
out vec3 vColor;
void main() {
  vColor = color;
  gl_Position = position;
}
`;

const FRAGMENT_SHADER = /* glsl */`\
#version 300 es
precision highp float;
in vec3 vColor;
out vec4 fragColor;
void main() {
  fragColor = vec4(vColor, 1.0);
}
`;

const POSITIONS = new Float32Array([
   0.0,  0.5, 0.0,
  -0.5, -0.5, 0.0,
   0.5, -0.5, 0.0,
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

// ---------------------------------------------------------------------------
// Static vehicle data (generated once at module level)
// ---------------------------------------------------------------------------

const BASE_NAMES = [
  'Renut-mobile',
];

interface VehicleEntry {
  id: number;
  name: string;
  attributes: AttributeBuffer[];
}

const VEHICLES: VehicleEntry[] = Array.from({ length: 100 }, (_, i) => {
  const base = BASE_NAMES[i % BASE_NAMES.length];
  const gen = Math.floor(i / BASE_NAMES.length);
  const name = gen === 0 ? base : `${base} Mk${gen + 1}`;
  const hue = (i / 100) * 360;
  const [r1, g1, b1] = hslToRgb(hue, 1, 0.5);
  const [r2, g2, b2] = hslToRgb((hue + 120) % 360, 1, 0.5);
  const [r3, g3, b3] = hslToRgb((hue + 240) % 360, 1, 0.5);
  return {
    id: i,
    name,
    attributes: [
      { name: 'position', data: POSITIONS, size: 3 },
      { name: 'color', data: new Float32Array([r1, g1, b1, r2, g2, b2, r3, g3, b3]), size: 3 },
    ],
  };
});

const PAGE_SIZE = 25;
const TOTAL_PAGES = Math.ceil(VEHICLES.length / PAGE_SIZE);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function VehicleBrowser() {
  const [page, setPage] = useState(0);
  const [snapshots, setSnapshots] = useState<Record<number, string>>({});

  // Render all 100 snapshots once on mount — synchronous per-entry, single setState
  useEffect(() => {
    const result: Record<number, string> = {};
    for (const v of VEHICLES) {
      const url = renderToDataURL(VERTEX_SHADER, FRAGMENT_SHADER, v.attributes, 3, 320, 200);
      if (url) result[v.id] = url;
    }
    setSnapshots(result);
  }, []);

  const pageVehicles = useMemo(
    () => VEHICLES.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [page],
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header
        className="px-8 py-4 flex items-center gap-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <h1 className="text-white text-xl font-semibold tracking-wide">Vehicle Browser</h1>
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {VEHICLES.length} vehicles
        </span>
      </header>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {pageVehicles.map(v => (
            <div
              key={v.id}
              className="rounded-lg overflow-hidden flex flex-col"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-full" style={{ aspectRatio: '16/10', background: '#0a0a0a' }}>
                {snapshots[v.id] ? (
                  <img
                    src={snapshots[v.id]}
                    alt={v.name}
                    className="w-full h-full"
                    style={{ display: 'block', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs"
                    style={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    Rendering…
                  </div>
                )}
              </div>
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {v.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Pagination */}
      <footer
        className="px-8 py-4 flex items-center justify-between border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p - 1)}
          disabled={page === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Page {page + 1} of {TOTAL_PAGES}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => p + 1)}
          disabled={page === TOTAL_PAGES - 1}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </footer>
    </div>
  );
}
