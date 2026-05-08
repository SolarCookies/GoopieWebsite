import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Globe, User, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { renderToDataURL } from '../components/WebGLViewport';

// ── Shaders ──────────────────────────────────────────────────────────────────

const VERTEX_SHADER = /* glsl */`\
#version 300 es
precision highp float;
layout (location=0) in vec3 aPosition;
layout (location=1) in vec3 aColor;
uniform mat4 uMVP;
out vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = uMVP * vec4(aPosition, 1.0);
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

// ── mat4 math (column-major Float32Array[16]) ─────────────────────────────────

function mat4mul(a: Float32Array, b: Float32Array): Float32Array {
  const r = new Float32Array(16);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + row] * b[col * 4 + k];
      r[col * 4 + row] = s;
    }
  return r;
}

function mat4perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

/** Look-at with world up = (0,1,0). */
function mat4lookAt(ex: number, ey: number, ez: number, cx: number, cy: number, cz: number): Float32Array {
  let fx = cx - ex, fy = cy - ey, fz = cz - ez;
  const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  // right = forward × (0,1,0)
  let sx = -fz, sz = fx;
  const sl = Math.hypot(sx, sz); sx /= sl; sz /= sl;
  // true up = right × forward  (sy=0 since right.y is always 0)
  const vx = -sz * fy, vy = sz * fx - sx * fz, vz = sx * fy;
  return new Float32Array([
    sx, vx, -fx, 0,
    0,  vy, -fy, 0,
    sz, vz, -fz, 0,
    -(sx * ex + sz * ez),
    -(vx * ex + vy * ey + vz * ez),
    fx * ex + fy * ey + fz * ez,
    1,
  ]);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VehiclePart {
  shapeId: number;
  px: number; py: number; pz: number;
  rx: number; ry: number; rz: number;
  color: number;
  isPainted: boolean;
}

interface Vehicle {
  name: string;
  parts: VehiclePart[];
}

// ── CEF bridge ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    reloadVehicles?: () => boolean;
    getVehicleCount?: () => number;
    getVehicle?: (idx: number) => Vehicle | string;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Unpack ARGB int32 (signed from C++ unsigned int) into [0,1] RGB. */
function unpackColor(c: number): [number, number, number] {
  const u = c >>> 0; // reinterpret as unsigned 32-bit
  return [((u >> 16) & 0xff) / 255, ((u >> 8) & 0xff) / 255, (u & 0xff) / 255];
}

/** Apply intrinsic XYZ Euler rotation (Rz * Ry * Rx) to a vertex. */
function applyRot(rx: number, ry: number, rz: number, x: number, y: number, z: number): [number, number, number] {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const nx = cy * cz * x + (sx * sy * cz - cx * sz) * y + (cx * sy * cz + sx * sz) * z;
  const ny = cy * sz * x + (sx * sy * sz + cx * cz) * y + (cx * sy * sz - sx * cz) * z;
  const nz =      -sy * x +               sx * cy   * y +               cx * cy   * z;
  return [nx, ny, nz];
}

// ── Geometry ──────────────────────────────────────────────────────────────────

interface Geometry { positions: Float32Array; colors: Float32Array; vertexCount: number; }

// Directional light: from (1, 2, 1.5), normalized
const _lm = Math.hypot(1, 2, 1.5);
const LIGHT: [number, number, number] = [1 / _lm, 2 / _lm, 1.5 / _lm];

/** Compute lambertian shade for a (rotated) normal against the scene light. */
function shade(nx: number, ny: number, nz: number): number {
  const diffuse = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  return diffuse * 0.8 + 0.2; // 0.2 ambient floor
}

/** Build a single combined mesh for all vehicle parts, each rendered as a cube. */
function buildVehicleGeometry(vehicle: Vehicle): Geometry {
  const pos: number[] = [], col: number[] = [];
  const H = 0.5;

  // Face definitions: local-space verts + unrotated face normal
  const FACES: { verts: [number, number, number][]; normal: [number, number, number] }[] = [
    { verts: [[-H, H,-H],[ H, H,-H],[ H, H, H],[-H, H,-H],[ H, H, H],[-H, H, H]], normal: [ 0, 1, 0] }, // +Y top
    { verts: [[-H,-H,-H],[ H,-H, H],[ H,-H,-H],[-H,-H,-H],[-H,-H, H],[ H,-H, H]], normal: [ 0,-1, 0] }, // -Y bottom
    { verts: [[-H,-H, H],[ H,-H, H],[ H, H, H],[-H,-H, H],[ H, H, H],[-H, H, H]], normal: [ 0, 0, 1] }, // +Z front
    { verts: [[ H,-H,-H],[-H,-H,-H],[-H, H,-H],[ H,-H,-H],[-H, H,-H],[ H, H,-H]], normal: [ 0, 0,-1] }, // -Z back
    { verts: [[ H,-H, H],[ H,-H,-H],[ H, H,-H],[ H,-H, H],[ H, H,-H],[ H, H, H]], normal: [ 1, 0, 0] }, // +X right
    { verts: [[-H,-H,-H],[-H,-H, H],[-H, H, H],[-H,-H,-H],[-H, H, H],[-H, H,-H]], normal: [-1, 0, 0] }, // -X left
  ];

  for (const part of vehicle.parts) {
    const [r, g, b] = unpackColor(part.color);
    const { px, py, pz, rx, ry, rz } = part;

    for (const { verts, normal } of FACES) {
      // Rotate the face normal the same way as the vertices, then shade
      const [rnx, rny, rnz] = applyRot(rx, ry, rz, normal[0], normal[1], normal[2]);
      const l = shade(rnx, rny, rnz);
      for (const [vx, vy, vz] of verts) {
        const [wx, wy, wz] = applyRot(rx, ry, rz, vx, vy, vz);
        pos.push(wx + px, wy + py, wz + pz);
        col.push(r * l, g * l, b * l);
      }
    }
  }

  return { positions: new Float32Array(pos), colors: new Float32Array(col), vertexCount: pos.length / 3 };
}

/**
 * Compute an MVP matrix that places the camera at a 45° isometric angle
 * from above and fits the entire vehicle within view.
 */
function buildVehicleMVP(vehicle: Vehicle, aspect: number): Float32Array {
  if (vehicle.parts.length === 0) {
    return mat4mul(
      mat4perspective(Math.PI / 4, aspect, 0.1, 100),
      mat4lookAt(1.8, 1.4, 1.8, 0, 0, 0),
    );
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const p of vehicle.parts) {
    minX = Math.min(minX, p.px - 0.5); maxX = Math.max(maxX, p.px + 0.5);
    minY = Math.min(minY, p.py - 0.5); maxY = Math.max(maxY, p.py + 0.5);
    minZ = Math.min(minZ, p.pz - 0.5); maxZ = Math.max(maxZ, p.pz + 0.5);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const hx = (maxX - minX) / 2;
  const hy = (maxY - minY) / 2;
  const hz = (maxZ - minZ) / 2;

  // Bounding sphere radius from center, plus half-block padding
  const R = Math.sqrt(hx * hx + hy * hy + hz * hz) + 0.5;

  // Camera at equal offset along all three axes → true 45° top-down isometric
  // Solve: dist * tan(FOV/2) >= R, where dist = d * sqrt(3)
  const fovY = Math.PI / 4;
  const dist = R / Math.tan(fovY / 2);
  const d = dist / Math.sqrt(3);

  return mat4mul(
    mat4perspective(fovY, aspect, 0.01, dist * 4),
    mat4lookAt(cx + d, cy + d, cz + d, cx, cy, cz),
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'public' | 'mine';

const NAV_ITEMS: { id: Tab; label: string; Icon: typeof Globe }[] = [
  { id: 'public', label: 'Public Vehicles', Icon: Globe },
  { id: 'mine',   label: 'My Vehicles',     Icon: User  },
];

function loadVehiclesFromCEF(): Vehicle[] {
  window.reloadVehicles?.();
  const count = window.getVehicleCount?.() ?? 0;
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < count; i++) {
    const raw = window.getVehicle?.(i);
    if (raw == null) continue;
    vehicles.push(typeof raw === 'string' ? JSON.parse(raw) : raw);
  }
  return vehicles;
}

export function VehicleBrowser() {
  const [tab, setTab] = useState<Tab>('mine');
  const [page, setPage] = useState(0);
  const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
  const [snapshots, setSnapshots] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  // Load vehicles from CEF whenever the mine tab becomes active
  useEffect(() => {
    if (tab !== 'mine') return;
    setLoading(true);
    setMyVehicles(loadVehiclesFromCEF());
    setLoading(false);
  }, [tab]);

  // Re-render thumbnails whenever the vehicle list changes
  useEffect(() => {
    if (myVehicles.length === 0) { setSnapshots({}); return; }
    const W = 320, H = 200;
    const result: Record<number, string> = {};
    for (let i = 0; i < myVehicles.length; i++) {
      const v = myVehicles[i];
      if (v.parts.length === 0) continue;
      const geo = buildVehicleGeometry(v);
      const mvp = buildVehicleMVP(v, W / H);
      const url = renderToDataURL({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        attributes: [
          { name: 'aPosition', data: geo.positions, size: 3 },
          { name: 'aColor',    data: geo.colors,    size: 3 },
        ],
        vertexCount: geo.vertexCount,
        uniforms: [{ name: 'uMVP', type: 'mat4', value: mvp }],
        depth: true,
        width: W,
        height: H,
      });
      if (url) result[i] = url;
    }
    setSnapshots(result);
  }, [myVehicles]);

  const activeVehicles = tab === 'public' ? [] : myVehicles;
  const totalPages = Math.max(1, Math.ceil(activeVehicles.length / PAGE_SIZE));
  const pageVehicles = useMemo(
    () => activeVehicles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [activeVehicles, page],
  );

  function switchTab(next: Tab) {
    setTab(next);
    setPage(0);
  }

  function reload() {
    setLoading(true);
    setMyVehicles(loadVehiclesFromCEF());
    setLoading(false);
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a0a' }}>

      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 w-52 border-r"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0e0e0e' }}
      >
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="text-white text-base font-semibold tracking-wide">Vehicles</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left w-full transition-colors"
                style={{
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="px-6 py-4 flex items-center gap-3 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <h1 className="text-white text-lg font-semibold tracking-wide">
            {tab === 'public' ? 'Public Vehicles' : 'My Vehicles'}
          </h1>
          {tab === 'mine' && myVehicles.length > 0 && (
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {myVehicles.length} vehicle{myVehicles.length !== 1 ? 's' : ''}
            </span>
          )}
          {tab === 'mine' && (
            <button
              onClick={reload}
              className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          )}
        </header>

        {tab === 'public' ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <Globe className="w-10 h-10 opacity-30" />
            <p className="text-sm">Public vehicles coming soon.</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <p className="text-sm">Loading vehicles…</p>
          </div>
        ) : myVehicles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <User className="w-10 h-10 opacity-30" />
            <p className="text-sm">No vehicles found.</p>
          </div>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                {pageVehicles.map((v, localIdx) => {
                  const idx = page * PAGE_SIZE + localIdx;
                  return (
                    <div key={idx} className="rounded-lg overflow-hidden flex flex-col"
                      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="w-full" style={{ aspectRatio: '16/10', background: '#0d0d0d' }}>
                        {snapshots[idx] ? (
                          <img src={snapshots[idx]} alt={v.name} className="w-full h-full"
                            style={{ display: 'block', objectFit: 'cover' }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs"
                            style={{ color: 'rgba(255,255,255,0.2)' }}>Rendering…</div>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{v.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {v.parts.length} part{v.parts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>

            <footer className="px-6 py-4 flex items-center justify-between border-t shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

