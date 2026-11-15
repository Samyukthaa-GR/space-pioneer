import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOULDERS,
  ROCK_TARGETS,
  ROVER_SPAWN,
  SHADOWED_CRATERS,
  getSunlightFactor,
  getTerrainHeight,
  getTerrainSlopeDeg,
} from './lunarTerrain';
import { checkDynamicObstacleAhead, resamplePath, validateRoverPath } from './pathSystem';
import {
  EXTRA_NASA_REFERENCES,
  MOON_TOUR_TOPICS,
  ROVER_PARTS,
  getNasaMediaForTargetKind,
} from './nasaMedia';
import { PHASE_TUTORIALS } from './missionData';
import {
  SAVE_STORAGE_KEY,
  canAffordStructure,
  computePhase3BuildStage,
  computeSolarCollectorWatts,
  computeStructureEfficiency,
  createInitialGameState,
  evaluatePlacementSuitability,
  getNeededConnectionTargets,
  getOutpostEquipmentStatus,
  getOutpostPowerBalance,
  getPhaseMissionSteps,
  getProgressiveBuildUnlockSet,
  getRecommendedOutpostSlots,
  getRequiredPhase3Types,
  isPhaseComplete,
  loadSavedGameState,
  spendResourcesForStructure,
  tickPhase4Simulation,
  getPhase4RelevantSystems,
} from './rules';

test('terrain height & sunlight behave deterministically at South Pole landmarks', () => {
  const spawnY = getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z);
  const spawnSlope = getTerrainSlopeDeg(ROVER_SPAWN.x, ROVER_SPAWN.z);
  assert.ok(Number.isFinite(spawnY));
  assert.ok(spawnSlope < 12, `Spawn slope should be gentle, got ${spawnSlope}`);

  const crater = SHADOWED_CRATERS[0];
  const craterSun = getSunlightFactor(crater.x, crater.z);
  const ridgeSun = getSunlightFactor(20, 16);
  assert.ok(craterSun < 0.2, `Shadowed crater should be dark, got ${craterSun}`);
  assert.ok(ridgeSun > 0.85, `Sunlit ridge should be bright, got ${ridgeSun}`);

  // Dry crater probe exists alongside hydrogen clue crater probe
  assert.ok(ROCK_TARGETS.some((t) => t.kind === 'dry_crater_probe'));
  assert.ok(ROCK_TARGETS.some((t) => t.kind === 'hydrogen_clue'));
});

test('resamplePath produces evenly spaced waypoints', () => {
  const pts = resamplePath(
    [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
    ],
    2.0
  );
  assert.ok(pts.length >= 6);
  assert.equal(pts[0].x, 0);
  assert.equal(pts[pts.length - 1].x, 10);
});

test('validateRoverPath accepts safe open route and rejects boulder, slope, and energy violations', () => {
  const safe = validateRoverPath(
    [
      { x: 0, z: 10 },
      { x: -1, z: 4 },
      { x: -2, z: -2 },
    ],
    ROVER_SPAWN,
    100
  );
  assert.equal(safe.valid, true);
  assert.equal(safe.reasonCode, 'ok');
  assert.ok(safe.sampledPoints.length > 4);

  const b1 = BOULDERS[0];
  const boulderHit = validateRoverPath(
    [
      { x: ROVER_SPAWN.x, z: ROVER_SPAWN.z },
      { x: b1.x, z: b1.z },
    ],
    ROVER_SPAWN,
    100
  );
  assert.equal(boulderHit.valid, false);
  assert.equal(boulderHit.reasonCode, 'boulder_collision');
  assert.ok(boulderHit.invalidSegmentIndices.length > 0);
  assert.match(boulderHit.childMessage, /big rock in the way/i);

  const lowEnergy = validateRoverPath(
    [
      { x: ROVER_SPAWN.x, z: ROVER_SPAWN.z },
      { x: 0, z: -15 },
    ],
    ROVER_SPAWN,
    4
  );
  assert.equal(lowEnergy.valid, false);
  assert.equal(lowEnergy.reasonCode, 'insufficient_energy');
  assert.match(lowEnergy.childMessage, /run out of power/i);

  const disconnected = validateRoverPath(
    [
      { x: 25, z: 25 },
      { x: 30, z: 25 },
    ],
    ROVER_SPAWN,
    100
  );
  assert.equal(disconnected.valid, false);
  assert.equal(disconnected.reasonCode, 'disconnected_start');
});

test('checkDynamicObstacleAhead detects boulder directly in rover path', () => {
  const b1 = BOULDERS[0];
  const hit = checkDynamicObstacleAhead({ x: b1.x, z: b1.z + b1.radius + 0.5 }, Math.PI);
  assert.ok(hit !== null);
  assert.equal(hit?.id, b1.id);
});

test('solar collector tilt, placement suitability, connections & Phase 2-4 completion work end-to-end', () => {
  const state = createInitialGameState(true);
  assert.equal(state.roverName, 'ASTRO');
  assert.equal(isPhaseComplete(state), false);
  assert.equal(canAffordStructure(state.resources, 'habitat'), true);

  const afterHab = spendResourcesForStructure(state.resources, 'habitat');
  assert.equal(afterHab.regolith, 0);

  // Optimal South Pole tilt ~76 deg outperforms flat 15 deg
  const wattsOptimal = computeSolarCollectorWatts(76, 0.96);
  const wattsFlat = computeSolarCollectorWatts(15, 0.96);
  assert.ok(wattsOptimal > wattsFlat * 1.4, `Optimal ${wattsOptimal}W should beat flat ${wattsFlat}W`);

  // Placement suitability flags bright ridge vs dark crater for solar
  const ridgeSuit = evaluatePlacementSuitability('solar', 20, 16, []);
  const craterSuit = evaluatePlacementSuitability('solar', -16, -12, []);
  assert.equal(ridgeSuit.grade, 'great');
  assert.equal(craterSuit.grade, 'warn');

  const ridgeEff = computeStructureEfficiency('solar', 20, 16, 'ridge_haven');
  const shadowEff = computeStructureEfficiency('solar', -10, -4, 'crater_rim_shadow');
  assert.ok(ridgeEff > shadowEff, `Ridge solar (${ridgeEff}) should beat shadow (${shadowEff})`);

  // Phase 2 requires both collected targets AND processed lab supplies
  const p2Unprocessed = {
    ...state,
    phase: 2 as const,
    collectedTargetIds: ['target_crater_hydrogen', 'target_regolith_1', 'target_sunlight_ridge'],
    resources: { ...state.resources, regolith: 10, waterIceClues: 0, sunlightData: 0 },
  };
  assert.equal(isPhaseComplete(p2Unprocessed), false);

  const p2Processed = {
    ...p2Unprocessed,
    resources: { ...p2Unprocessed.resources, regolith: 25, waterIceClues: 2, sunlightData: 2 },
  };
  assert.equal(isPhaseComplete(p2Processed), true);

  // Phase 3 requires modules AND all 5 connections to Habitat
  const hab = { id: 'h1', type: 'habitat' as const, x: 20, z: 16, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const mods = [
    hab,
    { id: 's1', type: 'solar' as const, x: 22, z: 16, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 },
    { id: 'b1', type: 'battery' as const, x: 18, z: 16, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 },
    { id: 'w1', type: 'water' as const, x: 20, z: 18, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 },
    { id: 'a1', type: 'air' as const, x: 20, z: 14, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 },
    { id: 'o1', type: 'oxygen' as const, x: 21, z: 14, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 },
  ];
  assert.equal(getNeededConnectionTargets(mods, []).length, 5);
  assert.equal(isPhaseComplete({ ...state, phase: 3, structures: mods, connections: [] }), false);

  const conns = mods.slice(1).map((m, idx) => ({
    id: `c${idx}`,
    fromId: m.id,
    toId: hab.id,
    kind: 'power' as const,
    status: 'connected' as const,
  }));
  assert.equal(isPhaseComplete({ ...state, phase: 3, structures: mods, connections: conns }), true);

  // Phase 4 requires all 5 physical emergencies resolved
  assert.equal(
    isPhaseComplete({
      ...state,
      phase: 4,
      survival: { ...state.survival, resolvedChallenges: ['low_sunlight', 'extreme_temperature', 'water_shortage', 'life_support'] },
    }),
    false
  );
  assert.equal(
    isPhaseComplete({
      ...state,
      phase: 4,
      survival: {
        ...state.survival,
        resolvedChallenges: ['low_sunlight', 'extreme_temperature', 'water_shortage', 'life_support', 'solar_particle_event'],
      },
    }),
    true
  );

  const power = getOutpostPowerBalance(mods.slice(0, 2), false);
  assert.ok(power.net > 0);
});

test('NASA Moon Tour has 12 verified entries, Rover has 7 parts, and Phase 4 live simulation ticks & recovers cleanly', () => {
  assert.equal(MOON_TOUR_TOPICS.length, 12);
  assert.equal(ROVER_PARTS.length, 7);
  for (const item of MOON_TOUR_TOPICS) {
    assert.ok(item.imageUrl.startsWith('https://images-assets.nasa.gov/'));
    assert.ok(item.nasaId.length > 0);
  }

  const base = createInitialGameState(true);
  // Before overviewSeen, phase4IntroSeen, taughtChallenges, or while reviewing result, simulation freezes
  const p4OverviewPending = { ...base, phase: 4 as const };
  assert.equal(tickPhase4Simulation(p4OverviewPending).survival.batteryDrainPct, base.survival.batteryDrainPct);

  const p4Untaught = {
    ...base,
    phase: 4 as const,
    survival: { ...base.survival, overviewSeen: true, activeChallenge: 'low_sunlight' as const, taughtChallenges: [] },
  };
  assert.equal(tickPhase4Simulation(p4Untaught).survival.batteryDrainPct, p4Untaught.survival.batteryDrainPct);

  const allTaught = ['low_sunlight', 'extreme_temperature', 'water_shortage', 'life_support', 'solar_particle_event'] as const;

  // 1. Power Shortage drains battery until non-essential off & backup battery active
  const p4Power = {
    ...base,
    phase: 4 as const,
    survival: {
      ...base.survival,
      overviewSeen: true,
      taughtChallenges: [...allTaught],
      activeChallenge: 'low_sunlight' as const,
    },
  };
  const drained = tickPhase4Simulation(p4Power);
  assert.ok(drained.survival.batteryDrainPct < p4Power.survival.batteryDrainPct);

  // 2. Extreme Temp cools cabin while radiator open, warms once closed
  const p4ColdOpen = {
    ...p4Power,
    survival: { ...p4Power.survival, activeChallenge: 'extreme_temperature' as const, radiatorClosed: false, habitatTempC: 6 },
  };
  assert.ok(tickPhase4Simulation(p4ColdOpen).survival.habitatTempC < 6);
  const p4ColdClosed = {
    ...p4ColdOpen,
    survival: { ...p4ColdOpen.survival, radiatorClosed: true, heaterBoosted: true, habitatTempC: 14 },
  };
  assert.ok(tickPhase4Simulation(p4ColdClosed).survival.habitatTempC > 14);

  // 3. Water Shortage leaks while valve loose, stabilizes after fix
  const p4WaterLeak = {
    ...p4Power,
    survival: { ...p4Power.survival, activeChallenge: 'water_shortage' as const, waterValveFixed: false, waterTankPct: 38 },
  };
  assert.ok(tickPhase4Simulation(p4WaterLeak).survival.waterTankPct < 38);

  // 4. CO2 Scrubber rises at step 0, drops at step 2
  const p4Co2Clogged = {
    ...p4Power,
    survival: { ...p4Power.survival, activeChallenge: 'life_support' as const, lifeSupportStep: 0 },
  };
  assert.ok(tickPhase4Simulation(p4Co2Clogged).survival.co2LevelPct > p4Co2Clogged.survival.co2LevelPct);

  // 5. Radiation Shielding wall reduces radiation level vs unshielded
  const p4RadUnshielded = {
    ...p4Power,
    survival: { ...p4Power.survival, activeChallenge: 'solar_particle_event' as const, radiationLevel: 40 },
  };
  const p4RadShielded = {
    ...p4RadUnshielded,
    butterfly: { ...p4RadUnshielded.butterfly, installedRegolithShielding: true },
  };
  assert.ok(
    tickPhase4Simulation(p4RadShielded).survival.radiationLevel <
      tickPhase4Simulation(p4RadUnshielded).survival.radiationLevel
  );
});

test('Round 2 defaults, dotted outpost slots, NASA object mappings, and phase guides are consistent', () => {
  const fresh = createInitialGameState(false);
  assert.equal(fresh.tutorial.inspectedMapTarget, false);
  assert.equal(fresh.tutorial.activatedDrawMode, false);
  assert.equal(fresh.survival.stationVisited, false);
  assert.ok(Array.isArray(fresh.roverTrail) && fresh.roverTrail.length === 1);

  const reqTypes = getRequiredPhase3Types();
  for (const siteId of ['ridge_haven', 'crater_rim_shadow'] as const) {
    const slots = getRecommendedOutpostSlots(siteId);
    for (const req of reqTypes) {
      const slot = slots.find((s) => s.type === req);
      assert.ok(slot, `Missing recommended slot ${req} for ${siteId}`);
      assert.ok(Number.isFinite(slot.x) && Number.isFinite(slot.z));
    }
  }

  for (const item of [...MOON_TOUR_TOPICS, ...EXTRA_NASA_REFERENCES]) {
    assert.ok(item.officialUrl.startsWith('https://'), `Invalid officialUrl on ${item.id}`);
    assert.ok(item.officialLinkLabel.length > 0, `Missing officialLinkLabel on ${item.id}`);
  }

  const kinds = [
    'basalt',
    'anorthosite',
    'regolith_loose',
    'hydrogen_clue',
    'dry_crater_probe',
    'sunlight_beacon',
    'boulder',
    'crater',
    'rover',
    'solar',
    'water',
    'habitat',
  ];
  for (const k of kinds) {
    const media = getNasaMediaForTargetKind(k);
    assert.ok(media.imageUrl.startsWith('https://images-assets.nasa.gov/'), `Expected NASA image for ${k}`);
  }

  for (const phase of [1, 2, 3, 4] as const) {
    assert.ok(PHASE_TUTORIALS[phase].steps.length >= 3);
    assert.equal(PHASE_TUTORIALS[phase].progressiveHints.length, 3);
    const { steps } = getPhaseMissionSteps({ ...fresh, phase });
    assert.ok(steps.every((s) => Boolean(s.guideTarget)), `Phase ${phase} missing guideTarget`);
  }
});

import { computeLroElevationGrid } from './lroMapTerrain';
import { getNasaMediaById } from './nasaMedia';

test('LRO map grid, Mars Mastcam attribution, and terraced crater entry ramps behave accurately', () => {
  const grid = computeLroElevationGrid(42, 48);
  assert.equal(grid.gridSize, 48);
  assert.equal(grid.heights.length, 48 * 48);
  assert.ok(grid.maxH > grid.minH, 'LRO elevation grid must capture ridge-to-crater relief');

  const mastcam = getNasaMediaById('rover_camera_ref');
  assert.equal(mastcam.nasaId, 'PIA16798');
  assert.ok(mastcam.dataDistinction.includes('NOT the Moon'));

  const hydrogenTarget = ROCK_TARGETS.find((t) => t.id === 'target_crater_hydrogen')!;
  const frostTarget = ROCK_TARGETS.find((t) => t.id === 'target_frost_pocket_dry')!;

  const hydrogenRoute = validateRoverPath(
    [
      { x: ROVER_SPAWN.x, z: ROVER_SPAWN.z },
      { x: -1.5, z: 3.0 },
      { x: -10.0, z: -4.0 },
      { x: hydrogenTarget.x, z: hydrogenTarget.z },
    ],
    ROVER_SPAWN,
    100
  );
  assert.equal(hydrogenRoute.valid, true, `Expected hydrogen crater ramp valid, got: ${hydrogenRoute.reasonCode}`);
  assert.ok(hydrogenRoute.sampledPoints.every((p) => p.slopeDeg <= 24));

  const frostRoute = validateRoverPath(
    [
      { x: ROVER_SPAWN.x, z: ROVER_SPAWN.z },
      { x: 1.5, z: 1.0 },
      { x: 9.0, z: -9.5 },
      { x: 18.0, z: -13.5 },
      { x: frostTarget.x, z: frostTarget.z },
    ],
    ROVER_SPAWN,
    100
  );
  assert.equal(frostRoute.valid, true, `Expected frost pocket ramp valid, got: ${frostRoute.reasonCode}`);
  assert.ok(frostRoute.sampledPoints.every((p) => p.slopeDeg <= 24));
});

import {
  buildNarrationCacheKey,
  createInitialNarrationSnapshot,
  getConsistentProsody,
  resolveConsistentSpeechVoice,
  selectConsistentFemaleUsVoice,
  shouldAllowBrowserSpeechFallback,
  shouldDeduplicateNarration,
} from './narrationState';

test('narrationState locks female en-US storyteller voice, steady prosody, and prevents duplicate triggers', () => {
  const mixedVoices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { name: 'Google UK English Male', lang: 'en-GB' },
    { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
    { name: 'Microsoft Mark - English (United States)', lang: 'en-US' },
  ];
  const picked = selectConsistentFemaleUsVoice(mixedVoices);
  assert.equal(picked?.name, 'Microsoft Aria Online (Natural) - English (United States)');

  const fallbackUsFemale = selectConsistentFemaleUsVoice([
    { name: 'Daniel', lang: 'en-GB' },
    { name: 'Samantha', lang: 'en-US' },
  ]);
  assert.equal(fallbackUsFemale?.name, 'Samantha');

  const warm = getConsistentProsody('warm');
  const urgent = getConsistentProsody('urgent');
  assert.ok(warm.pitch <= 0.94 && warm.pitch >= 0.88);
  assert.ok(urgent.rate >= warm.rate);

  const playingSnap = {
    ...createInitialNarrationSnapshot(),
    status: 'playing' as const,
    text: 'Look out across   space, Commander.',
  };
  assert.equal(shouldDeduplicateNarration(playingSnap, 'Look out across space, Commander.'), true);
  assert.equal(shouldDeduplicateNarration(playingSnap, 'Different sentence.'), false);
  assert.equal(
    shouldDeduplicateNarration({ status: 'idle', text: 'Look out across space, Commander.' }, 'Look out across space, Commander.'),
    false
  );
});

test('Round 3 progressive build unlock, honest equipment status, Phase 4 lesson/result freeze, and save migration work', () => {
  // Progressive build unlock stages 0..5
  assert.equal(computePhase3BuildStage([], []), 0);
  const s0 = getProgressiveBuildUnlockSet(0);
  assert.equal(s0.has('habitat'), true);
  assert.equal(s0.has('solar'), false);

  const hab = { id: 'h1', type: 'habitat' as const, x: 20, z: 16, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const solar = { id: 's1', type: 'solar' as const, x: 25, z: 15, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const batt = { id: 'b1', type: 'battery' as const, x: 23, z: 19, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const water = { id: 'w1', type: 'water' as const, x: 15, z: 17, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 };
  const air = { id: 'a1', type: 'air' as const, x: 16, z: 12, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 };
  const oxy = { id: 'o1', type: 'oxygen' as const, x: 21, z: 11, rotationDeg: 0, connectedToHabitat: false, efficiencyPct: 95 };

  assert.equal(computePhase3BuildStage([hab], []), 1);
  assert.equal(getProgressiveBuildUnlockSet(1).has('solar'), true);
  assert.equal(getProgressiveBuildUnlockSet(1).has('battery'), false);

  assert.equal(computePhase3BuildStage([hab, solar], []), 2);
  assert.equal(computePhase3BuildStage([hab, solar, batt], []), 3);
  assert.equal(computePhase3BuildStage([hab, solar, batt, water], []), 4);
  assert.equal(computePhase3BuildStage([hab, solar, batt, water, air], []), 4);
  assert.equal(computePhase3BuildStage([hab, solar, batt, water, air, oxy], []), 5);

  const s5 = getProgressiveBuildUnlockSet(5);
  assert.equal(s5.has('shielding'), true);
  assert.equal(s5.has('food'), true);
  assert.equal(s5.has('cable'), true);

  // Equipment status reflects exact built vs omitted & connected modules
  const eq = getOutpostEquipmentStatus(
    [hab, solar, water],
    [{ id: 'c1', fromId: solar.id, toId: hab.id, kind: 'power', status: 'connected' }]
  );
  assert.equal(eq.hasHabitat, true);
  assert.equal(eq.hasSolar, true);
  assert.equal(eq.solarConnected, true);
  assert.equal(eq.hasWater, true);
  assert.equal(eq.waterConnected, false);
  assert.equal(eq.hasShielding, false);
  assert.equal(eq.hasBattery, false);

  // Phase 4 freezes while !phase4IntroSeen OR while reviewing lastResolvedChallenge
  const base = createInitialGameState(true);
  const frozenIntro = {
    ...base,
    phase: 4 as const,
    phase4IntroSeen: false,
    survival: {
      ...base.survival,
      overviewSeen: true,
      taughtChallenges: ['low_sunlight' as const],
      activeChallenge: 'low_sunlight' as const,
    },
  };
  assert.equal(tickPhase4Simulation(frozenIntro).survival.batteryDrainPct, frozenIntro.survival.batteryDrainPct);

  const frozenResult = {
    ...frozenIntro,
    phase4IntroSeen: true,
    survival: {
      ...frozenIntro.survival,
      lastResolvedChallenge: 'low_sunlight' as const,
      activeChallenge: 'extreme_temperature' as const,
      taughtChallenges: ['low_sunlight' as const, 'extreme_temperature' as const],
    },
  };
  assert.equal(tickPhase4Simulation(frozenResult).survival.habitatTempC, frozenResult.survival.habitatTempC);

  // Backwards-compatible save hydration infers new Round 3 fields cleanly
  const store: Record<string, string> = {};
  const legacySave = createInitialGameState(false);
  delete (legacySave as Partial<typeof legacySave>).phase3IntroSeen;
  delete (legacySave as Partial<typeof legacySave>).phase4IntroSeen;
  legacySave.phase = 4;
  legacySave.structures = [hab];
  legacySave.survival.overviewSeen = true;
  legacySave.survival.resolvedChallenges = ['low_sunlight'];
  delete (legacySave.survival as Partial<typeof legacySave.survival>).taughtChallenges;
  delete (legacySave.survival as Partial<typeof legacySave.survival>).lastResolvedChallenge;
  store[SAVE_STORAGE_KEY] = JSON.stringify(legacySave);

  const prevWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
  };
  try {
    const hydrated = loadSavedGameState();
    assert.ok(hydrated !== null);
    assert.equal(hydrated.phase3IntroSeen, true);
    assert.equal(hydrated.phase4IntroSeen, true);
    assert.deepEqual(hydrated.survival.taughtChallenges, ['low_sunlight']);
    assert.equal(hydrated.survival.lastResolvedChallenge, null);
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});

test('Browser-native Web Speech voice locking helpers and Phase 4 scenario-specific equipment filter work accurately', () => {
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US' },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' },
  ];
  const firstPick = resolveConsistentSpeechVoice(voices, null);
  assert.equal(firstPick.voice?.name, 'Microsoft Aria Online (Natural) - English (United States)');
  // Locked voice stays consistent even if a different list order appears later
  const lockedPick = resolveConsistentSpeechVoice([...voices].reverse(), firstPick.voiceKey);
  assert.equal(lockedPick.voice?.name, firstPick.voice?.name);

  const k1 = buildNarrationCacheKey('Google US English', 'warm', 'Welcome   to the Moon!');
  const k2 = buildNarrationCacheKey('Google US English', 'excited', 'Welcome to the Moon!');
  assert.equal(k1, 'Google US English::warm::Welcome to the Moon!');
  assert.notEqual(k1, k2);

  assert.equal(shouldAllowBrowserSpeechFallback(), true);

  const initSnap = createInitialNarrationSnapshot();
  assert.equal(initSnap.voiceId, 'browser-en-us-female');
  assert.equal(initSnap.provider, 'silent');
  assert.equal(initSnap.error, null);

  // getPhase4RelevantSystems exposes ONLY scenario-relevant equipment and single primary metric
  const base = createInitialGameState(true);
  const hab = { id: 'h1', type: 'habitat' as const, x: 20, z: 16, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const solar = { id: 's1', type: 'solar' as const, x: 25, z: 15, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const water = { id: 'w1', type: 'water' as const, x: 15, z: 17, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const air = { id: 'a1', type: 'air' as const, x: 16, z: 12, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const oxygen = { id: 'o1', type: 'oxygen' as const, x: 21, z: 11, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const shield = { id: 'sh1', type: 'shielding' as const, x: 18, z: 14, rotationDeg: 0, connectedToHabitat: true, efficiencyPct: 95 };
  const withOutpost = {
    ...base,
    phase: 4 as const,
    structures: [hab, solar, water, air, oxygen, shield],
    connections: [
      { id: 'c1', fromId: solar.id, toId: hab.id, kind: 'power' as const, status: 'connected' as const },
      { id: 'c2', fromId: water.id, toId: hab.id, kind: 'water' as const, status: 'connected' as const },
    ],
  };

  // 1. low_sunlight
  const lowSunUnfixed = getPhase4RelevantSystems(withOutpost, 'low_sunlight');
  assert.equal(lowSunUnfixed.primaryMetricLabel, 'Power');
  assert.ok(lowSunUnfixed.equipment.every((e) => e.status === 'Needs attention'));
  assert.ok(lowSunUnfixed.equipment.some((e) => e.name.includes('Solar Panels')));
  const lowSunFixed = getPhase4RelevantSystems(
    { ...withOutpost, survival: { ...withOutpost.survival, nonEssentialOff: true, backupBatteryActive: true } },
    'low_sunlight'
  );
  assert.ok(lowSunFixed.equipment.every((e) => e.status === 'Working'));

  // 2. extreme_temperature
  const coldUnfixed = getPhase4RelevantSystems(withOutpost, 'extreme_temperature');
  assert.equal(coldUnfixed.primaryMetricLabel, 'Cabin Temp');
  assert.equal(coldUnfixed.equipment.length, 1);
  assert.equal(coldUnfixed.equipment[0].status, 'Needs attention');
  const coldFixed = getPhase4RelevantSystems(
    { ...withOutpost, survival: { ...withOutpost.survival, radiatorClosed: true, heaterBoosted: true } },
    'extreme_temperature'
  );
  assert.equal(coldFixed.equipment[0].status, 'Working');

  // 3. water_shortage
  const waterUnfixed = getPhase4RelevantSystems(withOutpost, 'water_shortage');
  assert.equal(waterUnfixed.primaryMetricLabel, 'Water Tank');
  assert.equal(waterUnfixed.equipment[0].status, 'Needs attention');
  const waterFixed = getPhase4RelevantSystems(
    { ...withOutpost, survival: { ...withOutpost.survival, waterValveFixed: true, waterReserveUsed: true } },
    'water_shortage'
  );
  assert.equal(waterFixed.equipment[0].status, 'Working');

  // 4. life_support
  const airUnfixed = getPhase4RelevantSystems(withOutpost, 'life_support');
  assert.equal(airUnfixed.primaryMetricLabel, 'CO₂ / O₂');
  assert.equal(airUnfixed.equipment.length, 2);
  assert.ok(airUnfixed.equipment.every((e) => e.status === 'Needs attention'));
  const airFixed = getPhase4RelevantSystems(
    { ...withOutpost, survival: { ...withOutpost.survival, lifeSupportStep: 3 } },
    'life_support'
  );
  assert.ok(airFixed.equipment.every((e) => e.status === 'Working'));

  // 5. solar_particle_event
  const stormUnfixed = getPhase4RelevantSystems(withOutpost, 'solar_particle_event');
  assert.equal(stormUnfixed.primaryMetricLabel, 'Radiation');
  assert.equal(stormUnfixed.equipment[0].status, 'Needs attention');
  const stormFixed = getPhase4RelevantSystems(
    { ...withOutpost, survival: { ...withOutpost.survival, crewSheltered: true, shieldShutterClosed: true } },
    'solar_particle_event'
  );
  assert.equal(stormFixed.equipment[0].status, 'Working');
});




