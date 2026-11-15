import * as THREE from 'three';

function makeSeededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawTileableDisc(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  rad: number,
  buildFill: (px: number, py: number) => string | CanvasGradient
) {
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      const px = cx + ox;
      const py = cy + oy;
      if (px + rad < 0 || px - rad > size || py + rad < 0 || py - rad > size) continue;
      ctx.fillStyle = buildFill(px, py);
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function hash2D(ix: number, iy: number, seed: number): number {
  let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

function valueNoise2D(x: number, y: number, periodX: number, periodY: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const wx0 = ((x0 % periodX) + periodX) % periodX;
  const wx1 = ((x0 + 1) % periodX + periodX) % periodX;
  const wy0 = ((y0 % periodY) + periodY) % periodY;
  const wy1 = ((y0 + 1) % periodY + periodY) % periodY;

  const n00 = hash2D(wx0, wy0, seed);
  const n10 = hash2D(wx1, wy0, seed);
  const n01 = hash2D(wx0, wy1, seed);
  const n11 = hash2D(wx1, wy1, seed);

  const nx0 = n00 + (n10 - n00) * u;
  const nx1 = n01 + (n11 - n01) * u;
  return nx0 + (nx1 - nx0) * v;
}

function fbmTileable(x: number, y: number, basePeriod: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const p = basePeriod * freq;
    sum += valueNoise2D(x * freq, y * freq, p, p, seed + i * 97) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export function createLunarRegolithTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const rng = makeSeededRng(42091);

  // Base multi-octave regolith noise (no hard-edged repetitive circles!)
  const aImg = aCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const basePeriod = 8;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * basePeriod;
      const v = (y / size) * basePeriod;
      const macro = fbmTileable(u, v, basePeriod, 4, 17);
      const grit = hash2D(x, y, 503) * 0.14 - 0.07;
      const tone = Math.max(0.32, Math.min(0.82, 0.48 + (macro - 0.5) * 0.32 + grit));
      const rgb = Math.round(tone * 255);
      const bVal = Math.round(Math.max(0, Math.min(255, (0.5 + (macro - 0.5) * 0.55 + grit * 1.4) * 255)));
      const rVal = Math.round(212 + (1 - macro) * 38);

      const idx = (y * size + x) * 4;
      aImg.data[idx] = rgb;
      aImg.data[idx + 1] = Math.min(255, rgb + 1);
      aImg.data[idx + 2] = Math.min(255, rgb + 4);
      aImg.data[idx + 3] = 255;

      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;

      rImg.data[idx] = rVal;
      rImg.data[idx + 1] = rVal;
      rImg.data[idx + 2] = rVal;
      rImg.data[idx + 3] = 255;
    }
  }
  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  // Soft, varied LRO-style impact craters & micrometeorite pits (tileable, soft feathered rims)
  for (let c = 0; c < 64; c++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const rad = c < 12 ? 12 + rng() * 18 : 2.5 + rng() * 9.5;
    const rimAlpha = c < 12 ? 0.16 : 0.22;

    if (rng() > 0.72) {
      drawTileableDisc(aCtx, size, cx, cy, rad * 1.9, (px, py) => {
        const g = aCtx.createRadialGradient(px, py, rad * 0.65, px, py, rad * 1.9);
        g.addColorStop(0, 'rgba(196,200,206,0.16)');
        g.addColorStop(1, 'rgba(139,143,149,0)');
        return g;
      });
    }

    drawTileableDisc(aCtx, size, cx, cy, rad, (px, py) => {
      const gradA = aCtx.createRadialGradient(px, py, rad * 0.08, px, py, rad);
      gradA.addColorStop(0, 'rgba(72,76,82,0.38)');
      gradA.addColorStop(0.62, 'rgba(118,122,129,0.18)');
      gradA.addColorStop(0.84, `rgba(176,181,188,${rimAlpha})`);
      gradA.addColorStop(1, 'rgba(139,143,149,0)');
      return gradA;
    });

    drawTileableDisc(bCtx, size, cx, cy, rad, (px, py) => {
      const gradB = bCtx.createRadialGradient(px, py, rad * 0.08, px, py, rad);
      gradB.addColorStop(0, 'rgba(28,28,28,0.58)');
      gradB.addColorStop(0.68, 'rgba(110,110,110,0.28)');
      gradB.addColorStop(0.86, 'rgba(210,210,210,0.42)');
      gradB.addColorStop(1, 'rgba(128,128,128,0)');
      return gradB;
    });
  }

  // Convert bump canvas heights into a tangent-space normalMap via Sobel operator
  const bumpImg = bCtx.getImageData(0, 0, size, size).data;
  const normalData = new Uint8Array(size * size * 4);
  const strength = 2.6;
  const sampleH = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return bumpImg[(wy * size + wx) * 4] / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const inv = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * size + x) * 4;
      normalData[idx] = Math.round((nx * inv * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((nz * inv * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.RepeatWrapping;
  albedoMap.repeat.set(9, 9);
  albedoMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(9, 9);
  bumpMap.anisotropy = maxAnisotropy;

  const normalMap = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(9, 9);
  normalMap.anisotropy = maxAnisotropy;
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(9, 9);
  roughnessMap.anisotropy = maxAnisotropy;

  return { albedoMap, bumpMap, normalMap, roughnessMap };
}

function gaussianLobe(
  lonDeg: number,
  latDeg: number,
  cLon: number,
  cLat: number,
  rLon: number,
  rLat: number,
  tilt = 0
): number {
  let dLon = lonDeg - cLon;
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;
  const dLat = latDeg - cLat;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const rx = (dLon * cosT - dLat * sinT) / rLon;
  const ry = (dLon * sinT + dLat * cosT) / rLat;
  return Math.exp(-(rx * rx + ry * ry));
}

function earthContinentPotential(lonDeg: number, latDeg: number): number {
  let p = 0;
  // North America
  p += 0.95 * gaussianLobe(lonDeg, latDeg, -104, 46, 26, 17, -0.3);
  p += 0.55 * gaussianLobe(lonDeg, latDeg, -88, 23, 11, 10, -0.5);
  p += 0.50 * gaussianLobe(lonDeg, latDeg, -142, 62, 16, 7, 0.2);
  // Greenland
  p += 0.72 * gaussianLobe(lonDeg, latDeg, -42, 72, 14, 9, 0.25);
  // South America
  p += 1.05 * gaussianLobe(lonDeg, latDeg, -60, -14, 15, 19, -0.22);
  p += 0.52 * gaussianLobe(lonDeg, latDeg, -67, -38, 7, 13, 0.1);
  // Africa
  p += 1.05 * gaussianLobe(lonDeg, latDeg, 16, 14, 22, 15, 0.08);
  p += 0.92 * gaussianLobe(lonDeg, latDeg, 25, -14, 13, 17, -0.1);
  // Europe
  p += 0.85 * gaussianLobe(lonDeg, latDeg, 16, 51, 20, 10, 0.12);
  p += 0.48 * gaussianLobe(lonDeg, latDeg, 16, 63, 12, 6, 0.4);
  // Eurasia / Asia
  p += 1.15 * gaussianLobe(lonDeg, latDeg, 86, 54, 46, 17, -0.05);
  p += 0.92 * gaussianLobe(lonDeg, latDeg, 104, 31, 22, 13, 0.2);
  p += 0.65 * gaussianLobe(lonDeg, latDeg, 78, 20, 10, 10, 0);
  p += 0.58 * gaussianLobe(lonDeg, latDeg, 46, 24, 11, 8, -0.35);
  // Indonesia / Japan archipelago hints
  p += 0.44 * gaussianLobe(lonDeg, latDeg, 118, -2, 18, 5, -0.2);
  p += 0.42 * gaussianLobe(lonDeg, latDeg, 138, 37, 6, 9, 0.5);
  // Australia
  p += 0.95 * gaussianLobe(lonDeg, latDeg, 134, -25, 16, 11, -0.15);
  // Antarctica
  if (latDeg < -66) {
    p += Math.min(1.2, (-66 - latDeg) / 14);
  }
  return p;
}

export function createEarthTextures(maxAnisotropy: number): {
  surfaceMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  nightMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 512;

  const sCanvas = document.createElement('canvas');
  sCanvas.width = w;
  sCanvas.height = h;
  const sCtx = sCanvas.getContext('2d')!;
  const sImg = sCtx.createImageData(w, h);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(w, h);

  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;
  const rImg = rCtx.createImageData(w, h);

  const cCanvas = document.createElement('canvas');
  cCanvas.width = w;
  cCanvas.height = h;
  const cCtx = cCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(w, h);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = w;
  nCanvas.height = h;
  const nCtx = nCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(w, h);

  const periodX = 12;
  const periodY = 6;
  for (let y = 0; y < h; y++) {
    const vNorm = y / h;
    const latDeg = (0.5 - vNorm) * 180; // +90 north -> -90 south
    const absLat = Math.abs(latDeg) / 90; // 0 equator -> 1 poles
    for (let x = 0; x < w; x++) {
      const uNorm = x / w;
      const lonDeg = uNorm * 360 - 180;
      const u = uNorm * periodX;
      const v = vNorm * periodY;

      const macroNoise = fbmTileable(u, v, periodX, 5, 311);
      const detailNoise = fbmTileable(u * 2.5 + 1.7, v * 2.5 + 0.9, periodX * 2, 4, 577);
      const moisture = fbmTileable(u * 1.4 + 2.3, v * 1.4 + 1.1, periodX, 4, 719);

      const baseMask = earthContinentPotential(lonDeg, latDeg);
      const coastField = baseMask + (macroNoise - 0.5) * 0.62 + (detailNoise - 0.5) * 0.22;

      let r = 10;
      let g = 42;
      let b = 98;
      let bumpVal = 126;
      let roughVal = 158; // soft natural ocean reflectance without harsh hotspots
      let nightR = 0;
      let nightG = 0;
      let nightB = 0;

      const iceThreshold = 0.86 + (macroNoise - 0.5) * 0.14;

      if (absLat > iceThreshold) {
        // Polar ice sheet / pack ice
        r = 232;
        g = 240;
        b = 248;
        bumpVal = coastField > 0.55 ? 165 : 134;
        roughVal = 185;
      } else if (coastField > 0.54) {
        // Landmass
        const landHeight = Math.min(1, (coastField - 0.54) * 1.45 + (detailNoise - 0.35) * 0.45);
        const ridge = Math.max(0, detailNoise - 0.52) * 2.1;
        const elev = Math.min(1, landHeight * 0.65 + ridge * 0.55);

        bumpVal = Math.min(255, Math.round(138 + elev * 114));
        roughVal = 228;

        // Biome coloring: arid desert belt vs temperate/tropical forests vs alpine mountains
        const desertBelt = Math.exp(-Math.pow((absLat - 0.28) / 0.14, 2));
        const arid = Math.max(0, Math.min(1, desertBelt * 0.92 + (0.52 - moisture) * 1.25));

        if (elev > 0.72) {
          // High mountain rock & snow dusting
          const snow = Math.min(1, (elev - 0.72) / 0.25);
          r = Math.round(126 + snow * 102);
          g = Math.round(120 + snow * 108);
          b = Math.round(112 + snow * 120);
        } else if (absLat > 0.67) {
          // Sub-arctic boreal / tundra
          r = Math.round(74 + (1 - moisture) * 32);
          g = Math.round(88 + moisture * 22);
          b = Math.round(68 + (1 - moisture) * 18);
        } else {
          // Blend green forest/plains with warm desert earth
          const vegR = 38 + (1 - moisture) * 34;
          const vegG = 86 + moisture * 38;
          const vegB = 46 + (1 - moisture) * 18;

          const desR = 172 + detailNoise * 24;
          const desG = 148 + detailNoise * 18;
          const desB = 104 + detailNoise * 12;

          r = Math.round(vegR * (1 - arid) + desR * arid);
          g = Math.round(vegG * (1 - arid) + desG * arid);
          b = Math.round(vegB * (1 - arid) + desB * arid);
        }

        // Subtle urban night lights on temperate coastal / lowland regions
        if (absLat < 0.65 && elev < 0.45 && arid < 0.55) {
          const cityField = hash2D(x >> 1, y >> 1, 907);
          const metroCluster = fbmTileable(u * 3.0, v * 3.0, periodX * 2, 3, 1409);
          const coastBoost = coastField < 0.72 ? 1.25 : 0.75;
          if (cityField > 0.78 && metroCluster > 0.54) {
            const glow = Math.min(1, (cityField - 0.78) * 4.2 * coastBoost * (metroCluster - 0.45) * 2.2);
            nightR = Math.round(255 * glow);
            nightG = Math.round(196 * glow);
            nightB = Math.round(108 * glow);
          }
        }
      } else {
        // Deep ocean bathymetry + continental shelf turquoise
        const shelf = Math.max(0, Math.min(1, (coastField - 0.41) / 0.13));
        const trench = Math.max(0, Math.min(1, (0.35 - coastField) * 1.5));
        r = Math.round(6 + shelf * 24 - trench * 3);
        g = Math.round(34 + shelf * 76 - trench * 12);
        b = Math.round(96 + shelf * 56 - trench * 24);
        bumpVal = 124;
        roughVal = 158;
      }

      const idx = (y * w + x) * 4;
      sImg.data[idx] = r;
      sImg.data[idx + 1] = g;
      sImg.data[idx + 2] = b;
      sImg.data[idx + 3] = 255;

      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;

      nImg.data[idx] = nightR;
      nImg.data[idx + 1] = nightG;
      nImg.data[idx + 2] = nightB;
      nImg.data[idx + 3] = 255;

      // Realistic trade-wind & mid-latitude swirling cloud systems
      const swirl = fbmTileable(u * 1.15 + 0.7, v * 1.7, periodX * 2, 4, 991);
      const band = fbmTileable(
        u * 0.9 + swirl * 0.75 + Math.sin(vNorm * Math.PI * 3) * 0.18,
        v * 1.5,
        periodX * 2,
        5,
        1217
      );
      const polarClouds = absLat > 0.72 ? 0.06 : 0;
      const cloudAlpha = Math.max(0, Math.min(240, Math.round((band + polarClouds - 0.505) * 690)));
      cImg.data[idx] = 248;
      cImg.data[idx + 1] = 251;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = cloudAlpha;
    }
  }

  sCtx.putImageData(sImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  cCtx.putImageData(cImg, 0, 0);
  nCtx.putImageData(nImg, 0, 0);

  const surfaceMap = new THREE.CanvasTexture(sCanvas);
  surfaceMap.colorSpace = THREE.SRGBColorSpace;
  surfaceMap.wrapS = THREE.RepeatWrapping;
  surfaceMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  const cloudMap = new THREE.CanvasTexture(cCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.wrapS = THREE.RepeatWrapping;
  cloudMap.anisotropy = maxAnisotropy;

  const nightMap = new THREE.CanvasTexture(nCanvas);
  nightMap.colorSpace = THREE.SRGBColorSpace;
  nightMap.wrapS = THREE.RepeatWrapping;
  nightMap.anisotropy = maxAnisotropy;

  return { surfaceMap, bumpMap, roughnessMap, cloudMap, nightMap };
}

export function createMoonSphereTextures(maxAnisotropy: number): {
  surfaceMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 512;

  const sCanvas = document.createElement('canvas');
  sCanvas.width = w;
  sCanvas.height = h;
  const sCtx = sCanvas.getContext('2d')!;
  const sImg = sCtx.createImageData(w, h);

  const bCanvas = document.createElement('canvas');
  bCanvas.width = w;
  bCanvas.height = h;
  const bCtx = bCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(w, h);

  const periodX = 12;
  const periodY = 6;

  // Major lunar maria (dark basaltic basins resembling Tranquillitatis, Serenitatis, Imbrium, Procellarum)
  const maria = [
    { lon: -24, lat: 32, rx: 24, ry: 20, depth: 0.95 }, // Imbrium
    { lon: -48, lat: 14, rx: 26, ry: 26, depth: 0.88 }, // Procellarum
    { lon: 18, lat: 26, rx: 14, ry: 13, depth: 0.9 }, // Serenitatis
    { lon: 30, lat: 8, rx: 16, ry: 14, depth: 0.85 }, // Tranquillitatis
    { lon: 48, lat: -6, rx: 14, ry: 12, depth: 0.82 }, // Fecunditatis
    { lon: -22, lat: -22, rx: 15, ry: 12, depth: 0.78 }, // Nubium
    { lon: 155, lat: -18, rx: 22, ry: 18, depth: 0.45 }, // South Pole-Aitken subtle darkening
  ];

  for (let y = 0; y < h; y++) {
    const vNorm = y / h;
    const latDeg = (0.5 - vNorm) * 180;
    for (let x = 0; x < w; x++) {
      const uNorm = x / w;
      const lonDeg = uNorm * 360 - 180;
      const u = uNorm * periodX;
      const v = vNorm * periodY;

      const macro = fbmTileable(u, v, periodX, 5, 2111);
      const micro = fbmTileable(u * 3.0, v * 3.0, periodX * 2, 4, 2441);

      let mareWeight = 0;
      for (const m of maria) {
        mareWeight += m.depth * gaussianLobe(lonDeg, latDeg, m.lon, m.lat, m.rx, m.ry, 0.2);
      }
      mareWeight = Math.max(0, Math.min(1, mareWeight + (macro - 0.5) * 0.35 - 0.25));

      // Highlands brighter anorthosite (~168-195), maria darker basalt (~78-105)
      const baseAlbedo = 176 * (1 - mareWeight * 0.54) + (macro - 0.5) * 28 + (micro - 0.5) * 18;
      const val = Math.max(48, Math.min(230, Math.round(baseAlbedo)));
      const bump = Math.max(
        40,
        Math.min(240, Math.round(135 - mareWeight * 36 + (macro - 0.5) * 48 + (micro - 0.5) * 32))
      );

      const idx = (y * w + x) * 4;
      sImg.data[idx] = val;
      sImg.data[idx + 1] = val;
      sImg.data[idx + 2] = Math.min(255, val + 2);
      sImg.data[idx + 3] = 255;

      bImg.data[idx] = bump;
      bImg.data[idx + 1] = bump;
      bImg.data[idx + 2] = bump;
      bImg.data[idx + 3] = 255;
    }
  }
  sCtx.putImageData(sImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  // Add realistic lunar craters + Tycho-style bright ejecta ray systems
  const rng = makeSeededRng(7331);
  for (let c = 0; c < 135; c++) {
    const cx = rng() * w;
    const cy = (0.08 + rng() * 0.84) * h;
    const rad = c < 14 ? 14 + rng() * 20 : 3 + rng() * 10;

    if (c < 5) {
      // Bright ejecta rays on major young craters
      sCtx.save();
      sCtx.strokeStyle = 'rgba(228,232,238,0.22)';
      sCtx.lineWidth = 1.6;
      for (let ray = 0; ray < 9; ray++) {
        const ang = (ray / 9) * Math.PI * 2 + rng() * 0.4;
        const len = rad * (2.6 + rng() * 2.4);
        sCtx.beginPath();
        sCtx.moveTo(cx + Math.cos(ang) * rad * 0.85, cy + Math.sin(ang) * rad * 0.85);
        sCtx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        sCtx.stroke();
      }
      sCtx.restore();
    }

    drawTileableDisc(sCtx, w, cx, cy, rad, (px, py) => {
      const g = sCtx.createRadialGradient(px, py, rad * 0.1, px, py, rad);
      g.addColorStop(0, 'rgba(62,65,72,0.42)');
      g.addColorStop(0.68, 'rgba(128,132,140,0.18)');
      g.addColorStop(0.86, 'rgba(218,222,228,0.26)');
      g.addColorStop(1, 'rgba(150,154,160,0)');
      return g;
    });

    drawTileableDisc(bCtx, w, cx, cy, rad, (px, py) => {
      const g = bCtx.createRadialGradient(px, py, rad * 0.08, px, py, rad);
      g.addColorStop(0, 'rgba(24,24,24,0.62)');
      g.addColorStop(0.7, 'rgba(110,110,110,0.32)');
      g.addColorStop(0.88, 'rgba(220,220,220,0.46)');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      return g;
    });
  }

  const surfaceMap = new THREE.CanvasTexture(sCanvas);
  surfaceMap.colorSpace = THREE.SRGBColorSpace;
  surfaceMap.wrapS = THREE.RepeatWrapping;
  surfaceMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  return { surfaceMap, bumpMap };
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export type RoverMood = 'happy' | 'curious' | 'scanning' | 'alert' | 'charging' | 'victory';

export function drawRoverFaceTexture(
  canvas: HTMLCanvasElement,
  mood: RoverMood,
  blink = false
) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#091322';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle =
    mood === 'alert'
      ? '#f59e0b'
      : mood === 'victory'
      ? '#34d399'
      : mood === 'scanning'
      ? '#38bdf8'
      : '#60a5fa';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  const eyeColor =
    mood === 'alert'
      ? '#fbbf24'
      : mood === 'victory'
      ? '#34d399'
      : mood === 'charging'
      ? '#a3e635'
      : '#38bdf8';

  ctx.fillStyle = eyeColor;
  ctx.strokeStyle = eyeColor;

  if (blink) {
    ctx.fillRect(46, 58, 42, 8);
    ctx.fillRect(168, 58, 42, 8);
  } else if (mood === 'happy' || mood === 'victory') {
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(68, 66, 18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(188, 66, 18, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (mood === 'alert') {
    ctx.beginPath();
    ctx.arc(68, 60, 14, 0, Math.PI * 2);
    ctx.arc(188, 60, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(48, 42, 38, 36, 10);
    ctx.roundRect(170, 42, 38, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(74, 52, 6, 0, Math.PI * 2);
    ctx.arc(196, 52, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'alert') {
    ctx.moveTo(96, 102);
    ctx.lineTo(160, 102);
  } else if (mood === 'scanning') {
    ctx.arc(128, 98, 12, 0, Math.PI * 2);
  } else {
    ctx.arc(128, 92, 24, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
}

export function createSolarPanelTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1f3f';
  ctx.fillRect(0, 0, size, size);

  // Thin silicon cell busbars
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
  }

  // Primary module grid
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 4; i++) {
    const p = (i / 4) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
