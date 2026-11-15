import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  Droplets,
  Eraser,
  Eye,
  Factory,
  Flashlight,
  HelpCircle,
  Map as MapIcon,
  Mountain,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  ScanSearch,
  Settings,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wrench,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ROCK_TARGETS, SHADOWED_CRATERS } from '../game/lunarTerrain';
import { createLroReliefDataUrl } from '../game/lroMapTerrain';
import { PHASE4_CHALLENGES } from '../game/missionData';
import { NasaMediaItem } from '../game/nasaMedia';
import {
  getNearestTargetForRover,
  getPhaseMissionSteps,
  getRecommendedOutpostSlots,
} from '../game/rules';
import { CameraMode, GameState, StructureType } from '../game/types';
import { SceneObjectLabel } from '../three/LunarSceneController';
import { NasaReferenceCard } from './NasaReferenceCard';
import { BuildPaletteDock } from './PhasePanels';

export interface InspectedObjectState {
  item: NasaMediaItem;
  title: string;
  badge: string;
}

interface MissionGuidanceHUDProps {
  state: GameState;
  tutorialHighlight?: 'camera' | 'drive' | 'map' | 'route' | 'scan' | null;
  inventoryPulseTag?: string | null;
  modalOpen?: boolean;
  inspectedObject?: InspectedObjectState | null;
  inspectedFading?: boolean;
  projectedLabels?: SceneObjectLabel[];
  autoplayBlocked?: boolean;
  phase3ShowcaseActive?: boolean;
  onUnlockAudio?: () => void;
  onInspectProjectedLabel?: (lbl: SceneObjectLabel) => void;
  onContinuePhase4?: () => void;
  onCloseInspectedObject?: () => void;
  onSelectCameraMode: (m: CameraMode) => void;
  onZoom: (factor: number) => void;
  onToggleHeadlights: () => void;
  onToggleDrawMode: () => void;
  onStartRoute: () => void;
  onPauseResumeRoute: () => void;
  onStopRoute: () => void;
  onClearRoute: () => void;
  onScanOrCollect: () => void;
  onOpenMoonLab: () => void;
  onOpenRoverStatus: () => void;
  onOpenOutpostPicker: () => void;
  onOpenMap: () => void;
  onOpenJournal: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onPauseGame: () => void;
  onReopenGuide: () => void;
  onOpenPhaseGuide?: () => void;
  onRequestHint: () => void;
  onTouchDrive: (forward: number, turn: number) => void;
  onSelectBuildType: (t: StructureType) => void;
  onSetBuildMode: (mode: 'place' | 'connect') => void;
  onPlaceAtRecommendedSlot: (type: StructureType) => void;
  onConnectStructurePair: (fromId: string, toId: string) => void;
  onAutoConnectAll: () => void;
  onRotateBuild: () => void;
  onRemoveLastStructure: () => void;
  onCollectBonusRegolith: () => void;
  onReplayBuildIntro?: () => void;
  onExplainModule?: (t: StructureType) => void;
  onDismissNotice: () => void;
}

const PHASE_NAMES: Record<1 | 2 | 3 | 4, string> = {
  1: 'Phase 1 · Explore',
  2: 'Phase 2 · Collect',
  3: 'Phase 3 · Build',
  4: 'Phase 4 · Survive',
};

export const MissionGuidanceHUD: React.FC<MissionGuidanceHUDProps> = ({
  state,
  tutorialHighlight = null,
  inventoryPulseTag = null,
  modalOpen = false,
  inspectedObject = null,
  inspectedFading = false,
  projectedLabels = [],
  autoplayBlocked = false,
  phase3ShowcaseActive = false,
  onUnlockAudio,
  onInspectProjectedLabel,
  onContinuePhase4,
  onCloseInspectedObject,
  onSelectCameraMode,
  onZoom,
  onToggleHeadlights,
  onToggleDrawMode,
  onStartRoute,
  onPauseResumeRoute,
  onStopRoute,
  onClearRoute,
  onScanOrCollect,
  onOpenMoonLab,
  onOpenRoverStatus,
  onOpenOutpostPicker,
  onOpenMap,
  onOpenJournal,
  onOpenSettings,
  onToggleMute,
  onPauseGame,
  onReopenGuide,
  onOpenPhaseGuide,
  onRequestHint,
  onTouchDrive,
  onSelectBuildType,
  onSetBuildMode,
  onPlaceAtRecommendedSlot,
  onConnectStructurePair,
  onAutoConnectAll,
  onRotateBuild,
  onRemoveLastStructure,
  onCollectBonusRegolith,
  onReplayBuildIntro,
  onExplainModule,
  onDismissNotice,
}) => {
  const [objectiveCollapsed, setObjectiveCollapsed] = useState(false);
  const [activeMetricTip, setActiveMetricTip] = useState<string | null>(null);
  const lroMiniUrl = useMemo(() => createLroReliefDataUrl(42, 160), []);

  const { objectiveTitle, steps } = getPhaseMissionSteps(state);
  const completedCount = steps.filter((s) => s.completed).length;
  const activeStep = steps.find((s) => !s.completed);
  const nearest = getNearestTargetForRover(state);
  const canInteractTarget = nearest !== null && nearest.distance <= 5.5;
  const cameraClarity = Math.max(15, Math.round(100 - state.rover.dustLevel));
  const validation = state.routePlanning.validation;

  const taskSummary = useMemo(() => {
    if (phase3ShowcaseActive) {
      return {
        what: 'Watch your connected Moon base power up',
        where: 'Solar -> Battery -> Habitat · Water & Air Online',
        outcome: 'Ready for Phase 4 Survival Testing',
      };
    }
    if (state.phase === 4 && state.survival.activeChallenge) {
      const ch = PHASE4_CHALLENGES.find((c) => c.id === state.survival.activeChallenge);
      return {
        what: state.survival.stationVisited
          ? `Fix ${ch?.title ?? 'system alert'}`
          : `Drive or Go to ${ch?.targetStructure.toUpperCase() ?? 'STATION'}`,
        where: ch?.title ?? 'Outpost System Check',
        outcome: 'Stabilize habitat life support',
      };
    }
    if (activeStep) {
      return {
        what: activeStep.label,
        where: activeStep.whereHint ?? (nearest ? nearest.target.name : 'Lunar South Pole'),
        outcome: activeStep.whatToTestHint ?? activeStep.whyHint ?? 'Advances current phase',
      };
    }
    return null;
  }, [phase3ShowcaseActive, state.phase, state.survival.activeChallenge, state.survival.stationVisited, activeStep, nearest]);

  const rawReadyCount =
    state.resources.rawSoil + state.resources.iceCoreSamples + state.resources.solarSurveyCount;
  const hasRoverWarning =
    state.rover.dustLevel >= 22 || state.rover.battery < 55 || state.rover.health < 95;

  const interactLabel = (() => {
    if (state.phase === 2 && canInteractTarget && nearest) {
      if (nearest.target.kind === 'regolith_loose') return 'SCOOP SOIL';
      if (nearest.target.kind === 'hydrogen_clue' || nearest.target.kind === 'dry_crater_probe') {
        return 'DRILL CRATER';
      }
      if (nearest.target.kind === 'sunlight_beacon') return 'TEST SOLAR';
    }
    return state.phase === 2 && canInteractTarget ? 'COLLECT' : 'SCAN OBJECT';
  })();

  const ringIf = (target: 'camera' | 'drive' | 'map' | 'route' | 'scan') =>
    tutorialHighlight === target
      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#081122] rounded-xl'
      : '';

  const dashboardMetrics = [
    {
      id: 'energy',
      label: 'Energy',
      value: `${Math.round(state.rover.battery)}%`,
      color: state.rover.battery < 28 ? 'text-rose-400' : 'text-emerald-300',
      Icon: BatteryCharging,
      tip: `Rover Battery (${Math.round(state.rover.battery)}%) + ${state.resources.sunlightData} Solar Kits`,
    },
    {
      id: 'camera',
      label: 'Camera',
      value: `${cameraClarity}%`,
      color: cameraClarity < 68 ? 'text-amber-300' : 'text-sky-300',
      Icon: Camera,
      tip: `Camera & Sensor Clarity (${cameraClarity}%). Dust from loose regolith smudges lenses.`,
    },
    {
      id: 'water',
      label: 'Water',
      value: `${state.resources.waterIceClues}`,
      color: 'text-cyan-300',
      Icon: Droplets,
      tip: `Processed Water Tanks: ${state.resources.waterIceClues} (Raw Ice Samples: ${state.resources.iceCoreSamples})`,
    },
    {
      id: 'rocks',
      label: 'Rock Samples',
      value: `${state.scannedTargetIds.length}`,
      color: 'text-indigo-300',
      Icon: ScanSearch,
      tip: `Rock & Landmark Scans Logged: ${state.scannedTargetIds.length}`,
    },
    {
      id: 'soil',
      label: 'Soil Samples',
      value: `${state.resources.regolith}`,
      color: 'text-orange-300',
      Icon: Mountain,
      tip: `Processed Regolith Units: ${state.resources.regolith} (Raw Scoops: ${state.resources.rawSoil})`,
    },
    {
      id: 'discoveries',
      label: 'Discoveries',
      value: `${state.scienceJournalIds.length}`,
      color: 'text-amber-300',
      Icon: Sparkles,
      tip: `Science Journal Discoveries: ${state.scienceJournalIds.length} · Science Points: ${state.resources.sciencePoints}`,
    },
  ];

  // Enforce max 2-3 visual elements: hide floating HUD overlays whenever a full modal/activity is open
  const hideSecondaryCards = Boolean(state.activePopup || modalOpen);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* Dusty Rover-Cam Overlay when in first-person & lens is dusty */}
      {state.cameraMode === 'roverCam' && state.rover.dustLevel > 18 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(148,163,184,0) 35%, rgba(120,126,136,${Math.min(
              0.72,
              state.rover.dustLevel / 115
            )}) 100%)`,
          }}
        />
      )}

      {/* Bouncy 3D Projected Object Labels */}
      {!hideSecondaryCards &&
        projectedLabels.map((lbl) => {
          const borderColor =
            lbl.kind === 'rover'
              ? 'border-amber-400/80 text-amber-200'
              : lbl.kind === 'target'
              ? 'border-sky-400/80 text-sky-100'
              : lbl.kind === 'proposed'
              ? 'border-cyan-300/80 border-dashed text-cyan-100'
              : lbl.kind === 'site'
              ? 'border-emerald-400/80 text-emerald-100'
              : 'border-emerald-300/80 text-white';
          return (
            <button
              key={lbl.id}
              type="button"
              onClick={() => onInspectProjectedLabel?.(lbl)}
              style={{ left: `${lbl.xPct}%`, top: `${lbl.yPct}%` }}
              className={`pointer-events-auto fixed -translate-x-1/2 -translate-y-full px-2 py-0.5 rounded-lg bg-[#081122]/88 border ${borderColor} shadow-lg text-left cursor-pointer hover:scale-105 transition-transform ${
                state.audio.reducedMotion ? '' : 'animate-label-pop'
              }`}
            >
              <div className="text-[10px] font-display font-bold leading-tight whitespace-nowrap">
                {lbl.label}
              </div>
              <div className="text-[9px] text-slate-300 leading-tight whitespace-nowrap">{lbl.sub}</div>
            </button>
          );
        })}

      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Purposeful Objective Panel */}
        {state.screen === 'playing' && !hideSecondaryCards ? (
          <div className="pointer-events-auto max-w-[12.5rem] sm:max-w-xs w-48 sm:w-72 max-h-[38vh] sm:max-h-none overflow-y-auto rounded-2xl bg-[#081122]/94 border border-sky-400/50 p-2 sm:p-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  {PHASE_NAMES[state.phase]}
                </div>
                <div className="font-hero font-bold text-xs sm:text-sm text-white leading-tight tracking-wide">
                  {objectiveTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setObjectiveCollapsed((v) => !v)}
                aria-label={objectiveCollapsed ? 'Expand mission objective' : 'Collapse mission objective'}
                className="btn-space btn-space-slate btn-space-xs p-1.5"
              >
                {objectiveCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${(completedCount / Math.max(1, steps.length)) * 100}%` }}
              />
            </div>

            {!objectiveCollapsed && (
              <>
                <div className="mt-2 space-y-1">
                  {steps.map((s) => {
                    const isCurrent = !s.completed && activeStep?.id === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-start gap-1.5 text-xs px-2 py-1 rounded-lg ${
                          s.completed
                            ? 'text-emerald-300/90'
                            : isCurrent
                            ? 'bg-sky-500/20 text-white font-semibold border border-sky-400/40'
                            : 'text-slate-400'
                        }`}
                      >
                        {s.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-snug">{s.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Purposeful Movement Briefing: Where · Why · What to test */}
                {activeStep && (activeStep.whereHint || activeStep.whyHint) && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-900/95 border border-slate-700/80 text-[11px] space-y-0.5">
                    {activeStep.whereHint && (
                      <div className="text-sky-200">
                        <strong className="text-sky-400">Where: </strong>
                        {activeStep.whereHint}
                      </div>
                    )}
                    {activeStep.whyHint && (
                      <div className="text-slate-200">
                        <strong className="text-amber-300">Why: </strong>
                        {activeStep.whyHint}
                      </div>
                    )}
                    {activeStep.whatToTestHint && (
                      <div className="text-emerald-200">
                        <strong className="text-emerald-400">Test: </strong>
                        {activeStep.whatToTestHint}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenPhaseGuide ?? onReopenGuide}
                    className="btn-space btn-space-slate btn-space-xs flex-1 py-1.5"
                  >
                    Phase Guide
                  </button>
                  <button
                    type="button"
                    onClick={onRequestHint}
                    className="btn-space btn-space-amber-soft btn-space-xs flex-1 gap-1 py-1.5 font-bold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Need Help?
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div />
        )}

        {/* Top-Center: Friendly Kid-Readable Mission Dashboard + Task Info Bar */}
        <div className="flex flex-col items-center gap-1.5 max-w-[54rem]">
          <div className="pointer-events-auto hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#081122]/94 border border-slate-600/80 shadow-xl text-xs relative">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-700">
              <Compass className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-white">{state.roverName}</span>
            </div>

            {dashboardMetrics.map((m) => {
              const Icon = m.Icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.tip}
                  onClick={() => setActiveMetricTip((cur) => (cur === m.tip ? null : m.tip))}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                  <span className="text-slate-300 font-medium">{m.label}</span>
                  <span className={`font-mono-num font-bold ${m.color}`}>{m.value}</span>
                </button>
              );
            })}

            {activeMetricTip && (
              <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-900 border border-sky-400/60 text-sky-100 text-[11px] shadow-xl whitespace-nowrap z-10">
                {activeMetricTip}
              </div>
            )}

            {inventoryPulseTag && (
              <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-display font-bold text-xs shadow-lg whitespace-nowrap z-10">
                + {inventoryPulseTag} Added!
              </div>
            )}
          </div>

          {!hideSecondaryCards && state.screen === 'playing' && taskSummary && (
            <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-[#081122]/90 border border-sky-400/35 text-[11px] shadow-lg">
              <span className="font-bold text-sky-300">Next:</span>
              <span className="text-white font-semibold truncate max-w-[15rem]">{taskSummary.what}</span>
              <span className="text-slate-500">·</span>
              <span className="text-amber-200 truncate max-w-[15rem]">{taskSummary.where}</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 truncate max-w-[17rem]">{taskSummary.outcome}</span>
            </div>
          )}
        </div>

        {/* Top-Right: Utility Buttons + Live Minimap + Optional NASA Reference Card */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-guide-target="map"
              onClick={onOpenMap}
              aria-label="Open Mission Map"
              className={`btn-space btn-space-sky-soft btn-space-sm gap-1.5 font-bold ${ringIf('map')}`}
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </button>

            <button
              type="button"
              onClick={onOpenJournal}
              aria-label="Open Science Journal"
              className="btn-space btn-space-slate btn-space-sm gap-1.5 border-indigo-400/55 text-indigo-200 font-bold"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Journal</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={state.audio.muted ? 'Unmute sound' : 'Mute sound'}
              className="btn-space btn-space-slate btn-space-icon"
            >
              {state.audio.muted ? (
                <VolumeX className="w-4 h-4 text-amber-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Audio and Accessibility Settings"
              className="btn-space btn-space-slate btn-space-icon"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onPauseGame}
              aria-label="Pause Game"
              className="btn-space btn-space-slate btn-space-icon"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Real-Time Always-Live LRO Minimap */}
          {!hideSecondaryCards && (
            <button
              type="button"
              onClick={onOpenMap}
              title="Live South Pole LRO Minimap — click to open full terrain map"
              className="hidden sm:block rounded-2xl bg-[#070e1c]/95 border border-sky-400/50 p-1.5 shadow-xl cursor-pointer hover:border-sky-300 transition-colors"
            >
              <svg viewBox="-42 -42 84 84" className="w-28 h-28 rounded-xl bg-[#040812]">
                {lroMiniUrl && (
                  <image href={lroMiniUrl} x="-42" y="-42" width="84" height="84" preserveAspectRatio="none" />
                )}
                <circle cx="0" cy="0" r="38" fill="none" stroke="#334155" strokeWidth="0.7" strokeDasharray="2 2" />
                {SHADOWED_CRATERS.map((c) => (
                  <circle
                    key={c.id}
                    cx={c.x}
                    cy={c.z}
                    r={c.radius}
                    fill="#020617"
                    fillOpacity="0.65"
                    stroke="#38bdf8"
                    strokeWidth="0.9"
                    strokeDasharray="2 1.5"
                  />
                ))}
                {nearest && state.phase < 3 && (
                  <line
                    x1={state.rover.x}
                    y1={state.rover.z}
                    x2={nearest.target.x}
                    y2={nearest.target.z}
                    stroke="#fbbf24"
                    strokeWidth="1.0"
                    strokeDasharray="2.5 2"
                    strokeOpacity="0.7"
                  />
                )}
                {state.phase >= 3 &&
                  getRecommendedOutpostSlots(state.selectedOutpostSite).map((slot) => {
                    const placed = state.structures.find((st) => st.type === slot.type);
                    const px = placed ? placed.x : slot.x;
                    const pz = placed ? placed.z : slot.z;
                    return (
                      <rect
                        key={`mini_${slot.type}`}
                        x={px - 1.4}
                        y={pz - 1.4}
                        width="2.8"
                        height="2.8"
                        fill={placed ? '#10b981' : 'none'}
                        stroke={placed ? '#ecfdf5' : '#38bdf8'}
                        strokeWidth="0.7"
                      />
                    );
                  })}
                {ROCK_TARGETS.filter((t) =>
                  state.screen === 'tutorial' ? t.phase === 1 : t.phase === state.phase
                ).map((t) => {
                  const done =
                    state.scannedTargetIds.includes(t.id) || state.collectedTargetIds.includes(t.id);
                  return (
                    <circle
                      key={t.id}
                      cx={t.x}
                      cy={t.z}
                      r={done ? 1.6 : 2.3}
                      fill={done ? '#10b981' : '#38bdf8'}
                    />
                  );
                })}
                {state.roverTrail.length > 1 && (
                  <polyline
                    points={state.roverTrail.map((pt) => `${pt.x.toFixed(1)},${pt.z.toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.2"
                    strokeDasharray="1.5 1.5"
                    strokeOpacity="0.85"
                  />
                )}
                {validation && validation.sampledPoints.length > 1 && (
                  <polyline
                    points={validation.sampledPoints.map((pt) => `${pt.x.toFixed(1)},${pt.z.toFixed(1)}`).join(' ')}
                    fill="none"
                    stroke={validation.valid ? '#34d399' : '#ef4444'}
                    strokeWidth="1.6"
                  />
                )}
                <g transform={`translate(${state.rover.x}, ${state.rover.z}) rotate(${180 - (state.rover.headingRad * 180) / Math.PI})`}>
                  <polygon points="0,-3.8 2.8,2.6 -2.8,2.6" fill="#fbbf24" stroke="#0f172a" strokeWidth="0.7" />
                </g>
              </svg>
              <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300 mt-0.5 text-center">
                LRO Live Map
              </div>
            </button>
          )}

          {/* Live Inspected Object NASA Photo Reference Card (fades cleanly at 50s) */}
          {!hideSecondaryCards && inspectedObject && (
            <div
              className={`w-72 sm:w-80 max-h-[58vh] overflow-y-auto rounded-2xl shadow-2xl transition-opacity duration-700 ${
                inspectedFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <NasaReferenceCard
                item={inspectedObject.item}
                compact
                onClose={onCloseInspectedObject}
              />
            </div>
          )}
        </div>
      </div>

      {/* CONTEXTUAL NOTICE / ROUTE FEEDBACK BANNER */}
      {!hideSecondaryCards && !(state.screen === 'playing' && state.phase === 4) ? (
        <div className="flex flex-col items-center gap-2 mt-auto mb-2 pointer-events-none">
          {state.routePlanning.isDrawingMode && !validation && (
            <div className="px-4 py-2 rounded-2xl bg-[#081122]/95 border-2 border-sky-400 text-sky-100 text-xs sm:text-sm font-semibold shadow-xl text-center">
              Click and drag on the Moon surface from {state.roverName} to draw a safe path!
            </div>
          )}

          {validation && (state.routePlanning.isDrawingMode || !validation.valid) && (
            <div
              className={`pointer-events-auto max-w-md px-4 py-3 rounded-2xl border-2 shadow-xl text-xs md:text-sm ${
                validation.valid
                  ? 'bg-[#071c16]/95 border-emerald-400 text-emerald-100'
                  : 'bg-[#210b10]/95 border-rose-500 text-rose-100'
              }`}
            >
              <div className="font-bold mb-0.5 flex items-center justify-between gap-3">
                <span>{validation.valid ? 'Safe Path Ready!' : 'Oops! Path Needs Fixing'}</span>
                <span className="font-mono-num text-[11px] opacity-90">
                  {validation.estimatedDistanceM}m · ~{validation.estimatedTimeSec}s ·{' '}
                  {validation.estimatedEnergyCost}% Energy
                </span>
              </div>
              <p className="leading-snug">{validation.childMessage}</p>
              {!validation.valid && (
                <p className="text-[11px] text-amber-200 mt-1 font-semibold">{validation.hintAction}</p>
              )}
            </div>
          )}

          {state.contextualNotice && !state.routePlanning.isDrawingMode && (
            <div
              className={`pointer-events-auto max-w-lg px-4 py-2.5 rounded-2xl border-2 shadow-xl flex items-center gap-3 text-xs md:text-sm ${
                state.audio.reducedMotion ? '' : 'animate-tip-pop'
              } ${
                state.contextualNotice.tone === 'danger'
                  ? 'bg-[#210b10]/95 border-rose-500 text-rose-100'
                  : state.contextualNotice.tone === 'warning'
                  ? 'bg-[#221606]/95 border-amber-400 text-amber-100'
                  : 'bg-[#081326]/95 border-sky-400 text-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
              <div className="flex-1">
                <span className="font-bold text-amber-300 mr-1.5">{state.roverName}:</span>
                <span className="font-semibold mr-1">{state.contextualNotice.title} —</span>
                <span>{state.contextualNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={onDismissNotice}
                className="text-xs font-bold underline opacity-80 hover:opacity-100 cursor-pointer"
              >
                OK
              </button>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Phase 3 Connected Outpost Showcase Banner */}
      {phase3ShowcaseActive && !hideSecondaryCards && (
        <div className="pointer-events-auto self-center mb-2 max-w-xl w-full rounded-2xl bg-[#071a14]/96 border-2 border-emerald-400 p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-tip-pop">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Outpost Grid Connected!
            </div>
            <div className="font-display font-bold text-sm sm:text-base text-white">
              Watch sunlight, electricity, water & air flow through your Moon base!
            </div>
          </div>
          {onContinuePhase4 && (
            <button
              type="button"
              onClick={onContinuePhase4}
              className="btn-space btn-space-emerald btn-space-md shrink-0 font-display font-bold text-xs"
            >
              Start Phase 4 Tests →
            </button>
          )}
        </div>
      )}

      {/* BOTTOM DOCK */}
      {!hideSecondaryCards && !phase3ShowcaseActive && (
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          {/* Compact Mobile Telemetry Strip */}
          <div className="pointer-events-auto flex md:hidden items-center gap-2.5 px-3 py-1 rounded-xl bg-[#081122]/92 border border-slate-700 text-[11px] font-mono-num">
            <span className="font-display font-bold text-white">{state.roverName}</span>
            <span className={state.rover.battery < 25 ? 'text-rose-400 font-bold' : 'text-emerald-300 font-bold'}>
              Energy {Math.round(state.rover.battery)}%
            </span>
            <span className="text-sky-300 font-bold">Water {state.resources.waterIceClues}</span>
            <span className="text-orange-300 font-bold">Soil {state.resources.regolith}</span>
            <span className="text-amber-300 font-bold">Disc {state.scienceJournalIds.length}</span>
          </div>

          {/* Phase 3 Builder Dock when in Phase 3 AND Build Intro Tutorial has been seen */}
          {state.screen === 'playing' && state.phase === 3 && state.phase3IntroSeen && (
            <BuildPaletteDock
              state={state}
              onSelectType={onSelectBuildType}
              onSetBuildMode={onSetBuildMode}
              onPlaceAtRecommendedSlot={onPlaceAtRecommendedSlot}
              onConnectStructurePair={onConnectStructurePair}
              onAutoConnectAll={onAutoConnectAll}
              onRotate={onRotateBuild}
              onRemoveLast={onRemoveLastStructure}
              onCollectBonusRegolith={onCollectBonusRegolith}
              onReplayBuildIntro={onReplayBuildIntro}
              onExplainModule={onExplainModule}
              onFocusOverview={() =>
                onSelectCameraMode(state.cameraMode === 'topDown' ? 'follow' : 'topDown')
              }
            />
          )}

          {/* Primary Unified Bottom Action Dock */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#081122]/94 border border-slate-600/80 shadow-2xl max-w-[96vw]">
            {/* Camera Views */}
            <div data-guide-target="camera" className={`flex items-center gap-1 ${state.phase !== 3 || state.screen !== 'playing' ? 'pr-2 border-r border-slate-700' : ''} ${ringIf('camera')}`}>
              {(
                [
                  { id: 'follow', label: 'Follow', Icon: Camera },
                  { id: 'roverCam', label: 'Rover-Cam', Icon: Eye },
                  { id: 'topDown', label: 'Top View', Icon: Compass },
                  { id: 'routePlan', label: 'Plan View', Icon: Pencil },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectCameraMode(id)}
                  className={`btn-space btn-space-sm gap-1 ${
                    state.cameraMode === id
                      ? 'btn-space-sky font-bold'
                      : 'btn-space-slate'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => onZoom(0.82)}
                aria-label="Zoom In"
                className="btn-space btn-space-slate btn-space-icon"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onZoom(1.22)}
                aria-label="Zoom Out"
                className="btn-space btn-space-slate btn-space-icon"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Touch / On-screen Drive Pad & Route Drawing (hidden during Phase 3 Build screen to prevent overlap) */}
            {(state.phase !== 3 || state.screen !== 'playing') && (
              <>
                <div data-guide-target="drive" className={`flex items-center gap-1 pr-2 border-r border-slate-700 ${ringIf('drive')}`}>
                  <button
                    type="button"
                    aria-label="Turn Left"
                    onPointerDown={() => onTouchDrive(0.4, 1)}
                    onPointerUp={() => onTouchDrive(0, 0)}
                    onPointerLeave={() => onTouchDrive(0, 0)}
                    className="btn-space btn-space-slate btn-space-sm px-2.5 font-bold"
                  >
                    ◄
                  </button>
                  <button
                    type="button"
                    aria-label="Drive Forward"
                    onPointerDown={() => onTouchDrive(1, 0)}
                    onPointerUp={() => onTouchDrive(0, 0)}
                    onPointerLeave={() => onTouchDrive(0, 0)}
                    className="btn-space btn-space-slate btn-space-sm px-2.5 font-bold"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Drive Backward"
                    onPointerDown={() => onTouchDrive(-0.8, 0)}
                    onPointerUp={() => onTouchDrive(0, 0)}
                    onPointerLeave={() => onTouchDrive(0, 0)}
                    className="btn-space btn-space-slate btn-space-sm px-2.5 font-bold"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    aria-label="Turn Right"
                    onPointerDown={() => onTouchDrive(0.4, -1)}
                    onPointerUp={() => onTouchDrive(0, 0)}
                    onPointerLeave={() => onTouchDrive(0, 0)}
                    className="btn-space btn-space-slate btn-space-sm px-2.5 font-bold"
                  >
                    ►
                  </button>
                </div>

                {/* Route Drawing & Execution Controls */}
                <div className={`flex items-center gap-1.5 ${ringIf('route')}`}>
                  <button
                    type="button"
                    data-guide-target="route"
                    onClick={onToggleDrawMode}
                    className={`btn-space btn-space-sm gap-1.5 font-display font-bold ${
                      state.routePlanning.isDrawingMode
                        ? 'btn-space-amber'
                        : 'btn-space-sky-soft'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {state.routePlanning.isDrawingMode ? 'DRAWING ON' : 'DRAW PATH'}
                  </button>

                  {validation?.valid && !state.routePlanning.isExecuting && (
                    <button
                      type="button"
                      onClick={onStartRoute}
                      className="btn-space btn-space-emerald btn-space-sm gap-1 font-display font-bold"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      START
                    </button>
                  )}

                  {state.routePlanning.isExecuting && (
                    <>
                      <button
                        type="button"
                        onClick={onPauseResumeRoute}
                        className="btn-space btn-space-amber btn-space-sm gap-1 font-bold"
                      >
                        {state.routePlanning.isPaused ? (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            RESUME
                          </>
                        ) : (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            PAUSE
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={onStopRoute}
                        className="btn-space btn-space-rose btn-space-sm gap-1 font-bold"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        STOP
                      </button>
                    </>
                  )}

                  {state.routePlanning.rawPoints.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={onClearRoute}
                        className="btn-space btn-space-slate btn-space-sm gap-1"
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClearRoute();
                          if (!state.routePlanning.isDrawingMode) onToggleDrawMode();
                        }}
                        className="btn-space btn-space-slate btn-space-sm gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Redraw
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Contextual Rover Tool Actions + Headlights + Moon Lab + Rover Maintenance */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
              {(state.phase !== 3 || state.screen !== 'playing') && (
                <>
                  <button
                    type="button"
                    data-guide-target="lights"
                    onClick={onToggleHeadlights}
                    aria-label={state.rover.headlightsOn ? 'Turn Headlights Off' : 'Turn Headlights On'}
                    className={`btn-space btn-space-sm gap-1 font-bold ${
                      state.rover.headlightsOn
                        ? 'btn-space-amber'
                        : 'btn-space-slate'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">{state.rover.headlightsOn ? 'Lights ON' : 'Lights'}</span>
                  </button>

                  <button
                    type="button"
                    data-guide-target="scan"
                    onClick={onScanOrCollect}
                    className={`btn-space btn-space-sm gap-1.5 font-display font-bold ${ringIf('scan')} ${
                      canInteractTarget
                        ? 'btn-space-amber'
                        : 'btn-space-slate'
                    }`}
                  >
                    <ScanSearch className="w-3.5 h-3.5" />
                    {interactLabel}
                  </button>
                </>
              )}

              {(state.phase === 2 || rawReadyCount > 0) && (
                <button
                  type="button"
                  data-guide-target="moonlab"
                  onClick={onOpenMoonLab}
                  className={`btn-space btn-space-sm gap-1 font-display font-bold ${
                    rawReadyCount > 0
                      ? 'btn-space-emerald'
                      : 'btn-space-slate'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5" />
                  <span>Moon Lab</span>
                  {rawReadyCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-300 text-[10px]">
                      {rawReadyCount}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onOpenRoverStatus}
                className={`btn-space btn-space-sm gap-1 font-bold ${
                  hasRoverWarning
                    ? 'btn-space-amber'
                    : 'btn-space-slate'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{hasRoverWarning ? 'Check Rover!' : 'Rover Care'}</span>
              </button>

              {state.screen === 'playing' &&
                state.phase === 1 &&
                state.selectedOutpostSite === null && (
                  <button
                    type="button"
                    data-guide-target="outpost_btn"
                    onClick={onOpenOutpostPicker}
                    className="btn-space btn-space-amber btn-space-sm font-display font-bold"
                  >
                    Choose Outpost Site
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
