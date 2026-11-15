import {
  AstroMood,
  Phase4ChallengeId,
  ScienceEntry,
  StructureDefinition,
  StructureType,
  TaskPopupData,
} from './types';

export interface IntroSceneContent {
  id: number;
  label: string;
  headline: string;
  caption: string;
  subDetail?: string;
  mood: AstroMood;
}

export const INTRO_SCENES: IntroSceneContent[] = [
  {
    id: 0,
    label: '1 · Home Planet',
    headline: 'Earth From Space',
    caption: 'Look out across the blackness of space, Commander. Behind those swirling white clouds sits our living Earth—and just ahead waits the silent Moon.',
    subDetail: 'Watch Earth turn gently below before we set course for the lunar South Pole.',
    mood: 'warm',
  },
  {
    id: 1,
    label: '2 · Destination',
    headline: 'Approaching the Moon',
    caption: 'Here is our destination: an ancient, airless world of powdered gray dust, sharp shadows, and craters untouched for billions of years.',
    subDetail: 'Notice how dark the sky stays even in bright sunshine because the Moon has no air.',
    mood: 'warm',
  },
  {
    id: 2,
    label: '3 · Moon Tour (12 Discoveries)',
    headline: 'Explore the Lunar South Pole',
    caption: 'Before we land, let us explore real NASA discoveries side by side with our 3D Moon—from sunlit ridges to freezing craters that may hide ice.',
    subDetail: 'Click through craters, regolith soil, water clues, rovers, and habitats.',
    mood: 'excited',
  },
  {
    id: 3,
    label: '4 · Mission Plan',
    headline: 'Your Four Mission Stages',
    caption: 'First we scout safe ground, next we drill and bake lunar supplies, then we build our connected outpost, and finally we protect our astronauts.',
    subDetail: '1. EXPLORE  ·  2. COLLECT  ·  3. BUILD  ·  4. SURVIVE',
    mood: 'excited',
  },
  {
    id: 4,
    label: '5 · Rover Briefing',
    headline: 'Meet Your Lunar Rover',
    caption: 'Explorers always send a smart rover into steep craters first. Tap any part below to see how my wheels, cameras, robotic arm, and core drill work.',
    subDetail: 'Inspect all 7 working rover systems in 3D.',
    mood: 'warm',
  },
  {
    id: 5,
    label: '6 · Companion',
    headline: 'Name Your Rover Buddy',
    caption: "I'm ASTRO, your lunar scout and mission guide. Keep my name or choose a favorite callsign below, and let's begin Rover Academy together.",
    subDetail: 'Pick a callsign to launch your Moon training.',
    mood: 'celebrating',
  },
];

export const ROVER_NAME_SUGGESTIONS = ['ASTRO', 'Luna', 'Pip', 'Comet', 'Nova'];

export interface TutorialStepContent {
  id: 'look_around' | 'move_rover' | 'learn_map' | 'draw_route' | 'scan_rock' | 'complete';
  stepNumber: number;
  title: string;
  astroBubble: string;
  actionChecklist: string[];
  progressiveHints: [string, string, string];
  highlightTarget: 'camera' | 'drive' | 'map' | 'route' | 'scan';
  confirmMessage: string;
}

export const TUTORIAL_STEPS: Record<TutorialStepContent['id'], TutorialStepContent> = {
  look_around: {
    id: 'look_around',
    stepNumber: 1,
    title: 'Look Around the Moon',
    astroBubble: "Hey Commander! Let's look around our landing spot before we drive.",
    actionChecklist: [
      'Drag the Moon ground to spin the camera',
      'Tap Zoom + or - (or scroll)',
      'Tap any Camera View button below',
    ],
    progressiveHints: [
      'Try dragging your mouse across the gray Moon ground, then tap Zoom In (+) and Top View at the bottom!',
      'Look at the glowing blue buttons at the bottom-left dock: tap + to zoom and Top View to switch cameras!',
      'Easy 3-step check: 1) Drag the 3D Moon view once, 2) Click the magnifying glass (+), 3) Click "Top View".',
    ],
    highlightTarget: 'camera',
    confirmMessage: 'Lovely! Now you can inspect Moon terrain from every angle.',
  },
  move_rover: {
    id: 'move_rover',
    stepNumber: 2,
    title: 'Test Drive Your Rover',
    astroBubble: "My six titanium wheels are warmed up. Let's roll forward across the regolith so we know how steering feels.",
    actionChecklist: ['Drive forward using W / Up Arrow or the ▲ button below'],
    progressiveHints: [
      'Press and hold W (or the Up Arrow key), or hold the ▲ drive pad in the bottom dock.',
      'Find the arrow pad (◄ ▲ ▼ ►) in the bottom bar and hold ▲ to roll forward.',
      'Hold ▲ or the W key for one full second until wheel tracks appear behind me.',
    ],
    highlightTarget: 'drive',
    confirmMessage: 'Smooth driving, Commander! Those six wheels climb craters like a pro.',
  },
  learn_map: {
    id: 'learn_map',
    stepNumber: 3,
    title: 'Check the Mission Map',
    astroBubble: 'To plan safe exploration routes, engineers always check overhead LRO maps first. Open our Mission Map and tap any landmark!',
    actionChecklist: [
      'Tap the Map button at top-right',
      'Tap any crater, ridge, or rock marker inside the map',
    ],
    progressiveHints: [
      'Click the Map button at top-right, then tap any crater, ridge, or rock icon on the map to inspect it.',
      'The Map button sits next to Journal at top-right. Inside the map, click any colored marker dot!',
      'Once Map opens, click "Deep Shadow Crater" or "Bright Highland Rock" on the map to log your first overhead check.',
    ],
    highlightTarget: 'map',
    confirmMessage: 'Well spotted! Watching craters and boulders from above keeps our rover safe.',
  },
  draw_route: {
    id: 'draw_route',
    stepNumber: 4,
    title: 'Draw an Auto-Pilot Path',
    astroBubble: "We can also trace a safe path across the Moon so my computer steers around rocks automatically!",
    actionChecklist: [
      'Tap DRAW PATH at the bottom',
      'Drag a short path starting near the rover',
      'Tap START to watch me roll!',
    ],
    progressiveHints: [
      'Click DRAW PATH at the bottom, drag a short line starting right beside me, then click green START.',
      'Start your line close to the rover and curve gently around gray boulders.',
      'If a line turns red, click Clear, drag a gentle line straight ahead, and click START!',
    ],
    highlightTarget: 'route',
    confirmMessage: 'Navigation locked! Auto-pilot lets us cross wide plains safely.',
  },
  scan_rock: {
    id: 'scan_rock',
    stepNumber: 5,
    title: 'Hold to Scan a Moon Rock',
    astroBubble: "See that glowing rock beside us? Roll close and press-and-hold my laser scanner to read what it is made of!",
    actionChecklist: [
      'Drive close to Nearby Basalt Rock',
      'Press & hold SCAN OBJECT (or hold Space)',
    ],
    progressiveHints: [
      'Drive up to the glowing green ring beside the dark rock, then press and hold SCAN OBJECT.',
      'Roll within 5 meters of Nearby Basalt Rock until SCAN OBJECT turns bright amber.',
      'Click SCAN OBJECT (or press Space), then hold down the Scan button until the laser ring reaches 100%.',
    ],
    highlightTarget: 'scan',
    confirmMessage: 'Discovery logged! Ancient volcanic Moon basalt confirmed!',
  },
  complete: {
    id: 'complete',
    stepNumber: 6,
    title: "You're Ready, Commander!",
    astroBubble: "You mastered driving, mapping, auto-pilot, and laser scanning. Now let's scout the South Pole for our future astronauts!",
    actionChecklist: [
      'Camera look & views',
      'Manual & auto-pilot driving',
      'Mission Map inspection',
      'Hold-to-Scan rock analysis',
    ],
    progressiveHints: ['', '', ''],
    highlightTarget: 'scan',
    confirmMessage: 'Phase 1: EXPLORE is beginning now!',
  },
};

export interface PhaseTutorialInfo {
  phase: 1 | 2 | 3 | 4;
  title: string;
  astroBrief: string;
  steps: string[];
  progressiveHints: [string, string, string];
  guideTarget: string;
}

export const PHASE_TUTORIALS: Record<1 | 2 | 3 | 4, PhaseTutorialInfo> = {
  1: {
    phase: 1,
    title: 'Phase 1 Guide · Scout & Compare',
    astroBrief: 'Explore bright ridges and dark craters so we pick the safest home for our crew.',
    steps: [
      'Drive across 4 Moon zones (watch your live corner minimap!).',
      'Roll near Bright Highland Rock and press-and-hold Scan.',
      'Switch Headlights ON and check Deep Shadow Crater.',
      'Open Site Picker to compare sunlight vs crater water.',
    ],
    progressiveHints: [
      'Follow the glowing target on your corner minimap or open Mission Map anytime.',
      'Use DRAW PATH for smooth auto-pilot driving, then hold Scan beside the bright west rock.',
      'Click Pick Site in the top bar once you scout both a ridge and a crater!',
    ],
    guideTarget: 'scan',
  },
  2: {
    phase: 2,
    title: 'Phase 2 Guide · Drill, Scoop & Bake',
    astroBrief: 'Gather raw soil, frozen crater cores, and sunlight angle readings, then process them in Moon Lab.',
    steps: [
      'Turn Headlights ON, drive into Deep Shadow Crater, and Hold Core Drill.',
      'Scoop loose lunar soil at Soil Scoop Site A or B.',
      'Test Solar Collector angle on Sunlit Peak Ridge.',
      'Open Moon Lab below to turn raw samples into building kits!',
    ],
    progressiveHints: [
      'Check the red/amber Lights button if the dark crater refuses to let you drill.',
      'When near Soil Site or Ridge Beacon, click the amber Action button in the bottom dock.',
      'Open Moon Lab (purple button in bottom bar) once raw samples are in your cargo bin!',
    ],
    guideTarget: 'moonlab',
  },
  3: {
    phase: 3,
    title: 'Phase 3 Guide · Build & Wire Outpost',
    astroBrief: 'Place every module cleanly inside the glowing dotted outlines, then connect power, water, and air lines.',
    steps: [
      'Select Crew Habitat and click its glowing dotted spot (or Place at Spot).',
      'Place Solar Panels, Battery Bank, Water Tanks, Air Scrubber & Oxygen Maker.',
      'Switch to Connect Lines mode and link each unit to Crew Habitat.',
    ],
    progressiveHints: [
      'Look for glowing cyan dotted outlines on the 3D Moon ground—or use "Place at Dotted Preview"!',
      'Solar Panels earn the highest sunlight score on bright high ground.',
      'Tap "Connect Lines" at the bottom-right of the builder dock, then click any module and your Habitat!',
    ],
    guideTarget: 'build_place',
  },
  4: {
    phase: 4,
    title: 'Phase 4 Guide · Visit Station & Protect Crew',
    astroBrief: 'Five space emergencies hit one at a time. Roll to the highlighted station first, then fix its controls!',
    steps: [
      'Watch which outpost station glows amber for the active emergency.',
      'Click the highlighted 3D station—or tap Roll & Inspect Station—to arrive there.',
      'Use the simple station controls to restore power, warmth, water, air, or shielding.',
    ],
    progressiveHints: [
      'First visit the highlighted station on your outpost before controls unlock.',
      'Use the big green "Roll to & Inspect Station" button if the 3D station is off-screen.',
      'Watch the live telemetry bar turn green as each repair step locks in!',
    ],
    guideTarget: 'visit_station',
  },
};

export const PHASE_INTRO_POPUPS: Record<1 | 2 | 3 | 4, TaskPopupData> = {
  1: {
    id: 'phase_1_intro',
    tone: 'new_task',
    badge: 'PHASE 1 · EXPLORE',
    title: 'Explore the South Pole!',
    astroLine: "Let's scout bright ridges and dark craters to pick the best spot for our astronaut home!",
    astroMood: 'excited',
    whatIsHappening: 'Scout the lunar ridges and craters to pick a safe outpost spot.',
    whyItMatters: 'Bright ridges power solar panels; dark craters are freezing cold and may hold water clues.',
    steps: [
      'Explore 4 zones',
      'Scan Bright Highland Rock',
      'Visit Deep Shadow Crater',
      'Pick an Outpost Site',
    ],
    whatHappensNext: 'Next, we collect and process real Moon supplies!',
    ctaLabel: "LET'S EXPLORE!",
    diagramKind: 'sunlight',
    scienceCard: {
      title: 'Why South Pole Light Matters',
      body: 'At the Moon’s South Pole, sunlight arrives at a low sideways angle. High crater rims stay bright for days, while deep crater floors never see the Sun!',
      sourceNote: 'NASA LRO Elevation & Illumination Studies',
    },
  },
  2: {
    id: 'phase_2_intro',
    tone: 'new_task',
    badge: 'PHASE 2 · COLLECT & PROCESS',
    title: 'Gather & Process Moon Supplies!',
    astroLine: "Bringing everything from Earth costs a fortune! Let's scoop Moon soil, drill for water clues, and test solar angles!",
    astroMood: 'excited',
    whatIsHappening: 'Collect raw samples with the rover, then process them in the Moon Lab!',
    whyItMatters: 'Raw soil becomes shielding bricks, ice clues become clean water, and sun data powers our base.',
    steps: [
      'Probe Shadow Crater (headlights ON!)',
      'Scoop lunar soil with robotic arm',
      'Test Solar Collector angle on the ridge',
      'Process samples in the Moon Lab',
    ],
    whatHappensNext: 'Your processed supplies unlock Phase 3 Construction!',
    ctaLabel: 'START GATHERING!',
    diagramKind: 'scanner',
    scienceCard: {
      title: 'In-Situ Resource Utilization (ISRU)',
      body: 'Scientists call living off local Moon materials "ISRU"—turning lunar soil into radiation shields and hunting water ice for drinking and breathable oxygen.',
      sourceNote: 'NASA Artemis Surface Science Principles',
    },
  },
  3: {
    id: 'phase_3_intro',
    tone: 'new_task',
    badge: 'PHASE 3 · ENGINEER & BUILD',
    title: 'Build & Wire Your Lunar Home!',
    astroLine: "Time to build! Place each module where it works best, then connect the cables and pipes!",
    astroMood: 'warm',
    whatIsHappening: 'Place life-support & power modules on good terrain, then connect them together.',
    whyItMatters: 'Every wire and pipe matters—unconnected gear will struggle during Phase 4 emergencies!',
    steps: [
      'Place Habitat, Solar & Battery',
      'Place Water, Air CO₂ & Oxygen',
      'Connect Power, Water & Air lines',
    ],
    whatHappensNext: 'Once wired green, Phase 4 tests your outpost in real Moon emergencies!',
    ctaLabel: 'OPEN BUILDER',
    diagramKind: 'solar',
    scienceCard: {
      title: 'Closed-Loop Outpost Engineering',
      body: 'A lunar base works like a spaceship on the ground: solar arrays charge batteries, scrubbers remove CO₂, and water loops recycle nearly every drop.',
      sourceNote: 'Simulated Outpost Engineering Model',
    },
  },
  4: {
    id: 'phase_4_intro',
    tone: 'new_task',
    badge: 'PHASE 4 · TEST & SURVIVE',
    title: 'Protect Your Outpost!',
    astroLine: "Red alert drills, Commander! Let's jump straight into the equipment bay and keep our astronauts safe!",
    astroMood: 'urgent',
    whatIsHappening: 'Five real lunar challenges will test your outpost—use the controls to fix each system!',
    whyItMatters: 'Your earlier choices (site, shielding, processed water, connections) shape what happens now!',
    steps: [
      'Fix Power Shortage & Extreme Cold',
      'Restore Water & Clean CO₂ Scrubber',
      'Shelter Crew from Solar Particles',
    ],
    whatHappensNext: 'Solve all 5 emergencies to win Mission Beyond Earth!',
    ctaLabel: 'START SURVIVAL TESTS',
    diagramKind: 'particles',
  },
};

export const TASK_POPUPS: Record<string, TaskPopupData> = {
  task_find_water_ice: {
    id: 'task_find_water_ice',
    tone: 'new_task',
    badge: 'NEW TASK · ICE INVESTIGATION',
    title: 'Hunt for Hidden Ice Clues!',
    astroLine: 'Click Headlights ON when we enter that pitch-dark crater, then drill carefully to test for frozen water!',
    astroMood: 'excited',
    whatIsHappening: 'Shadowed craters are icy cold—test probe spots to see which ones actually hold water clues!',
    whyItMatters: 'Clean water lets astronauts drink, grow food, and make breathable oxygen.',
    steps: [
      'Drive to Ice Investigation Spot',
      'Turn ON Headlights inside the crater',
      'Run the Drill Rig & process in Lab',
    ],
    whatHappensNext: 'Next, scoop lunar soil and test solar panel tilt!',
    ctaLabel: "LET'S INVESTIGATE!",
    diagramKind: 'sunlight',
  },
};

export const STRUCTURES: Record<StructureType, StructureDefinition> = {
  habitat: {
    type: 'habitat',
    name: 'Crew Habitat',
    shortRole: 'Astronaut Home Dome',
    astroIntro: 'Astronauts need a cozy, airtight dome to sleep, eat, and stay warm! Put it on flat, safe ground.',
    explanation: 'Pressurized living dome that keeps crew warm in airless space.',
    whyLocationMatters: 'Needs flat terrain (<14° slope) away from boulders.',
    connectionNote: 'Hub for Power, Water, and Air loops.',
    cost: { regolith: 10 },
    powerDelta: -20,
    diagramKind: 'shielding',
  },
  solar: {
    type: 'solar',
    name: 'Solar Panels',
    shortRole: 'Sunlight Power Maker',
    astroIntro: 'These panels collect sunlight and turn it into electricity. Place them in bright light, then connect them to Battery & Habitat!',
    explanation: 'Turns Moon sunlight into clean electricity.',
    whyLocationMatters: 'Bright ridges generate up to 2× more power than dark craters!',
    connectionNote: 'Connect Power cable to Battery or Habitat.',
    needsConnectionTo: ['habitat', 'battery'],
    connectionKind: 'power',
    cost: { sunlightData: 1 },
    powerDelta: 45,
    diagramKind: 'solar',
  },
  battery: {
    type: 'battery',
    name: 'Battery Bank',
    shortRole: 'Energy Storage',
    astroIntro: 'Batteries save extra solar electricity so heaters never shut off when sunlight fades!',
    explanation: 'Stores solar energy for low-sunlight emergencies.',
    whyLocationMatters: 'Place near Solar Panels and Habitat.',
    connectionNote: 'Connect Power cable to Habitat.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'power',
    cost: { sunlightData: 1 },
    powerDelta: 15,
    diagramKind: 'solar',
  },
  water: {
    type: 'water',
    name: 'Water Tanks',
    shortRole: 'Storage & Recycling',
    astroIntro: 'Water is super precious on the Moon! This unit stores clean water and recycles every drop.',
    explanation: 'Stores processed water and recycles cabin moisture.',
    whyLocationMatters: 'Keep right beside Habitat so pipes stay warm!',
    connectionNote: 'Connect Water pipe to Habitat.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'water',
    cost: { waterIceClues: 1 },
    powerDelta: -10,
    diagramKind: 'water',
  },
  air: {
    type: 'air',
    name: 'Air Scrubber',
    shortRole: 'CO₂ Air Cleaner',
    astroIntro: 'Astronauts cannot breathe Moon vacuum! This scrubber pulls stale carbon dioxide (CO₂) out of the cabin air.',
    explanation: 'Removes CO₂ gas so indoor air stays fresh.',
    whyLocationMatters: 'Connects directly to Habitat air loop.',
    connectionNote: 'Connect Air pipe to Habitat.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'air',
    cost: { regolith: 10 },
    powerDelta: -10,
    diagramKind: 'air',
  },
  oxygen: {
    type: 'oxygen',
    name: 'Oxygen Maker',
    shortRole: 'Breathable O₂',
    astroIntro: 'While the scrubber removes stale gas, this Oxygen Maker pumps fresh breathable O₂ into our home!',
    explanation: 'Generates and stores breathable oxygen gas.',
    whyLocationMatters: 'Keep near Water Tanks and Habitat.',
    connectionNote: 'Connect Air pipe to Habitat.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'air',
    cost: { waterIceClues: 1 },
    powerDelta: -10,
    diagramKind: 'air',
  },
  shielding: {
    type: 'shielding',
    name: 'Regolith Wall',
    shortRole: 'Radiation Shield',
    astroIntro: 'Stack our processed Regolith Units into a thick wall to block space radiation and micrometeorites!',
    explanation: 'Thick packed Moon soil blocks energetic space particles.',
    whyLocationMatters: 'Place beside Habitat to boost radiation protection.',
    connectionNote: 'Passive shield—no cable needed!',
    cost: { regolith: 20 },
    powerDelta: 0,
    diagramKind: 'shielding',
  },
  food: {
    type: 'food',
    name: 'Food Pod',
    shortRole: 'Plant Greenhouse',
    astroIntro: 'Grow crisp space veggies under LED lights using our recycled water!',
    explanation: 'Hydroponic dome growing fresh leafy greens.',
    whyLocationMatters: 'Connects to Habitat & Water Tanks.',
    connectionNote: 'Optional morale & food boost.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'water',
    cost: { regolith: 10 },
    powerDelta: -10,
    diagramKind: 'water',
  },
  cable: {
    type: 'cable',
    name: 'Armored Cable',
    shortRole: 'Protected Conduit',
    astroIntro: 'Armored power conduits keep electricity flowing safely even if a tiny pebble hits the ground!',
    explanation: 'Shielded cable hub protecting power lines.',
    whyLocationMatters: 'Prevents heavy cable damage during survival tests.',
    connectionNote: 'Reinforces Power grid.',
    needsConnectionTo: ['habitat'],
    connectionKind: 'power',
    cost: { regolith: 10 },
    powerDelta: 0,
    diagramKind: 'solar',
  },
};

export const INITIAL_SCIENCE_ENTRIES: ScienceEntry[] = [
  {
    id: 'sci_no_atmosphere',
    title: 'Why the Moon’s Sky Is Always Black',
    summary:
      'The Moon has almost no air to scatter sunlight, so the sky stays pitch black even in daytime and shadows look razor-sharp!',
    category: 'Sunlight & Power',
    dataOrigin: 'Archived NASA Science',
    sourceAttribution: 'Apollo Surface Observations & NASA LRO Archive',
    unlocked: true,
  },
  {
    id: 'sci_lunar_dust',
    title: 'Why Dust Doesn’t Blow in Moon Wind',
    summary:
      'With no air, there is zero wind on the Moon. Dust only sprays up when rover wheels, boots, or rockets kick it—and then arcs right back down!',
    category: 'Geology',
    dataOrigin: 'Archived NASA Science',
    sourceAttribution: 'Apollo 11–17 Regolith Mechanics Studies',
    unlocked: false,
  },
  {
    id: 'sci_hydrogen_clues',
    title: 'Hydrogen Clues vs. Confirmed Water Ice',
    summary:
      'NASA missions detected hydrogen signals in freezing South Pole craters. That is an exciting clue, not guaranteed ice—rovers have to drill and test samples directly!',
    category: 'Water Clues',
    dataOrigin: 'Archived NASA Science',
    sourceAttribution: 'NASA Lunar Prospector & LCROSS Observations',
    unlocked: false,
  },
  {
    id: 'sci_south_pole_light',
    title: 'South Pole Sunlight & Cold Craters',
    summary:
      'Near the Moon’s South Pole, the Sun skims sideways near the horizon. Tall crater rims stay lit while deep crater bottoms stay freezing dark.',
    category: 'Sunlight & Power',
    dataOrigin: 'Archived NASA Science',
    sourceAttribution: 'NASA LRO LOLA & Diviner Thermal Data',
    unlocked: false,
  },
  {
    id: 'sci_regolith_shielding',
    title: 'Building Shields From Moon Soil',
    summary:
      'Crushed lunar regolith can be sintered into bricks and stacked around habitats to block space radiation and micrometeorites.',
    category: 'Life Support',
    dataOrigin: 'Simulated Gameplay',
    sourceAttribution: 'Simulated Outpost Engineering Model',
    unlocked: false,
  },
  {
    id: 'sci_space_weather',
    title: 'Solar Particle Alerts vs. Shielding',
    summary:
      'A space-weather alert warns astronauts that solar particles are arriving—then thick habitat shielding protects the crew inside.',
    category: 'Space Weather',
    dataOrigin: 'Archived NASA Science',
    sourceAttribution: 'NASA Space Weather & LRO CRaTER Principles',
    unlocked: false,
  },
];

export interface Phase4ChallengeInfo {
  id: Phase4ChallengeId;
  title: string;
  badge: string;
  astroAlert: string;
  targetStructure: StructureType;
  diagramKind: 'solar' | 'particles' | 'water' | 'air' | 'temperature';
}

export const PHASE4_CHALLENGES: Phase4ChallengeInfo[] = [
  {
    id: 'low_sunlight',
    title: 'Emergency 1 · Power Shortage',
    badge: 'POWER DRAINING',
    astroAlert: "Sunlight dropped across the ridge! Let's open the Power Control Panel, shut off extra lab lights, and switch on Battery Backup!",
    targetStructure: 'battery',
    diagramKind: 'solar',
  },
  {
    id: 'extreme_temperature',
    title: 'Emergency 2 · Freezing Habitat',
    badge: 'TEMP DROPPING',
    astroAlert: "Brrr! Cabin temperature is dropping fast! Check the Thermal Unit, close the stuck radiator valve, and boost the heaters!",
    targetStructure: 'habitat',
    diagramKind: 'temperature',
  },
  {
    id: 'water_shortage',
    title: 'Emergency 3 · Water Tank Low',
    badge: 'WATER SHORTAGE',
    astroAlert: "Water tank levels are sinking! Inspect the Water Recovery unit, tighten the loose pipe valve, and open our processed reserve!",
    targetStructure: 'water',
    diagramKind: 'water',
  },
  {
    id: 'life_support',
    title: 'Emergency 4 · CO₂ Scrubber Clog',
    badge: 'AIR QUALITY ALERT',
    astroAlert: "Fine lunar dust clogged the Air Scrubber! Brush the intake clean, swap the filter cartridge, and restart the fan!",
    targetStructure: 'air',
    diagramKind: 'air',
  },
  {
    id: 'solar_particle_event',
    title: 'Emergency 5 · Solar Particle Storm',
    badge: 'RADIATION WARNING',
    astroAlert: "Space weather alert—fast solar particles incoming! Check the alert, move our astronauts to the inner core, and seal the shield shutters!",
    targetStructure: 'shielding',
    diagramKind: 'particles',
  },
];
