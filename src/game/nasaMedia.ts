export type AstroTopicCategory = 'moon' | 'rover' | 'outpost';

export interface NasaMediaItem {
  id: string;
  title: string;
  category: AstroTopicCategory;
  imageUrl: string;
  nasaId: string;
  missionSource: string;
  officialUrl: string;
  officialLinkLabel: string;
  dataDistinction:
    | 'Archived NASA Photo / LRO Science'
    | 'NASA Hardware Reference (Simulated Outpost Concept)'
    | 'NASA Mars Rover Reference (Curiosity Mastcam — NOT the Moon)';
  simpleExplanation: string;
  funFact: string;
  missionTieIn: string;
  sceneFocus?: {
    x: number;
    z: number;
    camOffsetX: number;
    camOffsetY: number;
    camOffsetZ: number;
    roverPart?: RoverPartId;
  };
}

export type RoverPartId =
  | 'wheels'
  | 'camera'
  | 'arm'
  | 'drill'
  | 'battery'
  | 'instruments'
  | 'antenna';

export interface RoverPartInfo {
  id: RoverPartId;
  name: string;
  shortRole: string;
  simpleExplanation: string;
  funFact: string;
  nasaRefId: string;
  focusOffset: { x: number; y: number; z: number };
}

export const MOON_TOUR_TOPICS: NasaMediaItem[] = [
  {
    id: 'lunar_surface',
    title: '1. Lunar Surface',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/as11-40-5927/as11-40-5927~medium.jpg',
    nasaId: 'as11-40-5927',
    missionSource: 'NASA Apollo 11 Mission (1969)',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'Explore NASA’s Moon Hub',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'The Moon has rocky, dusty ground with no air, rain, or grass. Even in bright sunlight, its sky stays pitch black.',
    funFact: 'Apollo footprints on the Moon can last millions of years because there is zero wind to erase them.',
    missionTieIn: 'In Phase 1, you steer ASTRO across simulated South Pole terrain inspired by NASA elevation data.',
    sceneFocus: { x: 0, z: 10, camOffsetX: 10, camOffsetY: 5.5, camOffsetZ: 12 },
  },
  {
    id: 'craters',
    title: '2. Craters',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA12892/PIA12892~medium.jpg',
    nasaId: 'PIA12892',
    missionSource: 'NASA Lunar Reconnaissance Orbiter (LROC)',
    officialUrl: 'https://science.nasa.gov/mission/lro/',
    officialLinkLabel: 'See NASA LRO Mission Data',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Craters are giant bowls carved when fast space rocks struck the Moon billions of years ago.',
    funFact: 'Some South Pole craters are deeper than Mount Everest is tall!',
    missionTieIn: 'Scout crater rims carefully so your rover avoids steep cliffs.',
    sceneFocus: { x: -22, z: -16, camOffsetX: 14, camOffsetY: 11, camOffsetZ: 14 },
  },
  {
    id: 'regolith',
    title: '3. Regolith (Moon Soil)',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/as11-40-5880/as11-40-5880~medium.jpg',
    nasaId: 'as11-40-5880',
    missionSource: 'NASA Apollo 11 Lunar Soil Close-Up',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'Learn About Lunar Soil',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Regolith is powdery gray crushed rock covering the Moon. It clings to rover wheels and camera lenses.',
    funFact: 'Real Moon dust is sharp like tiny glass crumbs—and astronauts can bake it into solid building blocks!',
    missionTieIn: 'In Phase 2, scoop loose soil and bake it into Regolith Units in your Moon Lab.',
    sceneFocus: { x: 9, z: -9.5, camOffsetX: 7, camOffsetY: 4.5, camOffsetZ: 8 },
  },
  {
    id: 'boulders',
    title: '4. Boulders',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/as17-140-21496/as17-140-21496~medium.jpg',
    nasaId: 'as17-140-21496',
    missionSource: 'NASA Apollo 17 Mission (Station 6 Boulder)',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'Explore NASA Moon Discoveries',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Huge jagged boulders sit scattered around craters, revealing older rock layers from deep underground.',
    funFact: 'Apollo 17 astronauts sampled boulders taller than a school bus!',
    missionTieIn: 'Check your map before plotting auto-pilot lines so your rover steers cleanly around boulders.',
    sceneFocus: { x: -7.5, z: 4.5, camOffsetX: 6.5, camOffsetY: 3.8, camOffsetZ: 7.5 },
  },
  {
    id: 'shadowed_regions',
    title: '5. Permanently Shadowed Regions',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA12905/PIA12905~thumb.jpg',
    nasaId: 'PIA12905',
    missionSource: 'NASA Lunar Reconnaissance Orbiter (South Pole)',
    officialUrl: 'https://science.nasa.gov/moon/lunar-south-pole/',
    officialLinkLabel: 'Explore Lunar South Pole Science',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Low South Pole sunlight never reaches deep crater floors, keeping them pitch-black and freezing cold all year.',
    funFact: 'Permanently shadowed craters can drop below minus 230°C—even colder than Pluto!',
    missionTieIn: 'Turn your rover headlights ON before entering dark craters so sensors can see.',
    sceneFocus: { x: -22, z: -16, camOffsetX: 11, camOffsetY: 7.5, camOffsetZ: 11 },
  },
  {
    id: 'water_ice',
    title: '6. Water Ice Clues',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/ARC-2009-ACD09-0084/ARC-2009-ACD09-0084~medium.jpg',
    nasaId: 'ARC-2009-ACD09-0084',
    missionSource: 'NASA LCROSS Lunar Water Investigation',
    officialUrl: 'https://science.nasa.gov/moon/lunar-south-pole/',
    officialLinkLabel: 'Read NASA South Pole Ice Research',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Freezing shadows trap ancient water molecules mixed as tiny frost grains inside dark soil.',
    funFact: 'Moon water can be cleaned for drinking and split into oxygen so astronauts can breathe!',
    missionTieIn: 'Press and hold your Core Drill inside dark craters—some spots are dry while others hide ice clues.',
    sceneFocus: { x: -20.5, z: -15.5, camOffsetX: 8, camOffsetY: 5, camOffsetZ: 8.5 },
  },
  {
    id: 'lunar_ridges',
    title: '7. Lunar Ridges (Peaks of Light)',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA12937/PIA12937~medium.jpg',
    nasaId: 'PIA12937',
    missionSource: 'NASA LRO Polar Illumination Mapping',
    officialUrl: 'https://science.nasa.gov/mission/lro/',
    officialLinkLabel: 'See NASA LRO Sunlight Maps',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'High ridges around polar craters rise above the shadows and catch steady sunlight for solar power.',
    funFact: 'NASA Artemis planners study bright South Pole ridges as prime places for future astronaut bases!',
    missionTieIn: 'Sunlit Peak Ridge is one of the outpost sites you compare in Phase 1.',
    sceneFocus: { x: 20, z: 16, camOffsetX: 12, camOffsetY: 7.5, camOffsetZ: 12 },
  },
  {
    id: 'solar_panels',
    title: '8. Solar Panels',
    category: 'outpost',
    imageUrl: 'https://images-assets.nasa.gov/image/iss024e007103/iss024e007103~medium.jpg',
    nasaId: 'iss024e007103',
    missionSource: 'NASA International Space Station Solar Array',
    officialUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
    officialLinkLabel: 'Explore NASA Artemis Power Plans',
    dataDistinction: 'NASA Hardware Reference (Simulated Outpost Concept)',
    simpleExplanation:
      'Solar panels catch sunlight and turn it into electricity for heaters, lights, oxygen makers, and rovers.',
    funFact: 'At the Lunar South Pole, panels tilt almost upright because the Sun stays low near the horizon!',
    missionTieIn: 'Drag and tilt a solar collector in Phase 2 to discover peak electric power.',
    sceneFocus: { x: 20, z: 16, camOffsetX: 8, camOffsetY: 5, camOffsetZ: 9 },
  },
  {
    id: 'lunar_rovers',
    title: '9. Lunar Rovers',
    category: 'rover',
    imageUrl: 'https://images-assets.nasa.gov/image/as15-86-11603/as15-86-11603~thumb.jpg',
    nasaId: 'as15-86-11603',
    missionSource: 'NASA Apollo 15 Lunar Roving Vehicle',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'Discover NASA Moon Rovers',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Rovers are electric robot scouts with tough wheels, cameras, and science arms that explore risky spots first.',
    funFact: 'Three battery-powered Apollo rovers are still parked on the Moon today!',
    missionTieIn: 'You and ASTRO explore terrain together and keep dust off solar decks and sensors.',
    sceneFocus: { x: 0, z: 10, camOffsetX: -4.5, camOffsetY: 2.8, camOffsetZ: -6.5 },
  },
  {
    id: 'habitats',
    title: '10. Astronaut Habitats',
    category: 'outpost',
    imageUrl: 'https://images-assets.nasa.gov/image/jsc2024e024190/jsc2024e024190~thumb.jpg',
    nasaId: 'jsc2024e024190',
    missionSource: 'NASA Artemis / Gateway Habitat Concept',
    officialUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
    officialLinkLabel: 'See NASA Artemis Habitats',
    dataDistinction: 'NASA Hardware Reference (Simulated Outpost Concept)',
    simpleExplanation:
      'A lunar habitat is a heated, airtight home where astronauts live safely, cook meals, and sleep.',
    funFact: 'Surrounding habitats with packed Moon soil shields crew from space radiation!',
    missionTieIn: 'In Phase 3, build your Crew Habitat on flat ground and wire life-support lines into it.',
    sceneFocus: { x: 20, z: 16, camOffsetX: 10, camOffsetY: 6.5, camOffsetZ: 11 },
  },
  {
    id: 'life_support',
    title: '11. Life-Support Systems',
    category: 'outpost',
    imageUrl: 'https://images-assets.nasa.gov/image/0101380/0101380~medium.jpg',
    nasaId: '0101380',
    missionSource: 'NASA ISS Life-Support (ECLSS) Reference',
    officialUrl: 'https://www.nasa.gov/humans-in-space/artemis/',
    officialLinkLabel: 'Learn NASA Life-Support Science',
    dataDistinction: 'NASA Hardware Reference (Simulated Outpost Concept)',
    simpleExplanation:
      'Life-support machines scrub stale CO₂ from cabin air, add fresh oxygen, and recycle water.',
    funFact: 'Space stations recycle over 90% of their water—even moisture from astronauts’ breath!',
    missionTieIn: 'In Phase 4, inspect stations directly to clear dusty scrubbers and fix leaky water pipes.',
    sceneFocus: { x: 20, z: 16, camOffsetX: 9, camOffsetY: 5.5, camOffsetZ: 10 },
  },
  {
    id: 'drilling_equipment',
    title: '12. Drilling Equipment',
    category: 'rover',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA17068/PIA17068~thumb.jpg',
    nasaId: 'PIA17068',
    missionSource: 'NASA Planetary Core Drill Reference',
    officialUrl: 'https://science.nasa.gov/mission/lro/',
    officialLinkLabel: 'See NASA Polar Exploration',
    dataDistinction: 'NASA Hardware Reference (Simulated Outpost Concept)',
    simpleExplanation:
      'Core drills bore below frozen surface dust and seal underground soil into sample tubes for testing.',
    funFact: 'Because there is no air or water outside to cool metal bits, space drills work in steady controlled bursts!',
    missionTieIn: 'Press and hold the Core Drill inside Shadowed Craters during Phase 2.',
    sceneFocus: { x: 0, z: 10, camOffsetX: -3.2, camOffsetY: 2.0, camOffsetZ: 4.4 },
  },
];

export const EXTRA_NASA_REFERENCES: NasaMediaItem[] = [
  {
    id: 'basalt_rocks',
    title: 'Volcanic Moon Basalt',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/S73-16007/S73-16007~medium.jpg',
    nasaId: 'S73-16007',
    missionSource: 'NASA Apollo 17 Lunar Rock Sample 72255',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'Explore NASA Moon Rocks',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Dark lunar basalt formed billions of years ago when ancient lava flowed across giant Moon basins and cooled.',
    funFact: 'Volcanic basalt contains iron and titanium—helpful clues about the Moon’s fiery past!',
    missionTieIn: 'Simulated surface rock modeled after dark mare basalt studied by Apollo missions.',
  },
  {
    id: 'anorthosite_highlands',
    title: 'Ancient Highland Anorthosite',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/S71-42955/S71-42955~medium.jpg',
    nasaId: 'S71-42955',
    missionSource: 'NASA Apollo 15 "Genesis Rock" Sample 15415',
    officialUrl: 'https://science.nasa.gov/moon/',
    officialLinkLabel: 'See Apollo 15 Genesis Rock',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Bright white-gray anorthosite is some of the oldest crust on the Moon, floating up from a newborn magma ocean.',
    funFact: 'Apollo 15 astronauts found the famous 4-billion-year-old "Genesis Rock" made of pure anorthosite!',
    missionTieIn: 'Highland ridges help you identify bright, sturdy rock ground for safe driving.',
  },
  {
    id: 'solar_storms',
    title: 'Solar Flares & Particle Storms',
    category: 'outpost',
    imageUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001210/GSFC_20171208_Archive_e001210~medium.jpg',
    nasaId: 'GSFC_20171208_Archive_e001210',
    missionSource: 'NASA Solar Dynamics Observatory (SDO)',
    officialUrl: 'https://science.nasa.gov/sun/solar-storms-and-flares/',
    officialLinkLabel: 'Explore NASA Solar Storm Science',
    dataDistinction: 'Archived NASA Photo / LRO Science',
    simpleExplanation:
      'Bright explosions on the Sun blast fast radiation particles across space—unlike Earth, the Moon has no thick magnetic shield.',
    funFact: 'Space-weather warnings give lunar crews time to shelter inside thick regolith walls!',
    missionTieIn: 'Simulated solar-particle emergency in Phase 4 based on NASA space-weather science.',
  },
  {
    id: 'rover_camera_ref',
    title: 'Rover Navigation & Stereo Camera Reference',
    category: 'rover',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA16798/PIA16798~small.jpg',
    nasaId: 'PIA16798',
    missionSource: 'NASA Mars Curiosity Rover Mastcam (Hardware Reference — NOT the Moon)',
    officialUrl: 'https://images.nasa.gov/details/PIA16798',
    officialLinkLabel: 'View NASA Rover Camera Archive',
    dataDistinction: 'NASA Mars Rover Reference (Curiosity Mastcam — NOT the Moon)',
    simpleExplanation:
      'This real NASA photo shows Mars rover Curiosity’s stereo Mastcam eyes! Future Moon rovers use a very similar tall camera mast to spot craters and boulders.',
    funFact: 'Two stereo lenses side by side measure rock distances in 3D just like your own two eyes!',
    missionTieIn: 'Real Mars camera reference kept separate from our lunar photos—click Rover-Cam anytime to view through your lunar mast.',
    sceneFocus: { x: 0, z: 10, camOffsetX: 2.2, camOffsetY: 2.3, camOffsetZ: 2.5, roverPart: 'camera' },
  },
];

export const ROVER_PARTS: RoverPartInfo[] = [
  {
    id: 'wheels',
    name: 'Wheels & Rocker-Bogie Suspension',
    shortRole: '6-Wheel Moon Climber',
    simpleExplanation:
      'Six cleated titanium wheels flex up and down independently so your rover rolls smoothly over rough rocks.',
    funFact: 'Each wheel uses a quiet electric hub motor—zero engine exhaust!',
    nasaRefId: 'lunar_rovers',
    focusOffset: { x: -2.8, y: 1.2, z: 2.2 },
  },
  {
    id: 'camera',
    name: 'Navigation Camera Mast',
    shortRole: 'Stereo Robot Eyes',
    simpleExplanation:
      'Tall stereo cameras spot boulders, steep crater walls, and switch right into Rover-Cam view.',
    funFact: 'Sharp Moon dust sticks to lenses—so checking camera clarity keeps views crisp!',
    nasaRefId: 'rover_camera_ref',
    focusOffset: { x: 2.2, y: 2.3, z: 2.5 },
  },
  {
    id: 'arm',
    name: 'Robotic Sampling Arm',
    shortRole: 'Moon Soil Scooper',
    simpleExplanation:
      'An articulated robotic arm bends out, scoops loose regolith, and pours samples into the rover cargo bin.',
    funFact: 'Space rover arms bend using shoulder, elbow, and wrist joints just like yours!',
    nasaRefId: 'regolith',
    focusOffset: { x: -2.4, y: 1.6, z: 3.1 },
  },
  {
    id: 'drill',
    name: 'Rotary Core Drill',
    shortRole: 'Underground Ice Hunter',
    simpleExplanation:
      'This gold-tipped core drill spins into frozen crater ground to pull sealed samples for water testing.',
    funFact: 'Pressing and holding lets engineers monitor pressure and temperature underground!',
    nasaRefId: 'drilling_equipment',
    focusOffset: { x: -2.2, y: 1.4, z: 3.6 },
  },
  {
    id: 'battery',
    name: 'Solar Deck & Gold Battery Core',
    shortRole: 'Clean Space Power',
    simpleExplanation:
      'Solar cells recharge an insulated gold-foil battery pack that powers wheels, headlights, and drills.',
    funFact: 'Gold space foil is Multi-Layer Insulation (MLI) that holds warmth in freezing shadow!',
    nasaRefId: 'solar_panels',
    focusOffset: { x: 0.4, y: 2.1, z: -3.4 },
  },
  {
    id: 'instruments',
    name: 'Laser Spectrometer & Headlights',
    shortRole: 'Mineral & Ice Detective',
    simpleExplanation:
      'A blue laser scanner reads rock minerals, while bright LED headlights cut through pitch-black craters.',
    funFact: 'Laser spectrometers identify ancient rock ingredients without even lifting the stone!',
    nasaRefId: 'water_ice',
    focusOffset: { x: 2.6, y: 1.9, z: 2.9 },
  },
  {
    id: 'antenna',
    name: 'Deep-Space Comm Beacon',
    shortRole: 'Earth & Habitat Radio',
    simpleExplanation:
      'The top radio beacon beams discoveries home to Earth and connects your rover to the Moon outpost.',
    funFact: 'Radio waves from the Moon reach Earth in just 1.3 seconds at light speed!',
    nasaRefId: 'habitats',
    focusOffset: { x: 2.8, y: 2.8, z: -2.4 },
  },
];

const ALL_MEDIA = [...MOON_TOUR_TOPICS, ...EXTRA_NASA_REFERENCES];

export function getNasaMediaById(id: string): NasaMediaItem {
  return ALL_MEDIA.find((m) => m.id === id) ?? MOON_TOUR_TOPICS[0];
}

export function getNasaMediaForTargetKind(kind: string): NasaMediaItem {
  if (kind === 'basalt') return getNasaMediaById('basalt_rocks');
  if (kind === 'anorthosite') return getNasaMediaById('anorthosite_highlands');
  if (kind === 'regolith_loose') return getNasaMediaById('regolith');
  if (kind === 'hydrogen_clue') return getNasaMediaById('water_ice');
  if (kind === 'dry_crater_probe') return getNasaMediaById('shadowed_regions');
  if (kind === 'sunlight_beacon') return getNasaMediaById('solar_panels');
  if (kind === 'boulder') return getNasaMediaById('boulders');
  if (kind === 'crater') return getNasaMediaById('shadowed_regions');
  if (kind === 'rover') return getNasaMediaById('lunar_rovers');
  if (kind === 'solar' || kind === 'battery' || kind === 'cable') return getNasaMediaById('solar_panels');
  if (kind === 'water' || kind === 'air' || kind === 'oxygen' || kind === 'food') return getNasaMediaById('life_support');
  if (kind === 'habitat' || kind === 'shielding') return getNasaMediaById('habitats');
  return getNasaMediaById('lunar_surface');
}
