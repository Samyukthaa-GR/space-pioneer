export type AppScreen = 'title' | 'intro' | 'tutorial' | 'playing' | 'paused' | 'victory';

export type MissionPhase = 1 | 2 | 3 | 4;

export type CameraMode = 'follow' | 'roverCam' | 'topDown' | 'routePlan';

export type AstroMood = 'warm' | 'excited' | 'encouraging' | 'urgent' | 'celebrating';

export type RoverAnimState =
  | 'idle'
  | 'driving'
  | 'turning'
  | 'braking'
  | 'climbing'
  | 'descending'
  | 'scanning'
  | 'drilling'
  | 'collecting'
  | 'obstacle'
  | 'damaged'
  | 'lowPower'
  | 'charging'
  | 'victory';

export interface Point2D {
  x: number;
  z: number;
}

export interface PathPoint3D {
  x: number;
  y: number;
  z: number;
  slopeDeg: number;
  valid: boolean;
  issue?: 'boulder' | 'slope' | 'energy' | 'hazard';
}

export interface PathValidationResult {
  valid: boolean;
  reasonCode:
    | 'ok'
    | 'too_short'
    | 'disconnected_start'
    | 'boulder_collision'
    | 'steep_slope'
    | 'hazard_zone'
    | 'insufficient_energy';
  childMessage: string;
  hintAction: string;
  sampledPoints: PathPoint3D[];
  invalidSegmentIndices: number[];
  estimatedDistanceM: number;
  estimatedTimeSec: number;
  estimatedEnergyCost: number;
  traversesRoughRegolith: boolean;
  blockedByBoulderId?: string;
}

export interface BoulderObstacle {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  kind: 'angular' | 'cluster' | 'ridge_rock';
}

export interface RockTarget {
  id: string;
  name: string;
  x: number;
  z: number;
  phase: MissionPhase;
  kind:
    | 'basalt'
    | 'anorthosite'
    | 'regolith_loose'
    | 'hydrogen_clue'
    | 'dry_crater_probe'
    | 'sunlight_beacon';
  shortLabel: string;
  scienceTitle: string;
  scienceFact: string;
  astroReaction: string;
  resourceReward?: Partial<ResourceInventory>;
}

export interface OutpostSite {
  id: 'ridge_haven' | 'crater_rim_shadow';
  name: string;
  x: number;
  z: number;
  sunlightScore: number; // 0..100
  description: string;
  tradeoffNote: string;
}

export interface ResourceInventory {
  // Raw collected resources
  rawSoil: number;
  iceCoreSamples: number;
  solarSurveyCount: number;
  // Processed / construction-ready resources
  waterIceClues: number; // Usable clean water units (kept name for compatibility + processedWater sync)
  processedWater: number;
  regolith: number; // Processed regolith bricks/shielding material
  sunlightData: number; // Stored power kits / calibrated solar units
  storedEnergy: number; // kWh stored in outpost bank
  sciencePoints: number;
}

export type StructureType =
  | 'habitat'
  | 'solar'
  | 'battery'
  | 'water'
  | 'air'
  | 'oxygen'
  | 'shielding'
  | 'food'
  | 'cable';

export type ConnectionKind = 'power' | 'water' | 'air';
export type ConnectionStatus = 'connected' | 'needs_attention' | 'offline';

export interface OutpostConnection {
  id: string;
  fromId: string;
  toId: string;
  kind: ConnectionKind;
  status: ConnectionStatus;
}

export interface StructureDefinition {
  type: StructureType;
  name: string;
  shortRole: string;
  astroIntro: string;
  explanation: string;
  whyLocationMatters: string;
  connectionNote: string;
  needsConnectionTo?: StructureType[];
  connectionKind?: ConnectionKind;
  cost: Partial<ResourceInventory>;
  powerDelta: number; // positive = generates, negative = uses
  diagramKind: DiagramKind;
}

export interface PlacedStructure {
  id: string;
  type: StructureType;
  x: number;
  z: number;
  rotationDeg: number;
  connectedToHabitat: boolean;
  efficiencyPct: number;
  damaged?: boolean;
  status?: ConnectionStatus;
  placedAt?: number;
}

export type DiagramKind =
  | 'sunlight'
  | 'scanner'
  | 'regolith'
  | 'solar'
  | 'shielding'
  | 'water'
  | 'air'
  | 'particles'
  | 'rover_path'
  | 'temperature';

export type NoticeTone = 'new_task' | 'warning' | 'danger' | 'discovery' | 'complete' | 'science';

export interface TaskPopupData {
  id: string;
  tone: NoticeTone;
  badge: string;
  title: string;
  astroLine: string;
  astroMood?: AstroMood;
  whatIsHappening: string;
  whyItMatters: string;
  steps: string[];
  whatHappensNext: string;
  ctaLabel: string;
  diagramKind?: DiagramKind;
  scienceCard?: {
    title: string;
    body: string;
    sourceNote: string;
  };
}

export interface ContextualNotice {
  id: string;
  tone: NoticeTone;
  title: string;
  message: string;
  actionLabel?: string;
}

export interface ScienceEntry {
  id: string;
  title: string;
  summary: string;
  category: 'Geology' | 'Sunlight & Power' | 'Water Clues' | 'Life Support' | 'Space Weather';
  dataOrigin: 'Archived NASA Science' | 'Simulated Gameplay';
  sourceAttribution: string;
  unlocked: boolean;
}

export interface ButterflyFlags {
  tookDustyShortcut: boolean;
  collectedExtraRegolith: boolean;
  processedExtraWater: boolean;
  chosenOutpostSite: 'ridge_haven' | 'crater_rim_shadow' | null;
  installedRegolithShielding: boolean;
  builtBackupBattery: boolean;
  protectedCableRoute: boolean;
  cleanedDustySensors: boolean;
  poorConnectionsCount: number;
}

export type TutorialStepId =
  | 'look_around'
  | 'move_rover'
  | 'learn_map'
  | 'draw_route'
  | 'scan_rock'
  | 'complete';

export interface TutorialProgress {
  step: TutorialStepId;
  rotatedCamera: boolean;
  zoomedCamera: boolean;
  switchedCameraView: boolean;
  movedRover: boolean;
  openedMap: boolean;
  inspectedMapTarget: boolean;
  activatedDrawMode: boolean;
  drewRoute: boolean;
  startedRoute: boolean;
  scannedRock: boolean;
}

export type Phase4ChallengeId =
  | 'low_sunlight'
  | 'extreme_temperature'
  | 'water_shortage'
  | 'life_support'
  | 'solar_particle_event';

export interface RoverMaintenanceIssue {
  id: string;
  component: 'Navigation Camera & Solar Deck' | 'Rocker-Bogie Wheels' | 'Battery Power Cell';
  causeTitle: string;
  whyItHappened: string;
  consequenceIfIgnored: string;
  severity: 'warn' | 'urgent';
}

export interface SurvivalState {
  overviewSeen: boolean;
  currentChallengeIndex: number;
  activeChallenge: Phase4ChallengeId | null;
  stationVisited: boolean;
  resolvedChallenges: Phase4ChallengeId[];
  taughtChallenges: Phase4ChallengeId[];
  lastResolvedChallenge: Phase4ChallengeId | null;
  powerMode: 'balanced' | 'life_support_priority' | 'science_priority';
  batteryDrainPct: number; // live Phase 4 station battery 0..100
  nonEssentialOff: boolean;
  backupBatteryActive: boolean;
  habitatTempC: number;
  radiatorClosed: boolean;
  heaterBoosted: boolean;
  waterTankPct: number;
  waterValveFixed: boolean;
  waterReserveUsed: boolean;
  co2LevelPct: number;
  oxygenLevelPct: number;
  radiationLevel: number; // 0..100 live storm intensity
  crewSheltered: boolean;
  spaceWeatherChecked: boolean;
  shieldShutterClosed: boolean;
  cableRepaired: boolean;
  lifeSupportStep: number; // 0 = inspect, 1 = brush dust, 2 = replace filter, 3 = done
  outpostSafetyPct: number;
}

export interface MissionStepItem {
  id: string;
  label: string;
  completed: boolean;
  hint: string;
  whereHint?: string;
  whyHint?: string;
  whatToTestHint?: string;
  guideTarget?: string;
}

export interface SolarComparisonData {
  ridgeAngleDeg: number;
  ridgeWattage: number;
  shadowWattage: number;
  saved: boolean;
}

export interface GameState {
  screen: AppScreen;
  introScene: number; // 0..5 (0 Earth, 1 Moon, 2 12-item Interactive Moon Tour, 3 Mission Plan, 4 Rover Intro & 7-Part Inspector, 5 Naming)
  introTourTopicIndex: number; // 0..11
  roverPartIndex: number; // 0..6
  roverName: string;
  phase: MissionPhase;
  tutorial: TutorialProgress;
  tutorialCompleted: boolean;
  cameraMode: CameraMode;
  rover: {
    x: number;
    y: number;
    z: number;
    headingRad: number;
    speed: number;
    battery: number; // 0..100
    health: number; // 0..100
    dustLevel: number; // 0..100
    headlightsOn: boolean;
    animState: RoverAnimState;
    distanceDrivenM: number;
    lastIssue: RoverMaintenanceIssue | null;
    repairKits: number;
  };
  roverTrail: Point2D[];
  routePlanning: {
    isDrawingMode: boolean;
    isExecuting: boolean;
    isPaused: boolean;
    rawPoints: Point2D[];
    validation: PathValidationResult | null;
    progressIndex: number;
  };
  exploredCells: string[];
  scannedTargetIds: string[];
  collectedTargetIds: string[];
  processedSampleCount: number;
  visitedCrater: boolean;
  selectedOutpostSite: 'ridge_haven' | 'crater_rim_shadow' | null;
  solarComparison: SolarComparisonData;
  resources: ResourceInventory;
  structures: PlacedStructure[];
  connections: OutpostConnection[];
  phase3IntroSeen: boolean;
  phase4IntroSeen: boolean;
  selectedBuildType: StructureType | null;
  buildMode: 'place' | 'connect';
  connectSourceId: string | null;
  buildRotationDeg: number;
  survival: SurvivalState;
  butterfly: ButterflyFlags;
  scienceJournalIds: string[];
  achievements: string[];
  activePopup: TaskPopupData | null;
  contextualNotice: ContextualNotice | null;
  seenTaskPopups: string[];
  playedNarrationKeys: string[];
  audio: {
    muted: boolean;
    volume: number; // master fallback 0..1
    narrationVolume: number; // 0..1
    musicVolume: number; // 0..1
    sfxVolume: number; // 0..1
    voiceEnabled: boolean;
    captionsEnabled: boolean;
    reducedMotion: boolean;
  };
  lastSavedAt: string | null;
}
