import {
  SHADOWED_CRATERS,
  SUNLIT_RIDGE,
  getTerrainHeight,
  getTerrainNormal,
} from './lunarTerrain';

export interface LroElevationStats {
  minH: number;
  maxH: number;
  gridSize: number;
  heights: Float32Array;
}

const statsCache = new Map<string, LroElevationStats>();
const urlCache = new Map<string, string>();

/**
 * Samples deterministic LRO-inspired lunar South Pole elevation grid for maps & minimaps.
 */
export function computeLroElevationGrid(range = 45, gridSize = 96): LroElevationStats {
  const key = `${range}:${gridSize}`;
  const cached = statsCache.get(key);
  if (cached) return cached;

  const heights = new Float32Array(gridSize * gridSize);
  let minH = Infinity;
  let maxH = -Infinity;

  for (let py = 0; py < gridSize; py++) {
    const wz = ((py / (gridSize - 1)) * 2 - 1) * range;
    for (let px = 0; px < gridSize; px++) {
      const wx = ((px / (gridSize - 1)) * 2 - 1) * range;
      const h = getTerrainHeight(wx, wz);
      heights[py * gridSize + px] = h;
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
    }
  }

  const res = { minH, maxH, gridSize, heights };
  statsCache.set(key, res);
  return res;
}

/**
 * Generates an LRO-style shaded-relief + elevation contour data-URL image for Mission Map and Live Minimap.
 * Falls back cleanly to null in non-DOM test environments while still allowing computeLroElevationGrid to be unit tested.
 */
export function createLroReliefDataUrl(range = 45, size = 320): string | null {
  const key = `${range}:${size}`;
  const cached = urlCache.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = ctx.createImageData(size, size);
  const data = img.data;
  // Low South Pole solar azimuth matching our 3D directional sun (from high ridge side)
  const sx = 0.72;
  const sy = 0.34;
  const sz = 0.6;
  const sLen = Math.hypot(sx, sy, sz) || 1;
  const lx = sx / sLen;
  const ly = sy / sLen;
  const lz = sz / sLen;

  for (let py = 0; py < size; py++) {
    const wz = ((py / (size - 1)) * 2 - 1) * range;
    for (let px = 0; px < size; px++) {
      const wx = ((px / (size - 1)) * 2 - 1) * range;
      const h = getTerrainHeight(wx, wz);
      const n = getTerrainNormal(wx, wz);
      const ndotl = Math.max(0.08, n.nx * lx + n.ny * ly + n.nz * lz);

      // Elevation tint (subtle slate blue in deep basins -> bright silvery regolith on ridges)
      const elevNorm = Math.max(0, Math.min(1, (h + 3.6) / 6.8));

      // Permanently shadowed crater interior darkening
      let psrDark = 1.0;
      for (const c of SHADOWED_CRATERS) {
        const d = Math.hypot(wx - c.x, wz - c.z);
        if (d < c.radius * 0.92) {
          const inner = Math.max(0, Math.min(1, 1 - d / (c.radius * 0.92)));
          psrDark = Math.min(psrDark, 1 - inner * 0.66);
        }
      }

      // Peak of Eternal Light gentle sunlit warm boost
      const ridgeDist = Math.hypot(wx - SUNLIT_RIDGE.x, wz - SUNLIT_RIDGE.z);
      const ridgeWarm = Math.max(0, 1 - ridgeDist / (SUNLIT_RIDGE.radius * 1.25));

      // Topographic contour band lines every ~0.85m
      const contourDist = Math.abs((((h + 10) * 1.25) % 1) - 0.5);
      const contourBoost = contourDist < 0.045 ? 16 : 0;

      // Subtle micro-crater regolith speckle
      const grain =
        Math.sin(wx * 2.1 + wz * 1.7) * Math.cos(wx * 1.3 - wz * 2.4) * 5;

      const baseShade = (42 + ndotl * 112 + elevNorm * 38) * psrDark + ridgeWarm * 26 + contourBoost + grain;
      const r = Math.max(8, Math.min(242, baseShade * 0.98 + ridgeWarm * 14));
      const g = Math.max(10, Math.min(245, baseShade * 1.0 + ridgeWarm * 8));
      const b = Math.max(16, Math.min(252, baseShade * 1.06 + (1 - psrDark) * 28));

      const idx = (py * size + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  // Subtle LRO coordinate grid ticks
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  const step = size / 6;
  for (let i = 1; i < 6; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const dataUrl = canvas.toDataURL('image/png');
  urlCache.set(key, dataUrl);
  return dataUrl;
}
