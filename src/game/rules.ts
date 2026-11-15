import {
  OUTPOST_SITES,
  ROCK_TARGETS,
  ROVER_SPAWN,
  getSunlightFactor,
  getTerrainHeight,
  getTerrainSlopeDeg,
  isInShadowedCrater,
} from './lunarTerrain';
import { PHASE_INTRO_POPUPS, STRUCTURES } from './missionData';
import {
  GameState,
  MissionPhase,
  MissionStepItem,
  OutpostConnection,
  Phase4ChallengeId,
  PlacedStructure,
  ResourceInventory,
  StructureType,
} from './types';

export const SAVE_STORAGE_KEY = 'space_pioneers_save_v1';

export function createInitialGameState(autostart = false): GameState {
  const spawnY = getTerrainHeight(ROVER_SPAWN.x, ROVER_SPAWN.z);
  return {
    screen: autostart ? 'playing' : 'title',
    introScene: 0,
    introTourTopicIndex: 0,
    roverPartIndex: 0,
    roverName: 'ASTRO',
    phase: 1,
    tutorial: {
      step: autostart ? 'complete' : 'look_around',
      rotatedCamera: autostart,
      zoomedCamera: autostart,
      switchedCameraView: autostart,
      movedRover: autostart,
      openedMap: autostart,
      inspectedMapTarget: autostart,
      activatedDrawMode: autostart,
      drewRoute: autostart,
      startedRoute: autostart,
      scannedRock: autostart,
    },
    tutorialCompleted: autostart,
    cameraMode: 'follow',
    rover: {
      x: ROVER_SPAWN.x,
      y: spawnY,
      z: ROVER_SPAWN.z,
      headingRad: Math.PI,
      speed: 0,
      battery: 100,
      health: 100,
      dustLevel: 0,
      headlightsOn: false,
      animState: 'idle',
      distanceDrivenM: 0,
      lastIssue: null,
      repairKits: 3,
    },
    roverTrail: [{ x: ROVER_SPAWN.x, z: ROVER_SPAWN.z }],
    routePlanning: {
      isDrawingMode: false,
      isExecuting: false,
      isPaused: false,
      rawPoints: [],
      validation: null,
      progressIndex: 0,
    },
    exploredCells: ['0,1'],
    scannedTargetIds: [],
    collectedTargetIds: [],
    processedSampleCount: 0,
    visitedCrater: false,
    selectedOutpostSite: null,
    solarComparison: {
      ridgeAngleDeg: 75,
      ridgeWattage: 0,
      shadowWattage: 44,
      saved: false,
    },
    resources: {
      rawSoil: 0,
      iceCoreSamples: 0,
      solarSurveyCount: 0,
      waterIceClues: 0,
      processedWater: 0,
      regolith: 10,
      sunlightData: 0,
      storedEnergy: 20,
      sciencePoints: 0,
    },
    structures: [],
    connections: [],
    phase3IntroSeen: autostart,
    phase4IntroSeen: autostart,
    selectedBuildType: 'habitat',
    buildMode: 'place',
    connectSourceId: null,
    buildRotationDeg: 0,
    survival: {
      overviewSeen: false,
      currentChallengeIndex: 0,
      activeChallenge: 'low_sunlight',
      stationVisited: false,
      resolvedChallenges: [],
      taughtChallenges: [],
      lastResolvedChallenge: null,
      powerMode: 'balanced',
      batteryDrainPct: 48,
      nonEssentialOff: false,
      backupBatteryActive: false,
      habitatTempC: 6,
      radiatorClosed: false,
      heaterBoosted: false,
      waterTankPct: 38,
      waterValveFixed: false,
      waterReserveUsed: false,
      co2LevelPct: 1.9,
      oxygenLevelPct: 19.2,
      radiationLevel: 78,
      crewSheltered: false,
      spaceWeatherChecked: false,
      shieldShutterClosed: false,
      cableRepaired: false,
      lifeSupportStep: 0,
      outpostSafetyPct: 100,
    },
    butterfly: {
      tookDustyShortcut: false,
      collectedExtraRegolith: false,
      processedExtraWater: false,
      chosenOutpostSite: null,
      installedRegolithShielding: false,
      builtBackupBattery: false,
      protectedCableRoute: false,
      cleanedDustySensors: false,
      poorConnectionsCount: 0,
    },
    scienceJournalIds: ['sci_no_atmosphere'],
    achievements: autostart ? ['Junior Moon Pioneer'] : [],
    activePopup: autostart ? PHASE_INTRO_POPUPS[1] : null,
    contextualNotice: null,
    seenTaskPopups: autostart ? ['phase_1_intro'] : [],
    playedNarrationKeys: [],
    audio: {
      muted: false,
      volume: 0.8,
      narrationVolume: 0.9,
      musicVolume: 0.45,
      sfxVolume: 0.75,
      voiceEnabled: true,
      captionsEnabled: true,
      reducedMotion: false,
    },
    lastSavedAt: null,
  };
}

export function canAffordStructure(
  resources: ResourceInventory,
  type: StructureType
): boolean {
  const cost = STRUCTURES[type].cost;
  return (
    (cost.waterIceClues ?? 0) <= Math.max(resources.waterIceClues, resources.processedWater) &&
    (cost.regolith ?? 0) <= resources.regolith &&
    (cost.sunlightData ?? 0) <= resources.sunlightData
  );
}

export function spendResourcesForStructure(
  resources: ResourceInventory,
  type: StructureType
): ResourceInventory {
  const cost = STRUCTURES[type].cost;
  const waterCost = cost.waterIceClues ?? 0;
  return {
    ...resources,
    waterIceClues: Math.max(0, resources.waterIceClues - waterCost),
    processedWater: Math.max(0, resources.processedWater - waterCost),
    regolith: Math.max(0, resources.regolith - (cost.regolith ?? 0)),
    sunlightData: Math.max(0, resources.sunlightData - (cost.sunlightData ?? 0)),
  };
}

export function refundResourcesForStructure(
  resources: ResourceInventory,
  type: StructureType
): ResourceInventory {
  const cost = STRUCTURES[type].cost;
  const waterCost = cost.waterIceClues ?? 0;
  return {
    ...resources,
    waterIceClues: resources.waterIceClues + waterCost,
    processedWater: resources.processedWater + waterCost,
    regolith: resources.regolith + (cost.regolith ?? 0),
    sunlightData: resources.sunlightData + (cost.sunlightData ?? 0),
  };
}

export function computeStructureEfficiency(
  type: StructureType,
  x: number,
  z: number,
  chosenSite: 'ridge_haven' | 'crater_rim_shadow' | null
): number {
  const sunlight = getSunlightFactor(x, z);
  const slope = getTerrainSlopeDeg(x, z);
  if (type === 'solar') {
    const siteBonus = chosenSite === 'ridge_haven' ? 10 : -18;
    return Math.max(25, Math.min(100, Math.round(sunlight * 95 + siteBonus)));
  }
  if (type === 'habitat' && slope > 14) {
    return 70;
  }
  if (isInShadowedCrater(x, z)) {
    return 65;
  }
  return 95;
}

export function evaluatePlacementSuitability(
  type: StructureType,
  x: number,
  z: number,
  structures: PlacedStructure[]
): {
  grade: 'great' | 'okay' | 'warn';
  headline: string;
  detail: string;
  sunlightPct: number;
  slopeDeg: number;
} {
  const slopeDeg = Math.round(getTerrainSlopeDeg(x, z));
  const sunlightPct = Math.round(getSunlightFactor(x, z) * 100);
  const habitat = structures.find((s) => s.type === 'habitat');
  const distToHab = habitat ? Math.hypot(x - habitat.x, z - habitat.z) : 0;

  if (type === 'solar') {
    if (sunlightPct >= 75) {
      return {
        grade: 'great',
        headline: `${sunlightPct}% Sunlight · +45 kW!`,
        detail: 'Bright spot! Panels will generate strong electricity here.',
        sunlightPct,
        slopeDeg,
      };
    }
    return {
      grade: 'warn',
      headline: `Only ${sunlightPct}% Sunlight`,
      detail: 'Too shadowy! Move out onto brighter highland ground for full power.',
      sunlightPct,
      slopeDeg,
    };
  }

  if (type === 'habitat') {
    if (slopeDeg <= 13) {
      return {
        grade: 'great',
        headline: `Flat Ground (${slopeDeg}° slope) ✓`,
        detail: 'Safe, stable spot for our astronaut dome!',
        sunlightPct,
        slopeDeg,
      };
    }
    return {
      grade: 'warn',
      headline: `Steep Slope (${slopeDeg}°)`,
      detail: 'Too tilted! Find flatter ground away from crater walls.',
      sunlightPct,
      slopeDeg,
    };
  }

  if (habitat && distToHab > 24) {
    return {
      grade: 'okay',
      headline: `${Math.round(distToHab)}m from Habitat`,
      detail: 'A bit far—place closer so cables and pipes reach easily!',
      sunlightPct,
      slopeDeg,
    };
  }

  return {
    grade: slopeDeg <= 16 ? 'great' : 'okay',
    headline: slopeDeg <= 16 ? 'Good Outpost Position ✓' : `Sloped (${slopeDeg}°)`,
    detail: STRUCTURES[type].whyLocationMatters,
    sunlightPct,
    slopeDeg,
  };
}

export function computeSolarCollectorWatts(angleDeg: number, sunlightFactor: number): number {
  // South Pole low sun sits ~14 deg above horizon, so optimal panel tilt is ~76 deg!
  const optimal = 76;
  const alignment = Math.max(0.2, Math.cos(((angleDeg - optimal) * Math.PI) / 180));
  return Math.round(120 * sunlightFactor * alignment);
}

export function getOutpostPowerBalance(structures: PlacedStructure[], lowSunlight = false): {
  generated: number;
  used: number;
  net: number;
  batteryBonus: number;
} {
  let generated = 0;
  let used = 0;
  let batteryBonus = 0;

  for (const s of structures) {
    if (s.damaged) continue;
    const def = STRUCTURES[s.type];
    if (!def) continue;
    if (def.powerDelta > 0) {
      if (s.type === 'solar') {
        const sunScale = lowSunlight ? 0.38 : 1.0;
        generated += Math.round((def.powerDelta * s.efficiencyPct * sunScale) / 100);
      } else if (s.type === 'battery') {
        batteryBonus += def.powerDelta;
      }
    } else if (def.powerDelta < 0) {
      used += Math.abs(def.powerDelta);
    }
  }

  return {
    generated,
    used,
    net: generated + batteryBonus - used,
    batteryBonus,
  };
}

export function getRequiredPhase3Types(): StructureType[] {
  return ['habitat', 'solar', 'battery', 'water', 'air', 'oxygen'];
}

export function computePhase3BuildStage(
  structures: PlacedStructure[],
  connections: OutpostConnection[]
): number {
  const placed = new Set(structures.map((s) => s.type));
  if (!placed.has('habitat')) return 0;
  if (!placed.has('solar')) return 1;
  if (!placed.has('battery')) return 2;
  if (!placed.has('water')) return 3;
  if (!placed.has('air') || !placed.has('oxygen')) return 4;
  // Once all 6 required modules exist, unlock all optional shields & pods (and connection lines check)
  void connections;
  return 5;
}

export function getProgressiveBuildUnlockSet(stage: number): Set<StructureType> {
  const unlocked = new Set<StructureType>(['habitat']);
  if (stage >= 1) unlocked.add('solar');
  if (stage >= 2) unlocked.add('battery');
  if (stage >= 3) unlocked.add('water');
  if (stage >= 4) {
    unlocked.add('air');
    unlocked.add('oxygen');
  }
  if (stage >= 5) {
    unlocked.add('shielding');
    unlocked.add('food');
    unlocked.add('cable');
  }
  return unlocked;
}

export function getOutpostEquipmentStatus(
  structures: PlacedStructure[],
  connections: OutpostConnection[]
) {
  const byType = new Map<StructureType, PlacedStructure>();
  for (const s of structures) {
    if (!byType.has(s.type)) byType.set(s.type, s);
  }
  const habitat = byType.get('habitat');
  const isConn = (type: StructureType) => {
    const unit = byType.get(type);
    if (!unit || !habitat) return false;
    return connections.some(
      (c) =>
        ((c.fromId === unit.id && c.toId === habitat.id) ||
          (c.fromId === habitat.id && c.toId === unit.id)) &&
        c.status === 'connected'
    );
  };
  return {
    hasHabitat: Boolean(habitat),
    hasSolar: byType.has('solar'),
    solarConnected: isConn('solar'),
    hasBattery: byType.has('battery'),
    batteryConnected: isConn('battery'),
    hasWater: byType.has('water'),
    waterConnected: isConn('water'),
    hasAir: byType.has('air'),
    airConnected: isConn('air'),
    hasOxygen: byType.has('oxygen'),
    oxygenConnected: isConn('oxygen'),
    hasShielding: byType.has('shielding'),
    hasFood: byType.has('food'),
    hasCable: byType.has('cable'),
    builtTypes: Array.from(byType.keys()),
  };
}

export interface RecommendedOutpostSlot {
  type: StructureType;
  x: number;
  z: number;
  label: string;
}

export function getRecommendedOutpostSlots(
  siteId: 'ridge_haven' | 'crater_rim_shadow' | null
): RecommendedOutpostSlot[] {
  const site = OUTPOST_SITES.find((s) => s.id === siteId) ?? OUTPOST_SITES[0];
  const cx = site.x;
  const cz = site.z;
  return [
    { type: 'habitat', x: cx, z: cz, label: 'Crew Habitat Slot' },
    { type: 'solar', x: cx + 5.6, z: cz - 1.5, label: 'Solar Panels Slot' },
    { type: 'battery', x: cx + 3.4, z: cz + 3.8, label: 'Battery Bank Slot' },
    { type: 'water', x: cx - 5.2, z: cz + 1.8, label: 'Water Tanks Slot' },
    { type: 'air', x: cx - 3.6, z: cz - 4.4, label: 'Air Scrubber Slot' },
    { type: 'oxygen', x: cx + 1.2, z: cz - 5.4, label: 'Oxygen Maker Slot' },
    { type: 'shielding', x: cx - 4.6, z: cz + 5.0, label: 'Regolith Shield Slot' },
    { type: 'food', x: cx + 5.2, z: cz + 4.8, label: 'Food Pod Slot' },
  ];
}

export function getNeededConnectionTargets(
  structures: PlacedStructure[],
  connections: OutpostConnection[]
): Array<{ from: PlacedStructure; to: PlacedStructure; kind: 'power' | 'water' | 'air'; connected: boolean }> {
  const habitat = structures.find((s) => s.type === 'habitat');
  if (!habitat) return [];
  const connectTypes: StructureType[] = ['solar', 'battery', 'water', 'air', 'oxygen'];
  const result: Array<{ from: PlacedStructure; to: PlacedStructure; kind: 'power' | 'water' | 'air'; connected: boolean }> = [];

  for (const type of connectTypes) {
    const unit = structures.find((s) => s.type === type);
    if (!unit) continue;
    const kind = STRUCTURES[type].connectionKind ?? 'power';
    const isConn = connections.some(
      (c) =>
        ((c.fromId === unit.id && c.toId === habitat.id) ||
          (c.fromId === habitat.id && c.toId === unit.id)) &&
        c.status === 'connected'
    );
    result.push({ from: unit, to: habitat, kind, connected: isConn });
  }
  return result;
}

export function isPhaseComplete(state: GameState): boolean {
  if (state.phase === 1) {
    const scannedHighland = state.scannedTargetIds.includes('rock_highland_anorthosite');
    const exploredEnough = state.exploredCells.length >= 4;
    return (
      scannedHighland &&
      state.visitedCrater &&
      exploredEnough &&
      state.selectedOutpostSite !== null
    );
  }
  if (state.phase === 2) {
    const gotIceClue = state.collectedTargetIds.includes('target_crater_hydrogen');
    const gotRegolith =
      state.collectedTargetIds.includes('target_regolith_1') ||
      state.collectedTargetIds.includes('target_regolith_2');
    const gotSun = state.collectedTargetIds.includes('target_sunlight_ridge');
    const processedEnough =
      state.resources.regolith >= 20 &&
      state.resources.waterIceClues >= 1 &&
      state.resources.sunlightData >= 1;
    return gotIceClue && gotRegolith && gotSun && processedEnough;
  }
  if (state.phase === 3) {
    const placedTypes = new Set(state.structures.map((s) => s.type));
    const hasAllStructs = getRequiredPhase3Types().every((t) => placedTypes.has(t));
    if (!hasAllStructs) return false;
    const reqConns = getNeededConnectionTargets(state.structures, state.connections);
    return reqConns.length >= 5 && reqConns.every((c) => c.connected);
  }
  if (state.phase === 4) {
    return state.survival.resolvedChallenges.length >= 5;
  }
  return false;
}

export function getPhaseMissionSteps(state: GameState): {
  objectiveTitle: string;
  steps: MissionStepItem[];
} {
  const phase: MissionPhase = state.phase;
  if (phase === 1) {
    return {
      objectiveTitle: 'Scout the South Pole & pick a site',
      steps: [
        {
          id: 'p1_explore',
          label: `Explore terrain (${Math.min(4, state.exploredCells.length)}/4 zones)`,
          completed: state.exploredCells.length >= 4,
          hint: 'Draw a path or drive across new Moon ground!',
          whereHint: 'Open highland plains around Landing Zone',
          whyHint: 'Map safe flat ground free of steep cliffs',
          whatToTestHint: 'Watch how rover wheels roll over uneven terrain',
          guideTarget: 'route',
        },
        {
          id: 'p1_scan_rock',
          label: 'Scan Bright Highland Rock',
          completed: state.scannedTargetIds.includes('rock_highland_anorthosite'),
          hint: 'Roll to the glowing rock beacon, then press & hold Scan!',
          whereHint: 'West ridge · Bright Highland Rock beacon',
          whyHint: 'Study ancient lunar crust & mineral strength',
          whatToTestHint: 'Hold Scan to read mineral composition',
          guideTarget: 'scan',
        },
        {
          id: 'p1_crater',
          label: 'Check Deep Shadow Crater',
          completed: state.visitedCrater,
          hint: 'Switch Headlights ON and drive northwest into the dark crater edge!',
          whereHint: 'Northwest · Deep Shadow Crater rim',
          whyHint: 'Freezing cold shadows might trap water clues',
          whatToTestHint: 'Switch Headlights ON to light dark craters',
          guideTarget: 'lights',
        },
        {
          id: 'p1_site',
          label: 'Pick Outpost Site',
          completed: state.selectedOutpostSite !== null,
          hint: 'Compare Sunlit Peak Ridge vs Shadow Rim Terrace!',
          whereHint: 'Top Bar · Site Picker',
          whyHint: 'Balance sunlight power against water access',
          whatToTestHint: 'Review sunlight & distance before confirming',
          guideTarget: 'outpost_btn',
        },
      ],
    };
  }

  if (phase === 2) {
    const processedOk =
      state.resources.regolith >= 20 &&
      state.resources.waterIceClues >= 1 &&
      state.resources.sunlightData >= 1;
    return {
      objectiveTitle: 'Collect & process Moon supplies',
      steps: [
        {
          id: 'p2_ice',
          label: 'Drill Shadow Crater (Headlights ON)',
          completed: state.collectedTargetIds.includes('target_crater_hydrogen'),
          hint: 'Turn ON Headlights, drive to Ice Spot, and Hold Core Drill!',
          whereHint: 'Deep Shadow Crater floor (-20, -15)',
          whyHint: 'Verify whether hydrogen clues hold frozen water',
          whatToTestHint: 'Hold Core Drill inside dark craters',
          guideTarget: 'lights',
        },
        {
          id: 'p2_regolith',
          label: 'Scoop Lunar Soil Sample',
          completed:
            state.collectedTargetIds.includes('target_regolith_1') ||
            state.collectedTargetIds.includes('target_regolith_2'),
          hint: 'Drive to Soil Scoop Site A or B and lower the robotic arm!',
          whereHint: 'Soil Scoop Site A (east) or B (northeast)',
          whyHint: 'Moon soil bakes into Regolith Units for habitat shields',
          whatToTestHint: 'Scoop loose regolith into cargo bin',
          guideTarget: 'scan',
        },
        {
          id: 'p2_sun',
          label: 'Test Solar Collector on Ridge',
          completed: state.collectedTargetIds.includes('target_sunlight_ridge'),
          hint: 'Drive to Solar Test Ridge and tilt the solar collector toward the Sun!',
          whereHint: 'Sunlit Peak Ridge (20, 16)',
          whyHint: 'Find the best upright tilt angle for low polar Sun',
          whatToTestHint: 'Drag panel angle to peak Wattage',
          guideTarget: 'map',
        },
        {
          id: 'p2_process',
          label: 'Process Samples in Moon Lab',
          completed: processedOk,
          hint: 'Open the Moon Lab button below to turn raw samples into supplies!',
          whereHint: 'Bottom Dock · Moon Lab',
          whyHint: 'Turn raw soil/cores into construction supplies',
          whatToTestHint: 'Process Regolith Units, Water & Solar Kits',
          guideTarget: 'moonlab',
        },
      ],
    };
  }

  if (phase === 3) {
    const placed = new Set(state.structures.map((s) => s.type));
    const reqConns = getNeededConnectionTargets(state.structures, state.connections);
    const connectedCount = reqConns.filter((c) => c.connected).length;
    const totalNeeded = Math.max(5, reqConns.length);
    return {
      objectiveTitle: 'Build & connect your outpost',
      steps: [
        {
          id: 'p3_hab',
          label: 'Place Crew Habitat on flat ground',
          completed: placed.has('habitat'),
          hint: 'Pick Crew Habitat below and click a dotted outline (or Place at Spot).',
          guideTarget: 'build_place',
        },
        {
          id: 'p3_power',
          label: 'Place Solar Panels & Battery Bank',
          completed: placed.has('solar') && placed.has('battery'),
          hint: 'Place Solar Panels on bright ground and Battery nearby!',
          guideTarget: 'build_place',
        },
        {
          id: 'p3_life',
          label: 'Place Water, Air Scrubber & Oxygen',
          completed: placed.has('water') && placed.has('air') && placed.has('oxygen'),
          hint: 'Place Water, Air, and Oxygen units at the dotted outlines.',
          guideTarget: 'build_place',
        },
        {
          id: 'p3_connect',
          label: `Connect Cables & Pipes (${connectedCount}/${totalNeeded})`,
          completed: reqConns.length >= 5 && connectedCount >= totalNeeded,
          hint: 'Tap "Connect Lines" below, then link each module to Habitat!',
          guideTarget: 'build_connect',
        },
      ],
    };
  }

  const resolved = state.survival.resolvedChallenges;
  return {
    objectiveTitle: 'Keep astronauts safe (5 emergencies)',
    steps: [
      {
        id: 'p4_c1',
        label: '1. Visit Battery & Fix Power Shortage',
        completed: resolved.includes('low_sunlight'),
        hint: 'Visit Battery Bank, shut off extra lights, and enable Backup Battery.',
        guideTarget: 'visit_station',
      },
      {
        id: 'p4_c2',
        label: '2. Visit Habitat & Fix Freezing Temp',
        completed: resolved.includes('extreme_temperature'),
        hint: 'Visit Habitat, close stuck radiator louver, and boost heaters.',
        guideTarget: 'visit_station',
      },
      {
        id: 'p4_c3',
        label: '3. Visit Water Tanks & Fix Shortage',
        completed: resolved.includes('water_shortage'),
        hint: 'Visit Water Tanks, tighten valve, and open processed reserve.',
        guideTarget: 'visit_station',
      },
      {
        id: 'p4_c4',
        label: '4. Visit Air Scrubber & Clean CO₂',
        completed: resolved.includes('life_support'),
        hint: 'Visit Air Scrubber, brush dust, swap filter, and restart fan.',
        guideTarget: 'visit_station',
      },
      {
        id: 'p4_c5',
        label: '5. Visit Shielding & Shelter Crew',
        completed: resolved.includes('solar_particle_event'),
        hint: 'Check space weather, shelter astronauts, and seal shield shutters.',
        guideTarget: 'visit_station',
      },
    ],
  };
}

export function getNearestTargetForRover(
  state: GameState
): { target: (typeof ROCK_TARGETS)[number]; distance: number } | null {
  let best: (typeof ROCK_TARGETS)[number] | null = null;
  let bestDist = Infinity;
  for (const t of ROCK_TARGETS) {
    if (state.phase === 1 && t.phase !== 1) continue;
    if (state.phase === 2 && t.phase !== 2) continue;
    if (state.phase >= 3) continue;
    const alreadyDone =
      state.phase === 1
        ? state.scannedTargetIds.includes(t.id)
        : state.collectedTargetIds.includes(t.id);
    if (alreadyDone) continue;

    const d = Math.hypot(t.x - state.rover.x, t.z - state.rover.z);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best ? { target: best, distance: bestDist } : null;
}

export function getOutpostSiteInfo(siteId: 'ridge_haven' | 'crater_rim_shadow' | null) {
  return OUTPOST_SITES.find((s) => s.id === siteId) ?? OUTPOST_SITES[0];
}

export function saveGameState(state: GameState): GameState {
  const stamped = { ...state, lastSavedAt: new Date().toISOString() };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(stamped));
    }
  } catch {
    // Ignore storage issues
  }
  return stamped;
}

export function loadSavedGameState(): GameState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed.phase !== 'number' || !parsed.rover) return null;
    const defaults = createInitialGameState(false);
    const hasStructs = Array.isArray(parsed.structures) && parsed.structures.length > 0;
    const inferredP3Intro =
      typeof parsed.phase3IntroSeen === 'boolean'
        ? parsed.phase3IntroSeen
        : parsed.phase > 3 || hasStructs;
    const inferredP4Intro =
      typeof parsed.phase4IntroSeen === 'boolean'
        ? parsed.phase4IntroSeen
        : Boolean(parsed.survival?.overviewSeen || (parsed.survival?.resolvedChallenges?.length ?? 0) > 0);
    const savedResolved = Array.isArray(parsed.survival?.resolvedChallenges)
      ? parsed.survival.resolvedChallenges
      : [];
    const savedTaught = Array.isArray(parsed.survival?.taughtChallenges)
      ? parsed.survival.taughtChallenges
      : [...savedResolved];

    return {
      ...defaults,
      ...parsed,
      phase3IntroSeen: inferredP3Intro,
      phase4IntroSeen: inferredP4Intro,
      tutorial: { ...defaults.tutorial, ...(parsed.tutorial || {}) },
      rover: { ...defaults.rover, ...parsed.rover },
      roverTrail: Array.isArray(parsed.roverTrail) && parsed.roverTrail.length > 0
        ? parsed.roverTrail
        : defaults.roverTrail,
      resources: { ...defaults.resources, ...parsed.resources },
      solarComparison: { ...defaults.solarComparison, ...(parsed.solarComparison || {}) },
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      survival: {
        ...defaults.survival,
        ...(parsed.survival || {}),
        taughtChallenges: savedTaught,
        lastResolvedChallenge: parsed.survival?.lastResolvedChallenge ?? null,
      },
      butterfly: { ...defaults.butterfly, ...(parsed.butterfly || {}) },
      audio: { ...defaults.audio, ...(parsed.audio || {}) },
      routePlanning: {
        ...defaults.routePlanning,
        ...parsed.routePlanning,
        isExecuting: false,
        isPaused: false,
      },
      contextualNotice: null,
    };
  } catch {
    return null;
  }
}

export function tickPhase4Simulation(state: GameState): GameState {
  if (
    state.phase !== 4 ||
    !state.phase4IntroSeen ||
    !state.survival.overviewSeen ||
    state.survival.resolvedChallenges.length >= 5 ||
    state.survival.lastResolvedChallenge !== null
  ) {
    return state;
  }
  const s = state.survival;
  const ch = s.activeChallenge;
  if (!ch || !s.taughtChallenges.includes(ch)) return state;

  let next = { ...s };

  if (ch === 'low_sunlight') {
    const drainRate = s.nonEssentialOff ? 0.4 : 1.5;
    next.batteryDrainPct = s.backupBatteryActive
      ? Math.min(95, s.batteryDrainPct + 8)
      : Math.max(12, Number((s.batteryDrainPct - drainRate).toFixed(1)));
  } else if (ch === 'extreme_temperature') {
    if (!s.radiatorClosed) {
      next.habitatTempC = Math.max(-14, Number((s.habitatTempC - 0.6).toFixed(1)));
    } else if (!s.heaterBoosted) {
      next.habitatTempC = Math.min(14, Number((s.habitatTempC + 0.5).toFixed(1)));
    } else {
      next.habitatTempC = Math.min(21, Number((s.habitatTempC + 1.5).toFixed(1)));
    }
  } else if (ch === 'water_shortage') {
    if (!s.waterValveFixed) {
      next.waterTankPct = Math.max(14, Number((s.waterTankPct - 1.1).toFixed(1)));
    } else if (!s.waterReserveUsed) {
      next.waterTankPct = Math.min(60, Number((s.waterTankPct + 0.4).toFixed(1)));
    }
  } else if (ch === 'life_support') {
    if (s.lifeSupportStep === 0) {
      next.co2LevelPct = Math.min(3.6, Number((s.co2LevelPct + 0.08).toFixed(2)));
      next.oxygenLevelPct = Math.max(16.5, Number((s.oxygenLevelPct - 0.1).toFixed(1)));
    } else if (s.lifeSupportStep === 1) {
      next.co2LevelPct = Math.min(3.6, Number((s.co2LevelPct + 0.03).toFixed(2)));
    } else if (s.lifeSupportStep === 2) {
      next.co2LevelPct = Math.max(0.9, Number((s.co2LevelPct - 0.12).toFixed(2)));
      next.oxygenLevelPct = Math.min(20.6, Number((s.oxygenLevelPct + 0.15).toFixed(1)));
    }
  } else if (ch === 'solar_particle_event') {
    const shieldReduction = state.butterfly.installedRegolithShielding ? 20 : 0;
    const targetRad = s.shieldShutterClosed
      ? 12
      : s.crewSheltered
      ? Math.max(22, 48 - shieldReduction)
      : Math.min(96, 80 - shieldReduction + (s.spaceWeatherChecked ? 0 : 6));
    next.radiationLevel = Math.round(next.radiationLevel + (targetRad - next.radiationLevel) * 0.35);
  }

  return {
    ...state,
    survival: next,
  };
}

export interface Phase4RelevantEquipment {
  name: string;
  purpose: string;
  status: 'Working' | 'Needs attention';
  healthy: boolean;
}

export interface Phase4RelevantSystems {
  primaryMetricLabel: string;
  primaryMetricValue: string;
  metricAlert: boolean;
  equipment: Phase4RelevantEquipment[];
  detailNote: string;
}

export function getPhase4RelevantSystems(
  state: GameState,
  challengeId: Phase4ChallengeId
): Phase4RelevantSystems {
  const s = state.survival;
  const eq = getOutpostEquipmentStatus(state.structures, state.connections);
  const power = getOutpostPowerBalance(state.structures, challengeId === 'low_sunlight');
  const choseShadow = state.butterfly.chosenOutpostSite === 'crater_rim_shadow';

  if (challengeId === 'low_sunlight') {
    const batteryHealthy = s.backupBatteryActive && s.nonEssentialOff;
    const solarHealthy = eq.hasSolar && eq.solarConnected && s.backupBatteryActive;
    const equipment: Phase4RelevantEquipment[] = [
      {
        name: eq.hasBattery ? 'Battery Bank' : 'Core Reserve Cell',
        purpose: 'Supplies backup power when polar sunlight dips',
        status: batteryHealthy ? 'Working' : 'Needs attention',
        healthy: batteryHealthy,
      },
    ];
    if (eq.hasSolar) {
      equipment.push({
        name: 'Solar Panels',
        purpose: 'Turns low South Pole sunlight into electricity',
        status: solarHealthy ? 'Working' : 'Needs attention',
        healthy: solarHealthy,
      });
    }
    return {
      primaryMetricLabel: 'Power',
      primaryMetricValue: `${Math.round(s.batteryDrainPct)}%`,
      metricAlert: s.batteryDrainPct < 45 || !batteryHealthy,
      equipment,
      detailNote: choseShadow
        ? `Shadow Rim Terrace has shorter sunlight (Solar Net: ${power.net >= 0 ? `+${power.net}` : power.net} kW). Turning off extra lab lights saves critical battery.`
        : `Sunlit Peak Ridge captures strong polar light (Solar Net: ${power.net >= 0 ? `+${power.net}` : power.net} kW), giving your Battery Bank extra margin.`,
    };
  }

  if (challengeId === 'extreme_temperature') {
    const healthy = s.radiatorClosed && s.heaterBoosted;
    return {
      primaryMetricLabel: 'Cabin Temp',
      primaryMetricValue: `${s.habitatTempC}°C`,
      metricAlert: s.habitatTempC < 16 || !healthy,
      equipment: [
        {
          name: 'Crew Habitat Thermal Core',
          purpose: 'Traps 21°C warmth inside while lunar night hits -130°C',
          status: healthy ? 'Working' : 'Needs attention',
          healthy,
        },
      ],
      detailNote:
        'A stuck-open radiator louver lets indoor heat escape into airless space. Closing the louver first lets cabin heaters warm the dome fast.',
    };
  }

  if (challengeId === 'water_shortage') {
    const healthy = s.waterValveFixed && s.waterReserveUsed;
    return {
      primaryMetricLabel: 'Water Tank',
      primaryMetricValue: `${Math.round(s.waterTankPct)}%`,
      metricAlert: s.waterTankPct < 45 || !healthy,
      equipment: [
        {
          name: eq.hasWater ? 'Water Tanks' : 'Habitat Water Loop',
          purpose: 'Loops clean drinking water and feeds the Oxygen Maker',
          status: healthy ? 'Working' : 'Needs attention',
          healthy,
        },
      ],
      detailNote: state.butterfly.processedExtraWater
        ? 'Your Phase 2 processed crater ice provides extra clean water reserve once the pipe valve is sealed.'
        : 'Sealing the loose coupling stops tank pressure loss before opening the lab reserve.',
    };
  }

  if (challengeId === 'life_support') {
    const healthy = s.lifeSupportStep >= 3;
    const equipment: Phase4RelevantEquipment[] = [
      {
        name: eq.hasAir ? 'Air Scrubber' : 'Cabin Air Intake',
        purpose: 'Traps stale CO₂ and filters fine lunar dust',
        status: healthy ? 'Working' : 'Needs attention',
        healthy,
      },
    ];
    if (eq.hasOxygen) {
      equipment.push({
        name: 'Oxygen Maker',
        purpose: 'Replenishes breathable O₂ inside the dome',
        status: s.lifeSupportStep >= 2 ? 'Working' : 'Needs attention',
        healthy: s.lifeSupportStep >= 2,
      });
    }
    return {
      primaryMetricLabel: 'CO₂ / O₂',
      primaryMetricValue: `${s.co2LevelPct}% / ${s.oxygenLevelPct}%`,
      metricAlert: s.co2LevelPct > 1.2 || !healthy,
      equipment,
      detailNote:
        'Electrostatic Moon dust clings to filter screens. Brushing dust away and swapping the cartridge restores steady airflow.',
    };
  }

  // solar_particle_event
  const healthy = s.crewSheltered && s.shieldShutterClosed;
  return {
    primaryMetricLabel: 'Radiation',
    primaryMetricValue: `${s.radiationLevel} mSv`,
    metricAlert: s.radiationLevel > 40 || !healthy,
    equipment: [
      {
        name: eq.hasShielding ? 'Regolith Shield & Core' : 'Habitat Inner Shutters',
        purpose: eq.hasShielding
          ? 'Baked lunar soil barrier + storm shutters block solar particles'
          : 'Thick inner dome shutters shelter crew during solar alerts',
        status: healthy ? 'Working' : 'Needs attention',
        healthy,
      },
    ],
    detailNote: eq.hasShielding
      ? 'Your Phase 3 Regolith Wall already cuts incoming particle exposure—moving crew inside and closing shutters drops risk to safe levels.'
      : 'Even without an outer Regolith Wall, sheltering inside the Habitat core and sealing storm shutters keeps astronauts safe.',
  };
}

export function clearSavedGameState(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SAVE_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
