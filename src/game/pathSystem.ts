import {
  BOULDERS,
  WORLD_RADIUS,
  getTerrainHeight,
  getTerrainSlopeDeg,
  isOnLooseRegolith,
} from './lunarTerrain';
import {
  BoulderObstacle,
  PathPoint3D,
  PathValidationResult,
  Point2D,
} from './types';

export const ROVER_SAFE_SLOPE_DEG = 24;
export const ROVER_CLEARANCE_PAD = 1.15;
export const ENERGY_PER_METER = 0.72;
export const MAX_START_ANCHOR_DIST = 5.5;

export function resamplePath(points: Point2D[], spacing = 1.1): Point2D[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];

  const result: Point2D[] = [{ ...points[0] }];
  let carry = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segLen = Math.hypot(curr.x - prev.x, curr.z - prev.z);
    if (segLen < 1e-4) continue;

    let dist = spacing - carry;
    while (dist <= segLen) {
      const t = dist / segLen;
      result.push({
        x: prev.x + (curr.x - prev.x) * t,
        z: prev.z + (curr.z - prev.z) * t,
      });
      dist += spacing;
    }
    carry = segLen - (dist - spacing);
  }

  const last = points[points.length - 1];
  const tail = result[result.length - 1];
  if (Math.hypot(last.x - tail.x, last.z - tail.z) > 0.25) {
    result.push({ ...last });
  }
  return result;
}

export function validateRoverPath(
  rawPoints: Point2D[],
  roverPos: Point2D,
  availableEnergy: number,
  obstacles: BoulderObstacle[] = BOULDERS,
  options?: { dustLevel?: number }
): PathValidationResult {
  if (rawPoints.length < 2) {
    return {
      valid: false,
      reasonCode: 'too_short',
      childMessage: 'Draw a longer line from your rover to where you want it to explore.',
      hintAction: 'Click near your rover and drag across the Moon surface.',
      sampledPoints: [],
      invalidSegmentIndices: [],
      estimatedDistanceM: 0,
      estimatedTimeSec: 0,
      estimatedEnergyCost: 0,
      traversesRoughRegolith: false,
    };
  }

  const startDist = Math.hypot(rawPoints[0].x - roverPos.x, rawPoints[0].z - roverPos.z);
  const anchoredRaw: Point2D[] =
    startDist <= MAX_START_ANCHOR_DIST
      ? [{ x: roverPos.x, z: roverPos.z }, ...rawPoints]
      : rawPoints;

  const resampled = resamplePath(anchoredRaw, 1.0);
  const sampledPoints: PathPoint3D[] = [];
  const invalidSegmentIndices: number[] = [];

  let totalDistance = 0;
  let boulderHitId: string | undefined;
  let hasSteepSlope = false;
  let hasBoundaryHazard = false;
  let traversesRoughRegolith = false;

  for (let i = 0; i < resampled.length; i++) {
    const pt = resampled[i];
    if (i > 0) {
      totalDistance += Math.hypot(pt.x - resampled[i - 1].x, pt.z - resampled[i - 1].z);
    }

    const y = getTerrainHeight(pt.x, pt.z);
    const slopeDeg = getTerrainSlopeDeg(pt.x, pt.z);
    let valid = true;
    let issue: PathPoint3D['issue'];

    // Check boulder collisions
    for (const b of obstacles) {
      const distToBoulder = Math.hypot(pt.x - b.x, pt.z - b.z);
      if (distToBoulder < b.radius + ROVER_CLEARANCE_PAD) {
        valid = false;
        issue = 'boulder';
        if (!boulderHitId) boulderHitId = b.id;
        break;
      }
    }

    // Check steep slope
    if (valid && slopeDeg > ROVER_SAFE_SLOPE_DEG) {
      valid = false;
      issue = 'slope';
      hasSteepSlope = true;
    }

    // Check world cliff perimeter
    if (valid && Math.hypot(pt.x, pt.z) > WORLD_RADIUS - 18) {
      valid = false;
      issue = 'hazard';
      hasBoundaryHazard = true;
    }

    if (isOnLooseRegolith(pt.x, pt.z)) {
      traversesRoughRegolith = true;
    }

    if (!valid) {
      invalidSegmentIndices.push(i);
    }

    sampledPoints.push({ x: pt.x, y, z: pt.z, slopeDeg, valid, issue });
  }

  if (totalDistance < 2.0) {
    return {
      valid: false,
      reasonCode: 'too_short',
      childMessage: 'That path is a tiny bit too short! Drag a little farther across the ground.',
      hintAction: 'Drag your line at least a few steps away from your rover.',
      sampledPoints,
      invalidSegmentIndices,
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec: Math.max(1, Math.round(totalDistance / 3.2)),
      estimatedEnergyCost: Math.round(totalDistance * ENERGY_PER_METER),
      traversesRoughRegolith,
    };
  }

  if (startDist > MAX_START_ANCHOR_DIST) {
    return {
      valid: false,
      reasonCode: 'disconnected_start',
      childMessage: 'Oops! Start drawing right next to your rover so it knows how to join the path.',
      hintAction: 'Click near the glowing ring around your rover and drag outward.',
      sampledPoints,
      invalidSegmentIndices: sampledPoints.map((_, idx) => idx),
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec: Math.round(totalDistance / 3.2),
      estimatedEnergyCost: Math.round(totalDistance * ENERGY_PER_METER),
      traversesRoughRegolith,
    };
  }

  const dustMultiplier = 1 + ((options?.dustLevel ?? 0) / 100) * 0.25;
  const estimatedEnergyCost = Math.ceil(totalDistance * ENERGY_PER_METER * dustMultiplier);
  const estimatedTimeSec = Math.max(1, Math.round(totalDistance / 3.2));

  if (boulderHitId) {
    return {
      valid: false,
      reasonCode: 'boulder_collision',
      childMessage:
        "Oops! There's a big rock in the way. Your rover cannot drive through it. Try drawing a path around the rock.",
      hintAction: 'Tap Clear Path or Redraw and curve around the red rock highlight.',
      sampledPoints,
      invalidSegmentIndices,
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec,
      estimatedEnergyCost,
      traversesRoughRegolith,
      blockedByBoulderId: boulderHitId,
    };
  }

  if (hasSteepSlope) {
    return {
      valid: false,
      reasonCode: 'steep_slope',
      childMessage:
        "This hill is too steep for your rover. Let's choose a gentler path.",
      hintAction: 'Curve along flatter ground instead of straight up or down the steep crater wall.',
      sampledPoints,
      invalidSegmentIndices,
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec,
      estimatedEnergyCost,
      traversesRoughRegolith,
    };
  }

  if (hasBoundaryHazard) {
    return {
      valid: false,
      reasonCode: 'hazard_zone',
      childMessage:
        'That route reaches the steep outer mountain rim! Stay inside the explored South Pole valley.',
      hintAction: 'Keep your route inside the crater basin and sunlit ridge area.',
      sampledPoints,
      invalidSegmentIndices,
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec,
      estimatedEnergyCost,
      traversesRoughRegolith,
    };
  }

  if (estimatedEnergyCost > availableEnergy) {
    // Mark tail points exceeding energy budget in red
    let runningDist = 0;
    const energyInvalid: number[] = [];
    for (let i = 1; i < sampledPoints.length; i++) {
      runningDist += Math.hypot(
        sampledPoints[i].x - sampledPoints[i - 1].x,
        sampledPoints[i].z - sampledPoints[i - 1].z
      );
      if (runningDist * ENERGY_PER_METER * dustMultiplier > availableEnergy) {
        sampledPoints[i].valid = false;
        sampledPoints[i].issue = 'energy';
        energyInvalid.push(i);
      }
    }
    return {
      valid: false,
      reasonCode: 'insufficient_energy',
      childMessage:
        'Your rover may run out of power before reaching the destination. Try a shorter route.',
      hintAction: 'Draw a shorter trip, or recharge in the sunlight first.',
      sampledPoints,
      invalidSegmentIndices: energyInvalid,
      estimatedDistanceM: Math.round(totalDistance),
      estimatedTimeSec,
      estimatedEnergyCost,
      traversesRoughRegolith,
    };
  }

  return {
    valid: true,
    reasonCode: 'ok',
    childMessage: 'Great! This path looks safe. Your rover is ready to go!',
    hintAction: 'Press START to watch your rover drive along your route.',
    sampledPoints,
    invalidSegmentIndices: [],
    estimatedDistanceM: Math.round(totalDistance),
    estimatedTimeSec,
    estimatedEnergyCost,
    traversesRoughRegolith,
  };
}

export function checkDynamicObstacleAhead(
  roverPos: Point2D,
  headingRad: number,
  obstacles: BoulderObstacle[] = BOULDERS
): BoulderObstacle | null {
  const lookX = roverPos.x + Math.sin(headingRad) * 2.2;
  const lookZ = roverPos.z + Math.cos(headingRad) * 2.2;

  for (const b of obstacles) {
    const dNow = Math.hypot(roverPos.x - b.x, roverPos.z - b.z);
    const dAhead = Math.hypot(lookX - b.x, lookZ - b.z);
    if (dNow < b.radius + 1.05 || dAhead < b.radius + 0.85) {
      return b;
    }
  }
  return null;
}
