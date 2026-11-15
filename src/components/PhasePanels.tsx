import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BatteryCharging,
  BookOpen,
  Cable,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Eye,
  Flame,
  Hammer,
  Info,
  Lock,
  Play,
  RotateCcw,
  RotateCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { OUTPOST_SITES } from '../game/lunarTerrain';
import { PHASE4_CHALLENGES, STRUCTURES } from '../game/missionData';
import { getNasaMediaById } from '../game/nasaMedia';
import {
  canAffordStructure,
  computePhase3BuildStage,
  evaluatePlacementSuitability,
  getNeededConnectionTargets,
  getOutpostEquipmentStatus,
  getOutpostPowerBalance,
  getPhase4RelevantSystems,
  getProgressiveBuildUnlockSet,
  getRecommendedOutpostSlots,
  getRequiredPhase3Types,
} from '../game/rules';
import {
  GameState,
  Phase4ChallengeId,
  StructureType,
} from '../game/types';
import { NasaReferenceCard } from './NasaReferenceCard';
import { ScienceDiagram } from './ScienceDiagrams';

const SITE_REASONING: Record<
  'ridge_haven' | 'crater_rim_shadow',
  Array<{ label: string; rating: string; status: 'Suitable' | 'Needs attention' | 'Not recommended' }>
> = {
  ridge_haven: [
    { label: 'Sunlight', rating: '92% · High Solar Power', status: 'Suitable' },
    { label: 'Terrain Slope', rating: 'Flat Ridge (~5° slope)', status: 'Suitable' },
    { label: 'Boulders & Hazards', rating: 'Low Boulder Density', status: 'Suitable' },
    { label: 'Distance to Water Clues', rating: '~38m Rover Drive', status: 'Needs attention' },
    { label: 'Rover Access', rating: 'Wide Open Highland Path', status: 'Suitable' },
  ],
  crater_rim_shadow: [
    { label: 'Sunlight', rating: '44% · Long Shadows', status: 'Needs attention' },
    { label: 'Terrain Slope', rating: 'Terraced Rim (~11° slope)', status: 'Needs attention' },
    { label: 'Boulders & Hazards', rating: 'Moderate Crater Rocks', status: 'Needs attention' },
    { label: 'Distance to Water Clues', rating: '~14m Close to Ice Probe', status: 'Suitable' },
    { label: 'Rover Access', rating: 'Steep Rim Beyond Entry', status: 'Not recommended' },
  ],
};

/* 1. Outpost Site Picker Modal (Phase 1 Butterfly Effect Choice + Animated Site Selection Tutorial) */
export const OutpostSiteModal: React.FC<{
  roverName?: string;
  defaultShowTutorial?: boolean;
  onInspectSite?: (siteId: 'ridge_haven' | 'crater_rim_shadow') => void;
  onSelectSite: (siteId: 'ridge_haven' | 'crater_rim_shadow') => void;
  onClose: () => void;
}> = ({
  roverName = 'ASTRO',
  defaultShowTutorial = true,
  onInspectSite,
  onSelectSite,
  onClose,
}) => {
  const [showTutorial, setShowTutorial] = useState(defaultShowTutorial);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose Outpost Location"
        className="max-w-3xl w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-[#081020] border-2 border-amber-400/80 p-5 sm:p-6 shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Site Suitability Evaluation · Simulated Game Assessment
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTutorial((v) => !v);
                audioEngine.speak(
                  !showTutorial
                    ? 'Let us check what makes a Moon site safe: flat ground, bright sunlight, clear paths, and water nearby!'
                    : 'Compare Sunlit Peak Ridge and Shadow Rim Terrace side by side, Commander!',
                  'warm'
                );
              }}
              className="btn-space btn-space-xs btn-space-sky-soft gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {showTutorial ? 'Compare Candidate Sites' : 'Replay Site Tutorial'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close site picker"
              className="btn-space btn-space-icon btn-space-slate"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showTutorial ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-hero text-2xl sm:text-3xl text-white">
                How Engineers Pick a Safe Moon Home
              </h2>
              <p className="text-xs sm:text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5 mt-2">
                <strong className="text-amber-300 mr-1">{roverName}:</strong>
                “Before we lock in our astronaut base, check these 5 Moon clues! Every site trades bright sunlight for crater closeness.”
              </p>
            </div>

            {/* Animated Visual Lesson Card */}
            <svg
              viewBox="0 0 560 156"
              className="w-full h-36 sm:h-40 rounded-2xl bg-[#050a16] border border-slate-700"
            >
              {/* 1. Low Sun + Bright Ridge vs Dark Crater */}
              <circle cx="34" cy="36" r="14" fill="#fbbf24" />
              <line x1="52" y1="38" x2="215" y2="62" stroke="#fde047" strokeWidth="2.5" strokeDasharray="6 4">
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.4s" repeatCount="indefinite" />
              </line>
              <path
                d="M 10 118 L 78 118 L 116 134 L 170 134 L 210 66 L 315 62 L 368 116 L 550 116 L 550 156 L 10 156 Z"
                fill="#334155"
              />
              {/* Shadowed crater interior */}
              <path d="M 86 118 L 116 134 L 170 134 L 194 94 Z" fill="#09101f" />
              <text x="142" y="148" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="700">
                Dark Crater (Ice Clues · Needs Attention)
              </text>

              {/* Flat Ridge Habitat Zone = Suitable */}
              <rect x="236" y="42" width="52" height="20" rx="8" fill="#10b981" fillOpacity="0.28" stroke="#34d399" strokeWidth="2" />
              <text x="262" y="34" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="800">
                ✓ Suitable: Flat + 92% Sun
              </text>

              {/* Boulder Hazard Zone = Not Recommended */}
              <polygon points="390,116 404,92 424,116" fill="#64748b" stroke="#fb7185" strokeWidth="1.5" />
              <polygon points="418,116 430,96 446,116" fill="#475569" stroke="#fb7185" strokeWidth="1.5" />
              <text x="418" y="84" textAnchor="middle" fill="#fda4af" fontSize="9.5" fontWeight="800">
                ✕ Steep / Boulders: Not Recommended
              </text>

              {/* Rover path */}
              <path d="M 292 66 Q 345 104 185 112" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 4">
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="1.2s" repeatCount="indefinite" />
              </path>
              <text x="462" y="140" textAnchor="middle" fill="#cbd5e1" fontSize="9">
                Clear Rover Path ↔ Water Clues
              </text>
            </svg>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl bg-emerald-500/12 border border-emerald-400/50 p-3">
                <div className="font-bold text-emerald-300 mb-1">✓ Suitable</div>
                <p className="text-slate-200 leading-snug">
                  Flat terrain (&lt;12° slope), high polar sunlight, and boulder-free landing space.
                </p>
              </div>
              <div className="rounded-xl bg-amber-500/12 border border-amber-400/50 p-3">
                <div className="font-bold text-amber-300 mb-1">⚠ Needs attention</div>
                <p className="text-slate-200 leading-snug">
                  Extra distance to dark ice craters—or lower sunlight requiring bigger batteries!
                </p>
              </div>
              <div className="rounded-xl bg-rose-500/12 border border-rose-400/50 p-3">
                <div className="font-bold text-rose-300 mb-1">✕ Not recommended</div>
                <p className="text-slate-200 leading-snug">
                  Steep crater walls (&gt;20°), big boulder fields, or pitch-black pit floors.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  audioEngine.speak(
                    'A suitable Moon home sits on flat bright ground with clear rover paths, while steep rocky slopes and deep dark floors need extra care!',
                    'warm'
                  )
                }
                className="btn-space btn-space-sm btn-space-slate gap-1.5 text-sky-200"
              >
                <Volume2 className="w-4 h-4 text-sky-400" />
                Hear {roverName} Explain
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playArmMove();
                  setShowTutorial(false);
                }}
                className="btn-space btn-space-md btn-space-amber gap-2 font-bold"
              >
                Compare Candidate Sites →
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-hero text-2xl sm:text-3xl text-white mb-1.5">
              Where Should Astronauts Build Their Home?
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mb-4">
              Compare all 5 engineering factors before confirming—your choice changes solar power and water trips later! (Simulated South Pole terrain based on NASA LRO elevation &amp; illumination data.)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OUTPOST_SITES.map((site) => {
                const criteria = SITE_REASONING[site.id];
                return (
                  <div
                    key={site.id}
                    className="rounded-2xl bg-slate-900 border border-slate-700 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-display font-bold text-lg text-white">{site.name}</span>
                        <span
                          className={`font-mono-num text-xs font-bold px-2.5 py-1 rounded-full ${
                            site.sunlightScore > 70
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-sky-500/20 text-sky-300'
                          }`}
                        >
                          {site.sunlightScore}% Sun
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mb-3">{site.description}</p>

                      {/* 5-Factor Suitability Table with Suitable / Needs attention / Not recommended tags */}
                      <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-2.5 space-y-1.5 mb-2.5">
                        {criteria.map((c) => {
                          const pillCls =
                            c.status === 'Suitable'
                              ? 'text-emerald-300'
                              : c.status === 'Needs attention'
                              ? 'text-amber-300'
                              : 'text-rose-300';
                          return (
                            <div key={c.label} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-400 font-semibold">{c.label}</span>
                              <span className={`${pillCls} font-bold text-right`}>
                                {c.rating} · <span className="text-[10px] opacity-85">({c.status})</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-snug">{site.tradeoffNote}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {onInspectSite && (
                        <button
                          type="button"
                          onClick={() => onInspectSite(site.id)}
                          className="btn-space btn-space-sm btn-space-slate w-full gap-1.5 text-sky-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect {site.name} in 3D
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectSite(site.id)}
                        className="btn-space btn-space-md btn-space-amber w-full font-bold"
                      >
                        Confirm {site.name}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* 2. Phase 3 Guided Engineer & Connect Bottom Palette */
const BUILD_ORDER: StructureType[] = [
  'habitat',
  'solar',
  'battery',
  'water',
  'air',
  'oxygen',
  'shielding',
  'food',
  'cable',
];

const BUILD_RESOURCE_INFO: Record<
  'regolith' | 'water' | 'solar' | 'energy',
  { label: string; origin: string; builds: string; astroLine: string }
> = {
  regolith: {
    label: 'Regolith Units (Processed Soil)',
    origin: 'Scooped from lunar soil deposits in Phase 2 and baked in the Moon Lab kiln.',
    builds: 'Crew Habitat, Air Scrubber, Radiation Wall, Food Pod & Armored Cable.',
    astroLine: 'We bake powdered Moon soil into super-tough Regolith Units to build domes and block space radiation!',
  },
  water: {
    label: 'Processed Water',
    origin: 'Drilled from Deep Shadow Crater ice clues and purified in your Moon Lab.',
    builds: 'Water Tanks, Oxygen Maker & astronaut drinking reserve.',
    astroLine: 'Processed Moon water keeps astronauts hydrated AND splits into breathable oxygen gas!',
  },
  solar: {
    label: 'Solar Kits',
    origin: 'Measured on Sunlit Peak Ridge and calibrated in your Solar Power Bank.',
    builds: 'Solar Panels and Backup Battery Bank.',
    astroLine: 'Solar Kits unfold into angled panels and batteries that keep heaters and air pumps running!',
  },
  energy: {
    label: 'Stored Energy (kWh)',
    origin: 'Charged by your Solar Surveys and topped up once Solar Panels are wired.',
    builds: 'Powers every connected module during low-sunlight emergencies.',
    astroLine: 'Stored kilowatt-hours save our base whenever shadows creep across the solar field!',
  },
};

export const BuildPaletteDock: React.FC<{
  state: GameState;
  onSelectType: (t: StructureType) => void;
  onSetBuildMode: (mode: 'place' | 'connect') => void;
  onPlaceAtRecommendedSlot: (type: StructureType) => void;
  onConnectStructurePair: (fromId: string, toId: string) => void;
  onAutoConnectAll: () => void;
  onRotate: () => void;
  onRemoveLast: () => void;
  onCollectBonusRegolith: () => void;
  onFocusOverview?: () => void;
  onReplayBuildIntro?: () => void;
  onExplainModule?: (type: StructureType) => void;
}> = ({
  state,
  onSelectType,
  onSetBuildMode,
  onPlaceAtRecommendedSlot,
  onConnectStructurePair,
  onAutoConnectAll,
  onRotate,
  onRemoveLast,
  onCollectBonusRegolith,
  onFocusOverview,
  onReplayBuildIntro,
  onExplainModule,
}) => {
  const [selectedResourceKey, setSelectedResourceKey] = useState<
    'regolith' | 'water' | 'solar' | 'energy' | null
  >(null);
  const [showAllModules, setShowAllModules] = useState(false);
  const selected = state.selectedBuildType ?? 'habitat';
  const def = STRUCTURES[selected];
  const affordable = canAffordStructure(state.resources, selected);
  const power = getOutpostPowerBalance(state.structures, false);
  const habitat = state.structures.find((s) => s.type === 'habitat');
  const neededConns = getNeededConnectionTargets(state.structures, state.connections);
  const openConns = neededConns.filter((c) => !c.connected);
  const connectedCount = neededConns.filter((c) => c.connected).length;
  const requiredTypes = getRequiredPhase3Types();
  const builtRequiredCount = requiredTypes.filter((t) => state.structures.some((s) => s.type === t)).length;
  const proposedLeftCount = Math.max(0, requiredTypes.length - builtRequiredCount);
  const recommendedSlot = getRecommendedOutpostSlots(state.selectedOutpostSite).find(
    (slot) => slot.type === selected && !state.structures.some((s) => s.type === selected)
  );
  const roverSuit = evaluatePlacementSuitability(selected, state.rover.x, state.rover.z, state.structures);
  const resourceInfo = selectedResourceKey ? BUILD_RESOURCE_INFO[selectedResourceKey] : null;
  const buildStage = computePhase3BuildStage(state.structures, state.connections);
  const unlockedModules = getProgressiveBuildUnlockSet(showAllModules ? 5 : buildStage);

  return (
    <div className="w-full max-w-4xl mx-auto max-h-[42vh] overflow-y-auto rounded-2xl bg-[#081122]/94 border border-emerald-400/55 p-2.5 sm:p-3 shadow-2xl pointer-events-auto relative">
      {/* Clickable Build Resource Info Popover */}
      {resourceInfo && (
        <div className="mb-2 rounded-xl bg-slate-900 border-2 border-sky-400/80 p-2.5 text-xs flex flex-wrap items-start justify-between gap-2 animate-tip-pop">
          <div className="flex-1 min-w-[200px] space-y-0.5">
            <div className="font-display font-bold text-sky-300">{resourceInfo.label}</div>
            <div className="text-slate-200">{resourceInfo.origin}</div>
            <div className="text-[11px] text-amber-200">
              <strong>Used For:</strong> {resourceInfo.builds}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => audioEngine.speak(resourceInfo.astroLine, 'warm')}
              className="btn-space btn-space-xs btn-space-sky-soft gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Hear {state.roverName}
            </button>
            <button
              type="button"
              onClick={() => setSelectedResourceKey(null)}
              aria-label="Close resource explanation"
              className="btn-space btn-space-icon btn-space-slate"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSetBuildMode('place')}
            className={`btn-space btn-space-xs gap-1.5 font-bold ${
              state.buildMode === 'place' ? 'btn-space-emerald' : 'btn-space-slate'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            1. Place Modules
          </button>

          <button
            type="button"
            data-guide-target="build_connect"
            onClick={() => onSetBuildMode('connect')}
            className={`btn-space btn-space-xs gap-1.5 font-bold ${
              state.buildMode === 'connect'
                ? 'btn-space-sky'
                : openConns.length > 0
                ? 'btn-space-sky-soft'
                : 'btn-space-slate'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            2. Connect Lines {openConns.length > 0 ? `(${openConns.length} left)` : '✓'}
          </button>

          {onFocusOverview && (
            <button
              type="button"
              onClick={onFocusOverview}
              className={`btn-space btn-space-xs gap-1 font-bold ${
                state.cameraMode === 'topDown' ? 'btn-space-amber' : 'btn-space-slate'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              {state.cameraMode === 'topDown' ? 'Overview ON' : 'Overview'}
            </button>
          )}

          {onReplayBuildIntro && (
            <button
              type="button"
              onClick={onReplayBuildIntro}
              className="btn-space btn-space-xs btn-space-slate gap-1 text-cyan-200"
            >
              <RotateCcw className="w-3 h-3" />
              Build Story
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 font-semibold flex items-center gap-1.5">
            <span className="text-cyan-300">◌ Proposed: {proposedLeftCount}</span>
            <span className="text-slate-600">·</span>
            <span className="text-amber-300">● Placed: {builtRequiredCount}/6</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-300">✦ Connected: {connectedCount}/5</span>
          </span>
          <span className="font-mono-num px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
            Net: {power.net >= 0 ? `+${power.net}` : power.net} kW
          </span>
          {state.buildMode === 'place' && (
            <button
              type="button"
              onClick={onRotate}
              className="btn-space btn-space-xs btn-space-slate gap-1"
            >
              <RotateCw className="w-3 h-3" />
              {state.buildRotationDeg}°
            </button>
          )}
          {state.structures.length > 0 && (
            <button
              type="button"
              onClick={onRemoveLast}
              className="btn-space btn-space-xs btn-space-rose-soft gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Interactive Clickable Resource Strip + Energy Flow Chain */}
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-[11px]">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mr-1">
            Supplies (tap to inspect):
          </span>
          <button
            type="button"
            onClick={() => setSelectedResourceKey((k) => (k === 'regolith' ? null : 'regolith'))}
            className={`px-2 py-0.5 rounded-lg border font-mono-num cursor-pointer ${
              selectedResourceKey === 'regolith'
                ? 'bg-orange-500/25 border-orange-400 text-orange-200'
                : 'bg-slate-900 border-slate-700 text-orange-300 hover:border-orange-400/60'
            }`}
          >
            {state.resources.regolith} Regolith
          </button>
          <button
            type="button"
            onClick={() => setSelectedResourceKey((k) => (k === 'water' ? null : 'water'))}
            className={`px-2 py-0.5 rounded-lg border font-mono-num cursor-pointer ${
              selectedResourceKey === 'water'
                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                : 'bg-slate-900 border-slate-700 text-sky-300 hover:border-sky-400/60'
            }`}
          >
            {state.resources.waterIceClues} Water
          </button>
          <button
            type="button"
            onClick={() => setSelectedResourceKey((k) => (k === 'solar' ? null : 'solar'))}
            className={`px-2 py-0.5 rounded-lg border font-mono-num cursor-pointer ${
              selectedResourceKey === 'solar'
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-amber-300 hover:border-amber-400/60'
            }`}
          >
            {state.resources.sunlightData} Solar Kits
          </button>
          <button
            type="button"
            onClick={() => setSelectedResourceKey((k) => (k === 'energy' ? null : 'energy'))}
            className={`px-2 py-0.5 rounded-lg border font-mono-num cursor-pointer ${
              selectedResourceKey === 'energy'
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-emerald-300 hover:border-emerald-400/60'
            }`}
          >
            {state.resources.storedEnergy} kWh
          </button>
        </div>

        <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-[10px] sm:text-[11px]">
          <span className="text-amber-300">☀ Sun</span>
          <span className="text-slate-500">→</span>
          <span className={state.structures.some((s) => s.type === 'solar') ? 'text-sky-300' : 'text-slate-400'}>
            Panels ({power.generated} kW)
          </span>
          <span className="text-slate-500">→</span>
          <span className={state.structures.some((s) => s.type === 'battery') ? 'text-emerald-300' : 'text-slate-400'}>
            Power (+{power.batteryBonus})
          </span>
          <span className="text-slate-500">→</span>
          <span className={connectedCount >= 5 ? 'text-emerald-300' : 'text-amber-200'}>
            Base ({power.used} kW)
          </span>
        </div>
      </div>

      {state.buildMode === 'place' ? (
        <>
          {/* Concise ASTRO Guided Card + 1-Click Dotted Preview Placement */}
          <div className="mb-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex-1 min-w-[200px]">
              <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
              “{def.astroIntro}”
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                  roverSuit.grade === 'great'
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                    : roverSuit.grade === 'okay'
                    ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                    : 'bg-rose-500/15 border-rose-400 text-rose-200'
                }`}
              >
                {roverSuit.headline}
              </span>
              {onExplainModule && (
                <button
                  type="button"
                  onClick={() => onExplainModule(selected)}
                  className="btn-space btn-space-xs btn-space-sky-soft gap-1 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explain
                </button>
              )}
              {recommendedSlot && affordable && (
                <button
                  type="button"
                  data-guide-target="build_place"
                  onClick={() => onPlaceAtRecommendedSlot(selected)}
                  className="btn-space btn-space-xs btn-space-cyan font-bold shrink-0"
                >
                  Place at Dotted Preview
                </button>
              )}
              {!affordable && (
                <button
                  type="button"
                  onClick={onCollectBonusRegolith}
                  className="btn-space btn-space-xs btn-space-amber font-bold shrink-0"
                >
                  Supply Kit
                </button>
              )}
            </div>
          </div>

          {buildStage < 5 && (
            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
              <span>
                Step-by-Step Unlock ({buildStage + 1}/6): Place current modules to reveal the next units!
              </span>
              <button
                type="button"
                onClick={() => setShowAllModules((v) => !v)}
                className="text-cyan-300 hover:underline font-bold cursor-pointer shrink-0"
              >
                {showAllModules ? 'Step Mode' : 'Show All 9'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5">
            {BUILD_ORDER.map((t) => {
              const item = STRUCTURES[t];
              const placedCount = state.structures.filter((s) => s.type === t).length;
              const unlocked = unlockedModules.has(t) || placedCount > 0;
              const ok = canAffordStructure(state.resources, t);
              const isSel = selected === t;
              const costStr = [
                item.cost.regolith ? `${item.cost.regolith} Regolith` : '',
                item.cost.waterIceClues ? `${item.cost.waterIceClues} Water` : '',
                item.cost.sunlightData ? `${item.cost.sunlightData} Solar` : '',
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <button
                  key={t}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectType(t)}
                  className={`p-2 rounded-xl border text-left transition-colors ${
                    !unlocked
                      ? 'bg-slate-950/60 border-slate-800/70 text-slate-600 cursor-not-allowed'
                      : isSel
                      ? 'bg-emerald-500/20 border-emerald-400 text-white cursor-pointer'
                      : ok
                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 cursor-pointer'
                      : 'bg-slate-950 border-slate-800 text-slate-400 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold leading-tight truncate">{item.name}</span>
                    {!unlocked ? (
                      <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                    ) : placedCount > 0 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : null}
                  </div>
                  <div className="text-[10px] text-amber-300/90 font-mono-num mt-0.5 truncate">
                    {!unlocked ? 'Next Step' : costStr || 'Free'}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Connect Lines Mode: Green (Connected) / Yellow (Needs Check) / Red (Offline) */
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-sky-400/40 text-xs">
            <span className="text-sky-100">
              <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
              {state.connectSourceId
                ? 'Now click the Habitat in 3D (or click below) to finish wiring!'
                : 'Click any placed module in 3D—or tap its status tile below—to wire Power, Water, and Air!'}
            </span>
            {openConns.length > 0 && habitat && (
              <button
                type="button"
                onClick={onAutoConnectAll}
                className="btn-space btn-space-sm btn-space-emerald font-bold shrink-0"
              >
                Quick-Wire All ({openConns.length})
              </button>
            )}
          </div>

          {!habitat ? (
            <div className="text-xs text-amber-300 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/40">
              Place your Crew Habitat first so modules have a central home to connect to!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
              {neededConns.map(({ from, to, kind, connected }) => {
                const label = STRUCTURES[from.type].name;
                const statusBadge = connected
                  ? 'Connected'
                  : from.damaged
                  ? 'Offline'
                  : 'Needs Check';
                const statusStyle = connected
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                  : from.damaged
                  ? 'bg-rose-500/15 border-rose-500 text-rose-200'
                  : 'bg-amber-500/15 border-amber-400 text-amber-200';
                return (
                  <button
                    key={from.id}
                    type="button"
                    disabled={connected}
                    onClick={() => onConnectStructurePair(from.id, to.id)}
                    className={`p-2 rounded-xl border text-left text-xs cursor-pointer ${statusStyle}`}
                  >
                    <div className="font-bold truncate">{label}</div>
                    <div className="flex items-center justify-between mt-0.5 text-[10px] font-semibold">
                      <span className="uppercase">{kind}</span>
                      <span>{statusBadge}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* 3. Phase 4 Outpost Overview + Simplified Adjustable Bottom Drawer */
export const SurvivalChallengeModal: React.FC<{
  state: GameState;
  panelExpanded?: boolean;
  onTogglePanelExpanded?: (expanded: boolean) => void;
  onStartSimulation: () => void;
  onVisitStation: (targetType: StructureType) => void;
  onReplayLesson?: (challengeId: Phase4ChallengeId) => void;
  onAction: (action:
    | 'p1_non_essential_off'
    | 'p1_backup_battery'
    | 'p2_close_radiator'
    | 'p2_boost_heaters'
    | 'p3_tighten_valve'
    | 'p3_open_reserve'
    | 'p4_scrubber_step'
    | 'p5_check_weather'
    | 'p5_shelter_crew'
    | 'p5_close_shutters'
  ) => void;
}> = ({
  state,
  panelExpanded,
  onTogglePanelExpanded,
  onStartSimulation,
  onVisitStation,
  onReplayLesson,
  onAction,
}) => {
  const s = state.survival;
  const [localExpanded, setLocalExpanded] = useState(false);
  const [showScienceDetails, setShowScienceDetails] = useState(false);
  const dragStartYRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef<number>(0);

  const expanded = panelExpanded ?? localExpanded;
  const setExpanded = (next: boolean) => {
    setLocalExpanded(next);
    onTogglePanelExpanded?.(next);
  };

  // Step 0 of Phase 4: Present complete Outpost Overview using actual Phase 3 modules
  if (!s.overviewSeen) {
    const eq = getOutpostEquipmentStatus(state.structures, state.connections);
    const builtSummary = [
      { label: 'Crew Habitat', count: state.structures.filter((m) => m.type === 'habitat').length, role: 'Pressurized home & shelter core' },
      { label: 'Solar Panels', count: state.structures.filter((m) => m.type === 'solar').length, role: eq.solarConnected ? 'Connected & powering base!' : 'Turns polar sunlight into electricity' },
      { label: 'Battery Bank', count: state.structures.filter((m) => m.type === 'battery').length, role: 'Backup power during deep shadow' },
      { label: 'Water & Oxygen', count: state.structures.filter((m) => m.type === 'water' || m.type === 'oxygen').length, role: 'Clean drinking water & breathable O₂' },
      { label: 'Air Scrubber', count: state.structures.filter((m) => m.type === 'air').length, role: 'Filters CO₂ and lunar dust' },
      { label: 'Regolith Shield', count: state.structures.filter((m) => m.type === 'shielding').length, role: eq.hasShielding ? 'Blocks space radiation particles!' : 'Not built (Core Shutters ready)' },
    ];

    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[calc(100vw-1.5rem)] pointer-events-auto">
        <div className="rounded-3xl bg-[#081020]/96 border-2 border-emerald-400 p-5 shadow-2xl space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Phase 4 · Completed Outpost Overview
            </span>
            <span className="font-mono-num text-xs text-sky-300">
              {state.structures.length} Modules · {state.connections.length} Connections
            </span>
          </div>

          <h3 className="font-hero text-2xl text-white">Your Built Lunar Outpost</h3>
          <p className="text-xs sm:text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
            <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
            “Every system you built is online! Before each test begins, I will teach you how that system works first!”
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {builtSummary.map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-white mb-0.5">
                  <span>{item.label}</span>
                  <span className={item.count > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                    {item.count > 0 ? `×${item.count}` : 'None'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">{item.role}</div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onStartSimulation}
            className="btn-space btn-space-lg btn-space-amber w-full gap-2 font-bold"
          >
            <Play className="w-5 h-5 fill-current" />
            Begin Lesson 1: How Power Works
          </button>
        </div>
      </div>
    );
  }

  const challengeId: Phase4ChallengeId = s.activeChallenge ?? 'low_sunlight';
  const info = PHASE4_CHALLENGES.find((c) => c.id === challengeId) ?? PHASE4_CHALLENGES[0];
  const systems = getPhase4RelevantSystems(state, challengeId);
  const primaryEquip = systems.equipment[0];

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragStartYRef.current = e.clientY;
    dragDeltaYRef.current = 0;
  };

  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragStartYRef.current === null) return;
    dragDeltaYRef.current = e.clientY - dragStartYRef.current;
  };

  const handleDragEnd = () => {
    if (dragStartYRef.current === null) return;
    const dy = dragDeltaYRef.current;
    dragStartYRef.current = null;
    dragDeltaYRef.current = 0;
    if (Math.abs(dy) < 6) {
      setExpanded(!expanded);
    } else if (dy < -24) {
      setExpanded(true);
    } else if (dy > 24) {
      setExpanded(false);
    }
  };

  const renderDirectActions = (compact: boolean) => {
    if (!s.stationVisited) {
      return (
        <button
          type="button"
          data-guide-target="visit_station"
          onClick={() => onVisitStation(info.targetStructure)}
          className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} btn-space-emerald w-full gap-2 font-bold`}
        >
          <Compass className="w-4 h-4" />
          Roll to &amp; Inspect {STRUCTURES[info.targetStructure].name}
        </button>
      );
    }

    if (challengeId === 'low_sunlight') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={s.nonEssentialOff}
            onClick={() => onAction('p1_non_essential_off')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.nonEssentialOff ? 'btn-space-emerald-soft' : 'btn-space-amber'
            }`}
          >
            <Zap className="w-4 h-4" />
            {s.nonEssentialOff ? '1. Extra Lights OFF ✓' : '1. Switch Off Extra Lights'}
          </button>
          <button
            type="button"
            disabled={!s.nonEssentialOff}
            onClick={() => onAction('p1_backup_battery')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.nonEssentialOff ? 'btn-space-emerald' : 'btn-space-slate'
            }`}
          >
            <BatteryCharging className="w-4 h-4" />
            2. Switch On Backup Battery
          </button>
        </div>
      );
    }

    if (challengeId === 'extreme_temperature') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={s.radiatorClosed}
            onClick={() => onAction('p2_close_radiator')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.radiatorClosed ? 'btn-space-emerald-soft' : 'btn-space-sky'
            }`}
          >
            <Wrench className="w-4 h-4" />
            {s.radiatorClosed ? '1. Radiator Closed ✓' : '1. Close Stuck Radiator'}
          </button>
          <button
            type="button"
            disabled={!s.radiatorClosed}
            onClick={() => onAction('p2_boost_heaters')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.radiatorClosed ? 'btn-space-amber' : 'btn-space-slate'
            }`}
          >
            <Flame className="w-4 h-4" />
            2. Boost Heaters (21°C)
          </button>
        </div>
      );
    }

    if (challengeId === 'water_shortage') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            disabled={s.waterValveFixed}
            onClick={() => onAction('p3_tighten_valve')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.waterValveFixed ? 'btn-space-emerald-soft' : 'btn-space-sky'
            }`}
          >
            <Wrench className="w-4 h-4" />
            {s.waterValveFixed ? '1. Valve Tightened ✓' : '1. Tighten Loose Valve'}
          </button>
          <button
            type="button"
            disabled={!s.waterValveFixed}
            onClick={() => onAction('p3_open_reserve')}
            className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} gap-1.5 font-bold ${
              s.waterValveFixed ? 'btn-space-emerald' : 'btn-space-slate'
            }`}
          >
            <Droplets className="w-4 h-4" />
            2. Open Water Reserve
          </button>
        </div>
      );
    }

    if (challengeId === 'life_support') {
      return (
        <button
          type="button"
          onClick={() => onAction('p4_scrubber_step')}
          className={`btn-space ${compact ? 'btn-space-sm' : 'btn-space-md'} btn-space-cyan w-full gap-2 font-bold`}
        >
          <Wind className="w-4 h-4" />
          {s.lifeSupportStep === 0 && '1. Inspect Clogged Scrubber Intake'}
          {s.lifeSupportStep === 1 && '2. Brush Dust & Swap Filter Cartridge'}
          {s.lifeSupportStep >= 2 && '3. Restart Air Scrubber Fan'}
        </button>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          disabled={s.spaceWeatherChecked}
          onClick={() => onAction('p5_check_weather')}
          className={`btn-space ${compact ? 'btn-space-xs' : 'btn-space-sm'} font-bold ${
            s.spaceWeatherChecked ? 'btn-space-emerald-soft' : 'btn-space-sky'
          }`}
        >
          {s.spaceWeatherChecked ? '1. Alert Checked ✓' : '1. Check Solar Alert'}
        </button>
        <button
          type="button"
          disabled={!s.spaceWeatherChecked || s.crewSheltered}
          onClick={() => onAction('p5_shelter_crew')}
          className={`btn-space ${compact ? 'btn-space-xs' : 'btn-space-sm'} font-bold ${
            s.crewSheltered
              ? 'btn-space-emerald-soft'
              : s.spaceWeatherChecked
              ? 'btn-space-amber'
              : 'btn-space-slate'
          }`}
        >
          {s.crewSheltered ? '2. Crew Sheltered ✓' : '2. Shelter Crew'}
        </button>
        <button
          type="button"
          disabled={!s.crewSheltered}
          onClick={() => onAction('p5_close_shutters')}
          className={`btn-space ${compact ? 'btn-space-xs' : 'btn-space-sm'} gap-1 font-bold ${
            s.crewSheltered ? 'btn-space-emerald' : 'btn-space-slate'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          3. Close Shutters
        </button>
      </div>
    );
  };

  return (
    <div
      data-testid="phase4-drawer"
      data-expanded={expanded ? 'true' : 'false'}
      className="fixed bottom-[8.25rem] sm:bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] pointer-events-auto transition-all duration-200"
    >
      <div className="rounded-3xl bg-[#071124]/98 border-2 border-amber-400/85 shadow-2xl overflow-hidden">
        {/* Adjustable Drag Handle & Expand/Collapse Bar */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Minimize survival control panel' : 'Expand survival control panel'}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className="w-full px-4 py-2 bg-slate-900/90 hover:bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between gap-2 cursor-ns-resize touch-none"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            Test {s.resolvedChallenges.length + 1}/5 · {info.title}
          </span>
          <span className="w-10 h-1.5 rounded-full bg-slate-500/80 hidden sm:inline-block" aria-hidden="true" />
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-200">
            {expanded ? (
              <>
                Minimize
                <ChevronDown className="w-4 h-4 text-sky-300" />
              </>
            ) : (
              <>
                Expand Details
                <ChevronUp className="w-4 h-4 text-sky-300" />
              </>
            )}
          </span>
        </button>

        {!expanded ? (
          /* Collapsed Slim Bar: Keeps 3D Outpost & Astronauts Clearly Visible */
          <div className="px-3.5 py-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`font-mono-num text-xs font-bold px-2.5 py-1 rounded-xl border ${
                    systems.metricAlert
                      ? 'bg-rose-500/20 border-rose-400/70 text-rose-200'
                      : 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
                  }`}
                >
                  {systems.primaryMetricLabel}: {systems.primaryMetricValue}
                </span>
                {primaryEquip && (
                  <span className="text-xs text-slate-200 truncate">
                    <strong className="text-white">{primaryEquip.name}</strong> ·{' '}
                    <span className={primaryEquip.healthy ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                      {primaryEquip.status}
                    </span>
                  </span>
                )}
              </div>
              <span className="font-mono-num text-[11px] text-emerald-300 font-bold shrink-0">
                Safety {s.outpostSafetyPct}%
              </span>
            </div>

            {renderDirectActions(true)}
          </div>
        ) : (
          /* Expanded Mission Control Card: Clean Relevant Equipment Only + Optional Details */
          <div className="p-4 sm:p-5 space-y-3 max-h-[54vh] sm:max-h-[62vh] overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono-num text-xs font-bold px-2.5 py-1 rounded-xl border ${
                    systems.metricAlert
                      ? 'bg-rose-500/20 border-rose-400/70 text-rose-200'
                      : 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
                  }`}
                >
                  {systems.primaryMetricLabel}: {systems.primaryMetricValue}
                </span>
                <span className="font-mono-num text-xs text-slate-300">
                  Safety: <strong className="text-emerald-300">{s.outpostSafetyPct}%</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowScienceDetails((v) => !v)}
                  className="btn-space btn-space-xs btn-space-slate gap-1 text-slate-200"
                >
                  <Info className="w-3.5 h-3.5 text-amber-300" />
                  {showScienceDetails ? 'Hide Details' : 'Details'}
                </button>
                {onReplayLesson && (
                  <button
                    type="button"
                    onClick={() => onReplayLesson(challengeId)}
                    className="btn-space btn-space-xs btn-space-sky-soft gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Replay Lesson
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-hero text-xl sm:text-2xl text-white leading-tight mb-1">
                {info.title}
              </h3>
              <p className="text-xs sm:text-sm text-sky-100 bg-sky-500/15 border border-sky-400/35 rounded-2xl px-3.5 py-2">
                <strong className="text-amber-300 mr-1">{state.roverName}:</strong>“{info.astroAlert}”
              </p>
            </div>

            {/* ONLY Scenario-Relevant Equipment Status Cards */}
            <div className={`grid gap-2 ${systems.equipment.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {systems.equipment.map((eqItem) => (
                <div
                  key={eqItem.name}
                  className={`rounded-2xl p-3 border ${
                    eqItem.healthy
                      ? 'bg-emerald-500/10 border-emerald-400/55'
                      : 'bg-slate-900/95 border-amber-400/55'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-display font-bold text-sm text-white">{eqItem.name}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                        eqItem.healthy
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {eqItem.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">{eqItem.purpose}</p>
                </div>
              ))}
            </div>

            {showScienceDetails && (
              <div className="space-y-2.5 pt-1 animate-tip-pop">
                <div className="px-3.5 py-2 rounded-xl bg-indigo-950/65 border border-indigo-400/45 text-xs text-indigo-100">
                  <strong className="text-indigo-300">System Impact: </strong>
                  {systems.detailNote}
                </div>
                <ScienceDiagram kind={info.diagramKind} />
                {challengeId === 'solar_particle_event' && (
                  <NasaReferenceCard item={getNasaMediaById('solar_storms')} compact />
                )}
              </div>
            )}

            {/* Direct Action Zone */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-700/80 p-3 space-y-2">
              {!s.stationVisited && (
                <p className="text-xs text-amber-100">
                  Tap the glowing 3D beacon on your <strong className="text-amber-300">{STRUCTURES[info.targetStructure].name}</strong>—or press below so {state.roverName} rolls straight there!
                </p>
              )}
              {renderDirectActions(false)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* 4. Independent Audio & Accessibility Modal (Narration / Music / SFX sliders) */
export const SettingsModal: React.FC<{
  state: GameState;
  onUpdateAudio: (patch: Partial<GameState['audio']>) => void;
  onReplayIntro: () => void;
  onResetGame: () => void;
  onClose: () => void;
}> = ({ state, onUpdateAudio, onReplayIntro, onResetGame, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Audio and Accessibility Settings"
        className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#081020] border-2 border-slate-500 p-6 shadow-2xl space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-hero text-2xl text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-sky-400" />
            Audio &amp; Accessibility
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="btn-space btn-space-icon btn-space-slate"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
          <span className="text-sm font-semibold text-slate-100">Mute All Sound</span>
          <input
            type="checkbox"
            checked={state.audio.muted}
            onChange={(e) => onUpdateAudio({ muted: e.target.checked })}
            className="w-5 h-5 accent-sky-400"
          />
        </label>

        {/* Independent Narration, Music & SFX sliders */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-100 mb-1">
              <span>ASTRO Narration Voice</span>
              <span className="font-mono-num text-sky-300">{Math.round(state.audio.narrationVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.audio.narrationVolume}
              onChange={(e) => onUpdateAudio({ narrationVolume: Number(e.target.value) })}
              className="w-full accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-100 mb-1">
              <span>Space Music</span>
              <span className="font-mono-num text-amber-300">{Math.round(state.audio.musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.audio.musicVolume}
              onChange={(e) => onUpdateAudio({ musicVolume: Number(e.target.value) })}
              className="w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-100 mb-1">
              <span>Rover &amp; Machinery SFX</span>
              <span className="font-mono-num text-emerald-300">{Math.round(state.audio.sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.audio.sfxVolume}
              onChange={(e) => onUpdateAudio({ sfxVolume: Number(e.target.value) })}
              className="w-full accent-emerald-400"
            />
          </div>
        </div>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
          <span className="text-sm font-semibold text-slate-100">Spoken Voiceover</span>
          <input
            type="checkbox"
            checked={state.audio.voiceEnabled}
            onChange={(e) => onUpdateAudio({ voiceEnabled: e.target.checked })}
            className="w-5 h-5 accent-sky-400"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
          <span className="text-sm font-semibold text-slate-100">Show Captions</span>
          <input
            type="checkbox"
            checked={state.audio.captionsEnabled}
            onChange={(e) => onUpdateAudio({ captionsEnabled: e.target.checked })}
            className="w-5 h-5 accent-sky-400"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer">
          <span className="text-sm font-semibold text-slate-100">Reduced Motion</span>
          <input
            type="checkbox"
            checked={state.audio.reducedMotion}
            onChange={(e) => onUpdateAudio({ reducedMotion: e.target.checked })}
            className="w-5 h-5 accent-sky-400"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onReplayIntro}
            className="btn-space btn-space-sm btn-space-slate flex-1"
          >
            Replay Intro
          </button>
          <button
            type="button"
            onClick={onResetGame}
            className="btn-space btn-space-sm btn-space-rose-soft flex-1"
          >
            Reset Mission
          </button>
        </div>
      </div>
    </div>
  );
};

/* 5. Mission Complete Celebration: Canvas Confetti + Rover Appreciation + Actual Outpost Summary + Emotional Goodbye */
export const VictoryModal: React.FC<{
  state: GameState;
  onPlayAgain: () => void;
}> = ({ state, onPlayAgain }) => {
  const confettiCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const heartfeltSpeech = `Thank you, Commander! Together we explored the lunar South Pole, discovered hidden water clues, collected and processed real Moon resources, built our outpost module by module, and kept every astronaut safe! Look out at our glowing lunar home—and remember, real space pioneers like you will one day explore the Moon, Mars, and beyond. Farewell for now, my brave Commander!`;

  React.useEffect(() => {
    const canvas = confettiCanvasRef.current;
    if (!canvas || state.audio.reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#fbbf24', '#38bdf8', '#34d399', '#fb7185', '#a78bfa', '#fde047'];
    const particles = Array.from({ length: 72 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: (Math.random() - 0.5) * 65,
      vy: 60 + Math.random() * 110,
      size: 5 + (i % 5),
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 4,
      color: colors[i % colors.length],
      isStar: i % 5 === 0,
    }));

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vrot * dt;
        if (p.y > canvas.height + 20) {
          p.y = -15;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.isStar) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.55);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [state.audio.reducedMotion]);

  // Summarize only the modules actually constructed in Phase 3
  const builtModuleNames = Array.from(
    new Set(state.structures.map((s) => STRUCTURES[s.type]?.name ?? s.type))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-5 bg-gradient-to-b from-black/25 via-black/45 to-black/80 pointer-events-auto">
      <canvas
        ref={confettiCanvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mission Complete"
        className="relative z-10 max-w-2xl w-full max-h-[86vh] overflow-y-auto rounded-3xl bg-[#071021]/95 border-2 border-emerald-400 p-5 sm:p-6 shadow-2xl space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Mission Beyond Earth Complete!
              </span>
              <h2 className="font-hero text-2xl sm:text-3xl text-white leading-tight">
                Lunar Outpost Safe &amp; Thriving!
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => audioEngine.speak(heartfeltSpeech, 'celebrating')}
            className="btn-space btn-space-sm btn-space-sky-soft gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Hear {state.roverName}
          </button>
        </div>

        {/* Rover Appreciation & Heartfelt Closing Message */}
        <div className="rounded-2xl bg-sky-500/15 border border-sky-400/45 p-3.5 space-y-1.5 text-xs sm:text-sm text-sky-100">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            {state.roverName} Turned &amp; Flashed Headlights For You!
          </div>
          <p className="leading-relaxed">
            “Thank you, Commander! Together we explored frozen Moon craters, discovered hidden water clues, built our outpost brick by brick, and protected every astronaut! Real space pioneers like you will keep exploring the Moon, Mars, and distant stars!”
          </p>
        </div>

        {/* Key Numeric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="font-mono-num font-bold text-lg text-sky-300">
              {state.scienceJournalIds.length} · {state.scannedTargetIds.length}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Journal &amp; Scans</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="font-mono-num font-bold text-lg text-orange-300">
              {state.resources.regolith} / {state.resources.waterIceClues} / {state.resources.sunlightData}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Soil · H₂O · Solar</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="font-mono-num font-bold text-lg text-emerald-300">
              {state.structures.length} Built
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Outpost Modules</div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="font-mono-num font-bold text-lg text-amber-300">
              {state.survival.resolvedChallenges.length}/5 ({state.survival.outpostSafetyPct}%)
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Systems Tested</div>
          </div>
        </div>

        {/* Actual Built Outpost Modules + Earned Achievements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-700 p-3 space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-emerald-300">
              Your Constructed Outpost ({state.structures.length} Modules)
            </div>
            <div className="flex flex-wrap gap-1">
              {builtModuleNames.length > 0 ? (
                builtModuleNames.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-100 text-[11px] font-semibold"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">Starter Habitat Core</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/90 border border-slate-700 p-3 space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-amber-300">
              Mission Badges &amp; Butterfly Impact
            </div>
            <div className="flex flex-wrap gap-1">
              {state.achievements.map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 text-[11px] font-semibold"
                >
                  ★ {badge}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-300 pt-0.5">
              Site:{' '}
              <strong>
                {state.butterfly.chosenOutpostSite === 'ridge_haven'
                  ? 'Sunlit Peak Ridge'
                  : 'Shadow Rim Terrace'}
              </strong>{' '}
              · {state.butterfly.installedRegolithShielding ? 'Regolith Shielded ✓' : 'Inner Core Protected ✓'}
            </div>
          </div>
        </div>

        {/* Emotional Curiosity Hook */}
        <div className="rounded-2xl bg-indigo-950/60 border border-indigo-400/50 px-3.5 py-2.5 text-xs text-indigo-100 flex items-center gap-2.5">
          <Sun className="w-5 h-5 text-amber-300 shrink-0" />
          <span>
            <strong>What Will Future Scientists Discover Next?</strong> Real Artemis rovers will explore Shackleton Crater’s rim to test ancient lunar ice—maybe one day you’ll design their next Moon base!
          </span>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onPlayAgain}
          className="btn-space btn-space-lg btn-space-amber w-full font-bold"
        >
          Play New Mission
        </button>
      </div>
    </div>
  );
};
