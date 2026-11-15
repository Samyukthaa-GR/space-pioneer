import { BoulderObstacle, OutpostSite, RockTarget } from './types';

export const WORLD_RADIUS = 64;
export const ROVER_SPAWN = { x: 0, z: 10 };

// Permanently shadowed craters inspired by Shackleton & lunar South Pole cold traps
export const SHADOWED_CRATERS = [
  { id: 'shackleton_rim_pocket', name: 'Deep Shadow Crater', x: -22, z: -16, radius: 13.5, depth: 3.6 },
  { id: 'cold_basin_east', name: 'Frost Pocket Crater', x: 26, z: -20, radius: 10.0, depth: 2.6 },
] as const;

// Sunlit elevated ridge inspired by South Pole "Peaks of Eternal Light"
export const SUNLIT_RIDGE = { x: 20, z: 16, radius: 12 };

export const OUTPOST_SITES: OutpostSite[] = [
  {
    id: 'ridge_haven',
    name: 'Sunlit Peak Ridge',
    x: 20,
    z: 16,
    sunlightScore: 92,
    description: 'High sunlit ridge that stays bright for long stretches of the lunar month.',
    tradeoffNote: 'Strong solar power and flat ground, farther from dark craters.',
  },
  {
    id: 'crater_rim_shadow',
    name: 'Shadow Rim Terrace',
    x: -10,
    z: -4,
    sunlightScore: 44,
    description: 'Cold terrace right next to Deep Shadow Crater.',
    tradeoffNote: 'Quick trips to water clues, but solar panels get much less light!',
  },
];

export const BOULDERS: BoulderObstacle[] = [
  { id: 'boulder_1', x: 6.5, z: 5.5, radius: 1.85, height: 1.65, kind: 'angular' },
  { id: 'boulder_2', x: -7.5, z: 4.5, radius: 2.1, height: 1.9, kind: 'cluster' },
  { id: 'boulder_3', x: -16.2, z: 0.5, radius: 2.3, height: 2.2, kind: 'ridge_rock' },
  { id: 'boulder_4', x: 11.5, z: 11.5, radius: 2.0, height: 1.75, kind: 'angular' },
  { id: 'boulder_5', x: 14.0, z: -4.0, radius: 2.4, height: 2.3, kind: 'cluster' },
  { id: 'boulder_6', x: -4.5, z: -14.0, radius: 2.2, height: 1.85, kind: 'angular' },
  { id: 'boulder_7', x: 3.0, z: -9.5, radius: 1.75, height: 1.5, kind: 'ridge_rock' },
  { id: 'boulder_8', x: -24.0, z: 6.0, radius: 2.5, height: 2.4, kind: 'cluster' },
  { id: 'boulder_9', x: 25.0, z: 4.0, radius: 2.1, height: 1.9, kind: 'angular' },
  { id: 'boulder_10', x: -12.0, z: 19.0, radius: 2.2, height: 2.0, kind: 'ridge_rock' },
];

export const LOOSE_REGOLITH_PATCHES = [
  { id: 'reg_patch_a', x: -8, z: -8, radius: 5.5 },
  { id: 'reg_patch_b', x: 9, z: -10, radius: 5.0 },
  { id: 'reg_patch_c', x: -15, z: 12, radius: 4.8 },
];

export const ROCK_TARGETS: RockTarget[] = [
  {
    id: 'rock_tutorial_basalt',
    name: 'Dark Mare Basalt',
    x: 4.2,
    z: 14.2,
    phase: 1,
    kind: 'basalt',
    shortLabel: 'Nearby Basalt Rock',
    scienceTitle: 'Ancient Volcanic Moon Rock',
    scienceFact:
      'Dark lunar basalt formed billions of years ago when ancient Moon lava cooled into rock.',
    astroReaction: 'Woohoo! That dark rock is ancient frozen Moon lava called basalt!',
    resourceReward: { sciencePoints: 15 },
  },
  {
    id: 'rock_highland_anorthosite',
    name: 'Bright Highland Rock',
    x: -11.5,
    z: 10.5,
    phase: 1,
    kind: 'anorthosite',
    shortLabel: 'Highland Anorthosite',
    scienceTitle: 'The Moon’s Oldest Crust',
    scienceFact:
      'Bright anorthosite rocks come from the Moon’s very first crust, over 4 billion years old!',
    astroReaction: 'Awesome scan! This bright rock is older than Earth’s continents!',
    resourceReward: { sciencePoints: 20 },
  },
  {
    id: 'target_crater_hydrogen',
    name: 'Deep Shadow Ice Probe',
    x: -20.5,
    z: -15.5,
    phase: 2,
    kind: 'hydrogen_clue',
    shortLabel: 'Ice Investigation Spot',
    scienceTitle: 'Hydrogen Clues in the Cold Dark!',
    scienceFact:
      'Instruments spotted hydrogen signals here! Hydrogen is a strong clue for frozen water, though we must drill and process samples to confirm usable ice.',
    astroReaction: 'Commander, look what we found! There might be frozen water here. Astronauts will need water to survive!',
    resourceReward: { iceCoreSamples: 2, waterIceClues: 1, sciencePoints: 25 },
  },
  {
    id: 'target_frost_pocket_dry',
    name: 'Frost Pocket Probe',
    x: 24.5,
    z: -18.5,
    phase: 2,
    kind: 'dry_crater_probe',
    shortLabel: 'Dry Crater Check',
    scienceTitle: 'Dry Regolith Surprise!',
    scienceFact:
      'Even in dark cold craters, not every spot holds accessible water ice! Real explorers test multiple spots to be sure.',
    astroReaction: 'Aha! Just dry dust in this pocket—that is why scientists investigate before building!',
    resourceReward: { rawSoil: 1, sciencePoints: 20 },
  },
  {
    id: 'target_regolith_1',
    name: 'Fine Lunar Regolith Bed',
    x: 9.0,
    z: -9.5,
    phase: 2,
    kind: 'regolith_loose',
    shortLabel: 'Soil Scoop Site A',
    scienceTitle: 'Lunar Soil Sample Collected!',
    scienceFact:
      'Moon soil (regolith) is crushed rock powder we can bake into thick radiation shields for our base!',
    astroReaction: 'Scoop complete! Let us turn this Moon soil into super-strong building bricks!',
    resourceReward: { rawSoil: 2, sciencePoints: 15 },
  },
  {
    id: 'target_regolith_2',
    name: 'Ridge Regolith Deposit',
    x: 15.5,
    z: 8.0,
    phase: 2,
    kind: 'regolith_loose',
    shortLabel: 'Soil Scoop Site B',
    scienceTitle: 'Extra Building Soil!',
    scienceFact:
      'Collecting extra soil lets us build thick regolith walls that protect astronauts from space particles.',
    astroReaction: 'Cargo bay loaded! Extra Moon soil means stronger shielding walls later!',
    resourceReward: { rawSoil: 2, sciencePoints: 15 },
  },
  {
    id: 'target_sunlight_ridge',
    name: 'Solar Ridge Beacon',
    x: 20.0,
    z: 16.0,
    phase: 2,
    kind: 'sunlight_beacon',
    shortLabel: 'Solar Test Ridge',
    scienceTitle: 'South Pole Sunlight Surveyed!',
    scienceFact:
      'Because the Sun skims low at the South Pole, tilting solar panels nearly upright catches tons of steady power!',
    astroReaction: 'Whoa, 92% sunlight up here! Tilting the panel really boosted our solar power!',
    resourceReward: { solarSurveyCount: 1, sunlightData: 2, sciencePoints: 20 },
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function craterProfile(
  dx: number,
  dz: number,
  radius: number,
  depth: number,
  entryRampAngleRad?: number
): number {
  const r = Math.hypot(dx, dz);
  if (r > radius * 1.48) return 0;
  const norm = r / radius;

  // Natural gentle breached entry ramp along a crater sector so rovers can safely drive in
  let rampWeight = 0;
  if (entryRampAngleRad !== undefined && r > 0.25) {
    const theta = Math.atan2(dz, dx);
    const dTheta = Math.atan2(Math.sin(theta - entryRampAngleRad), Math.cos(theta - entryRampAngleRad));
    const angularFactor = 1 - smoothstep(0.18, 0.62, Math.abs(dTheta));
    // Fade the ramp modulation cleanly toward the deep center and far outer apron
    const radialFactor = smoothstep(0.08, 0.32, norm) * (1 - smoothstep(1.08, 1.44, norm));
    rampWeight = angularFactor * radialFactor;
  }

  if (norm < 1.0) {
    // Terraced inner crater bowl inspired by LRO South Pole crater profiles
    const steepBowl = Math.pow(norm, 2.15) - 1.0;
    const gentleBowl = norm * 0.92 - 0.96;
    const bowl = steepBowl * (1 - rampWeight * 0.85) + gentleBowl * (rampWeight * 0.85);
    const terrace = Math.sin(norm * Math.PI * 3.0) * 0.045 * (1 - norm) * (1 - rampWeight * 0.9);
    const rim = Math.exp(-Math.pow((norm - 1.0) / 0.17, 2)) * 0.31 * (1 - rampWeight);
    return depth * (bowl * 0.88 + terrace + rim);
  }
  const rimFade = Math.exp(-Math.pow((norm - 1.0) / 0.24, 2)) * 0.31 * (1 - rampWeight);
  return depth * rimFade;
}

/**
 * Deterministic LRO-inspired South Pole elevation field.
 */
export function getTerrainHeight(x: number, z: number): number {
  let h =
    Math.sin(x * 0.065) * Math.cos(z * 0.055) * 0.68 +
    Math.sin(x * 0.14 + z * 0.11) * 0.24 +
    Math.cos(x * 0.27 - z * 0.21) * 0.08 +
    Math.sin(x * 0.45 - z * 0.38) * 0.035;

  // Sunlit Peak Ridge elevation around (20, 16)
  const ridgeDist = Math.hypot(x - SUNLIT_RIDGE.x, z - SUNLIT_RIDGE.z);
  h += (1 - smoothstep(0, SUNLIT_RIDGE.radius * 1.25, ridgeDist)) * 2.25;

  // Keep spawn area around (0, 10) gently flat for safe landing & tutorial
  const spawnDist = Math.hypot(x - ROVER_SPAWN.x, z - ROVER_SPAWN.z);
  const spawnFlat = smoothstep(3.5, 9.5, spawnDist);
  h *= 0.22 + 0.78 * spawnFlat;

  // Permanently shadowed craters (each with a natural gentle entry ramp facing the central plain)
  for (const crater of SHADOWED_CRATERS) {
    const entryAngle =
      crater.id === 'shackleton_rim_pocket'
        ? Math.atan2(10 - crater.z, 0 - crater.x)
        : Math.atan2(-10 - crater.z, 9 - crater.x);
    h += craterProfile(x - crater.x, z - crater.z, crater.radius, crater.depth, entryAngle);
  }

  // Secondary realistic impact craters across South Pole terrain
  const microCraters = [
    { x: -16, z: 22, r: 5.5, d: 1.1 },
    { x: 10, z: -24, r: 6.2, d: 1.3 },
    { x: -32, z: -4, r: 7.0, d: 1.45 },
    { x: 34, z: 12, r: 6.5, d: 1.25 },
    { x: -3, z: -22, r: 4.5, d: 0.95 },
    { x: 24, z: 30, r: 5.0, d: 1.0 },
    { x: -28, z: 24, r: 4.2, d: 0.85 },
  ];
  for (const c of microCraters) {
    h += craterProfile(x - c.x, z - c.z, c.r, c.d);
  }

  // Natural South Pole mountain massif ring beyond radius 42m
  const radial = Math.hypot(x, z);
  if (radial > 42) {
    const t = smoothstep(42, 62, radial);
    const ridgeNoise =
      0.72 +
      0.22 * Math.sin(Math.atan2(z, x) * 7 + radial * 0.12) +
      0.12 * Math.cos(Math.atan2(z, x) * 13 - radial * 0.08);
    h += t * 8.2 * ridgeNoise;
  }

  return h;
}

export function getTerrainSlopeDeg(x: number, z: number): number {
  const eps = 0.6;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);
  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  const grad = Math.hypot(dx, dz);
  return (Math.atan(grad) * 180) / Math.PI;
}

export function getTerrainNormal(x: number, z: number): { nx: number; ny: number; nz: number } {
  const eps = 0.5;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);
  const vx = hL - hR;
  const vy = 2 * eps;
  const vz = hD - hU;
  const len = Math.hypot(vx, vy, vz) || 1;
  return { nx: vx / len, ny: vy / len, nz: vz / len };
}

export function isInShadowedCrater(x: number, z: number): boolean {
  for (const crater of SHADOWED_CRATERS) {
    if (Math.hypot(x - crater.x, z - crater.z) <= crater.radius * 0.82) {
      return true;
    }
  }
  return false;
}

export function getSunlightFactor(x: number, z: number): number {
  for (const crater of SHADOWED_CRATERS) {
    const d = Math.hypot(x - crater.x, z - crater.z);
    if (d < crater.radius * 0.95) {
      const t = smoothstep(crater.radius * 0.45, crater.radius * 0.95, d);
      return 0.05 + t * 0.55;
    }
  }
  const ridgeDist = Math.hypot(x - SUNLIT_RIDGE.x, z - SUNLIT_RIDGE.z);
  const ridgeBoost = (1 - smoothstep(0, SUNLIT_RIDGE.radius, ridgeDist)) * 0.18;
  return Math.min(1, 0.82 + ridgeBoost);
}

export function isOnLooseRegolith(x: number, z: number): boolean {
  return LOOSE_REGOLITH_PATCHES.some((p) => Math.hypot(x - p.x, z - p.z) <= p.radius);
}
