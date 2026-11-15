import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  Droplets,
  Factory,
  Flashlight,
  Hammer,
  Minus,
  Pickaxe,
  Plus,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { getNasaMediaForTargetKind } from '../game/nasaMedia';
import { computeSolarCollectorWatts } from '../game/rules';
import { GameState, RockTarget } from '../game/types';
import { NasaReferenceCard } from './NasaReferenceCard';

export type ResourceActivityMode =
  | { kind: 'soil_scoop'; target: RockTarget }
  | { kind: 'crater_drill'; target: RockTarget }
  | { kind: 'solar_test'; target: RockTarget }
  | { kind: 'moon_lab' };

interface ResourceActivityModalProps {
  mode: ResourceActivityMode;
  state: GameState;
  onToggleHeadlights: () => void;
  onCompleteSoilScoop: (target: RockTarget) => void;
  onCompleteCraterDrill: (target: RockTarget) => void;
  onCompleteSolarTest: (target: RockTarget, angleDeg: number, ridgeWatts: number) => void;
  onProcessSoil: () => void;
  onProcessWater: () => void;
  onProcessSolar: () => void;
  onClose: () => void;
}

export const ResourceActivityModal: React.FC<ResourceActivityModalProps> = ({
  mode,
  state,
  onToggleHeadlights,
  onCompleteSoilScoop,
  onCompleteCraterDrill,
  onCompleteSolarTest,
  onProcessSoil,
  onProcessWater,
  onProcessSolar,
  onClose,
}) => {
  const [scoopProgress, setScoopProgress] = useState(0);
  const [isHoldingScoop, setIsHoldingScoop] = useState(false);
  const scoopProgressRef = useRef(0);
  const scoopDoneRef = useRef(false);
  const [scoopComplete, setScoopComplete] = useState(false);
  const [drillProgress, setDrillProgress] = useState(0);
  const [isHoldingDrill, setIsHoldingDrill] = useState(false);
  const drillProgressRef = useRef(0);
  const drillDoneRef = useRef(false);
  const [drillComplete, setDrillComplete] = useState(false);
  const [solarAngle, setSolarAngle] = useState<number>(state.solarComparison.ridgeAngleDeg || 45);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [processingStation, setProcessingStation] = useState<'soil' | 'water' | 'solar' | null>(null);
  const [processProgress, setProcessProgress] = useState(0);
  const processProgressRef = useRef(0);
  const [lastLabResult, setLastLabResult] = useState<{
    station: 'soil' | 'water' | 'solar';
    title: string;
    detail: string;
  } | null>(null);
  const lastStepChimeRef = useRef(-1);
  const solarSvgRef = useRef<SVGSVGElement | null>(null);
  const callbacksRef = useRef({ onProcessSoil, onProcessWater, onProcessSolar });
  callbacksRef.current = { onProcessSoil, onProcessWater, onProcessSolar };
  const isPaused = state.screen === 'paused';

  const stopHoldDrill = useCallback(() => {
    setIsHoldingDrill(false);
    audioEngine.stopDrillSound();
  }, []);

  const startHoldDrill = useCallback(() => {
    if (drillDoneRef.current || isPaused) return;
    setIsHoldingDrill(true);
    audioEngine.startDrillSound();
  }, [isPaused]);

  const stopHoldScoop = useCallback(() => {
    setIsHoldingScoop(false);
    audioEngine.stopScoopSound();
  }, []);

  const startHoldScoop = useCallback(() => {
    if (scoopDoneRef.current || isPaused) return;
    setIsHoldingScoop(true);
    audioEngine.startScoopSound();
  }, [isPaused]);

  useEffect(() => {
    if (isPaused) {
      audioEngine.stopDrillSound();
      audioEngine.stopScoopSound();
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      audioEngine.stopDrillSound();
      audioEngine.stopScoopSound();
    };
  }, []);

  // Continuous Hold-to-Scoop robotic arm loop
  useEffect(() => {
    if (mode.kind !== 'soil_scoop' || scoopComplete || isPaused) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (scoopDoneRef.current) return;
      const prev = scoopProgressRef.current;
      const next = isHoldingScoop ? Math.min(100, prev + dt * 52) : Math.max(0, prev - dt * 10);
      scoopProgressRef.current = next;
      setScoopProgress(next);

      if (next >= 100 && !scoopDoneRef.current) {
        scoopDoneRef.current = true;
        audioEngine.stopScoopSound();
        audioEngine.playArmMove();
        audioEngine.playDiscovery();
        setIsHoldingScoop(false);
        setScoopComplete(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode.kind, isHoldingScoop, scoopComplete, isPaused]);

  // Continuous Hold-to-Drill loop
  useEffect(() => {
    if (mode.kind !== 'crater_drill' || drillComplete || isPaused) return;
    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (drillDoneRef.current) return;
      const prev = drillProgressRef.current;
      const next = isHoldingDrill ? Math.min(100, prev + dt * 58) : Math.max(0, prev - dt * 12);
      drillProgressRef.current = next;
      setDrillProgress(next);

      if (next >= 100 && !drillDoneRef.current) {
        drillDoneRef.current = true;
        audioEngine.stopDrillSound();
        audioEngine.playDiscovery();
        setIsHoldingDrill(false);
        setDrillComplete(true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode.kind, isHoldingDrill, drillComplete, isPaused]);

  // Animated Moon Lab processing chamber progression (4-stage readable visual transformation)
  useEffect(() => {
    if (mode.kind !== 'moon_lab' || !processingStation || isPaused) return;
    let rafId = 0;
    let last = performance.now();
    let done = false;
    lastStepChimeRef.current = -1;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (done) return;

      const prev = processProgressRef.current;
      const next = Math.min(100, prev + dt * 38);
      processProgressRef.current = next;

      const stepBucket = Math.min(3, Math.floor(next / 25));
      if (stepBucket > lastStepChimeRef.current && next < 100) {
        lastStepChimeRef.current = stepBucket;
        audioEngine.playLabProcessStep(processingStation, stepBucket);
      }

      if (next >= 100) {
        done = true;
        const st = processingStation;
        processProgressRef.current = 0;
        setProcessingStation(null);
        setProcessProgress(0);
        if (st === 'soil') {
          callbacksRef.current.onProcessSoil();
          setLastLabResult({
            station: 'soil',
            title: '+15 Regolith Units Sintered!',
            detail: 'Loose Moon dust melted and pressed into tough habitat bricks!',
          });
          audioEngine.speakOnce(
            'lab_done_soil',
            'Awesome! The kiln sintered dusty regolith grains into sturdy Moon bricks for our habitat!',
            'excited'
          );
        } else if (st === 'water') {
          callbacksRef.current.onProcessWater();
          setLastLabResult({
            station: 'water',
            title: '+2 Processed Water Tanks Purified!',
            detail: 'Frozen crater ice melted, filtered clean, and stored safely!',
          });
          audioEngine.speakOnce(
            'lab_done_water',
            'Sparkling clean! Heat melted the ice core and filters turned it into safe drinking water!',
            'excited'
          );
        } else {
          callbacksRef.current.onProcessSolar();
          setLastLabResult({
            station: 'solar',
            title: '+2 Solar Kits & +25 kWh Charged!',
            detail: 'Sunlight ridge measurements calibrated fresh power arrays!',
          });
          audioEngine.speakOnce(
            'lab_done_solar',
            'Power surge ready! Your sunlight data calibrated bright Solar Kits and charged the battery bank!',
            'excited'
          );
        }
        return;
      }

      setProcessProgress(next);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode.kind, processingStation, isPaused]);

  const updateAngleFromPointer = (clientX: number, clientY: number) => {
    const svg = solarSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / Math.max(1, rect.width)) * 320;
    const viewY = ((clientY - rect.top) / Math.max(1, rect.height)) * 136;

    // Tripod pivot is at (176, 76); user drags panel blade toward left Sun rays or up
    const dx = viewX - 176;
    const dy = 76 - viewY;
    // Compute tilt angle relative to flat ground: 15 (flat) -> 90 (vertical facing left Sun)
    const rawRad = Math.atan2(Math.max(4, dy), Math.max(2, Math.abs(dx)));
    const deg = Math.round((rawRad * 180) / Math.PI);
    const clamped = Math.max(15, Math.min(90, deg));
    setSolarAngle(clamped);
  };

  if (mode.kind === 'soil_scoop') {
    const pct = Math.round(scoopProgress);
    const armPhase = pct < 34 ? 0 : pct < 70 ? 1 : pct < 100 ? 2 : 3;
    // Continuous arm joint interpolation across 0 -> 100%
    const t = scoopProgress / 100;
    let elbowX = 128;
    let elbowY = 54;
    let tipX = 148;
    let tipY = 62;
    if (t < 0.35) {
      const u = t / 0.35;
      elbowX = 128 + u * 36;
      elbowY = 54 + u * 6;
      tipX = 148 + u * 54;
      tipY = 62 + u * 22;
    } else if (t < 0.72) {
      const u = (t - 0.35) / 0.37;
      elbowX = 164 + Math.sin(u * Math.PI) * 8;
      elbowY = 60 + u * 14;
      tipX = 202 + u * 16;
      tipY = 84 + Math.sin(u * Math.PI) * 10;
    } else {
      const u = (t - 0.72) / 0.28;
      elbowX = 164 - u * 88;
      elbowY = 74 - u * 44;
      tipX = 218 - u * 180;
      tipY = 84 - u * 46;
    }
    const labels = ['1. Extend Arm', '2. Scoop Soil', '3. Fill Sample Bin'];

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Lunar Soil Collection"
          className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#091224] border-2 border-orange-400 p-5 sm:p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-wider">
              <Hammer className="w-3.5 h-3.5" />
              Robotic Arm · {mode.target.name}
            </span>
            <button
              type="button"
              onClick={() => {
                stopHoldScoop();
                onClose();
              }}
              aria-label="Close activity"
              className="btn-space btn-space-slate btn-space-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Hold to Scoop Lunar Soil</h2>
          <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
            <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
            {scoopComplete
              ? '“Sample bin packed! Store this soil so our Moon Lab can bake it into shielding bricks!”'
              : '“Press and hold my Robotic Scoop button to reach down, dig loose regolith, and pour it into the Sample Bin!”'}
          </p>

          {/* Continuous Animated SVG Robotic Arm + Sample Bin */}
          <svg viewBox="0 0 320 128" className="w-full h-30 rounded-2xl bg-[#060b16] border border-slate-700">
            <rect x="30" y="60" width="66" height="32" rx="6" fill="#e2e8f0" />
            <rect x="42" y="66" width="38" height="14" rx="3" fill="#eab308" />
            <circle cx="44" cy="96" r="9" fill="#334155" />
            <circle cx="82" cy="96" r="9" fill="#334155" />

            {/* Sample Container Bin filling smoothly above 72% */}
            <rect x="20" y="34" width="34" height="22" rx="4" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
            <rect
              x="22"
              y={53 - Math.max(0, Math.min(1, (t - 0.7) / 0.3)) * 16}
              width="30"
              height={Math.max(2, Math.min(1, (t - 0.7) / 0.3) * 16 + 2)}
              rx="2"
              fill={scoopComplete ? '#34d399' : '#f97316'}
            />
            <text x="37" y="28" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="700">
              Bin {scoopComplete ? 'FULL' : `${pct}%`}
            </text>

            {/* Continuous Articulated Robotic Arm */}
            <path
              d={`M 96 72 L ${elbowX.toFixed(1)} ${elbowY.toFixed(1)} L ${tipX.toFixed(1)} ${tipY.toFixed(1)}`}
              stroke={scoopComplete ? '#34d399' : isHoldingScoop ? '#fbbf24' : '#38bdf8'}
              strokeWidth="5.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={elbowX} cy={elbowY} r="4.5" fill="#e2e8f0" />
            {/* Scoop bucket claw at tip */}
            <circle cx={tipX} cy={tipY} r="5.5" fill={t > 0.45 ? '#f97316' : '#94a3b8'} stroke="#0f172a" strokeWidth="1.5" />

            {/* Dust particles flying while actively scooping */}
            {isHoldingScoop && t >= 0.3 && t <= 0.78 && (
              <>
                <circle cx={tipX - 8} cy={tipY - 10} r="2.5" fill="#cbd5e1" />
                <circle cx={tipX + 9} cy={tipY - 12} r="2" fill="#94a3b8" />
                <circle cx={tipX + 2} cy={tipY - 16} r="1.8" fill="#e2e8f0" />
              </>
            )}

            {/* Loose Soil Mound shrinking slightly as scooped */}
            <polygon
              points={`184,106 214,${78 + Math.min(1, t) * 7} 248,106`}
              fill="#9ca3af"
            />
            <text x="216" y="120" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">
              {scoopComplete ? 'Loaded into Sample Bin!' : 'Loose Regolith Mound'}
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
            {labels.map((lbl, idx) => (
              <div
                key={lbl}
                className={`p-2 rounded-xl border text-center ${
                  armPhase > idx || scoopComplete
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : armPhase === idx
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {lbl}
              </div>
            ))}
          </div>

          {!scoopComplete ? (
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-75"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startHoldScoop();
                }}
                onPointerUp={stopHoldScoop}
                onPointerCancel={stopHoldScoop}
                onPointerLeave={stopHoldScoop}
                className={`btn-space btn-space-lg w-full font-display font-bold text-base select-none ${
                  isHoldingScoop
                    ? 'btn-space-amber ring-4 ring-amber-400/50'
                    : 'btn-space-amber'
                }`}
              >
                {isHoldingScoop
                  ? `SCOOPING SOIL... ${pct}% (KEEP HOLDING)`
                  : pct > 3
                  ? `PAUSED AT ${pct}% — PRESS & HOLD ROBOTIC SCOOP`
                  : 'PRESS & HOLD ROBOTIC SCOOP'}
              </button>
              <div className="text-[11px] text-slate-400 text-center">
                Simulated Gameplay Quantity · 1 scoop bin converts into building bricks
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onCompleteSoilScoop(mode.target)}
              className="btn-space btn-space-emerald btn-space-lg w-full gap-2 font-display font-bold text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              Store +2 Raw Soil Samples in Inventory
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode.kind === 'crater_drill') {
    const isDrySpot = mode.target.kind === 'dry_crater_probe';
    const lightsOn = state.rover.headlightsOn;
    const drillDepthY = 58 + (drillProgress / 100) * 50;
    const nasaItem = getNasaMediaForTargetKind(mode.target.kind);

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shadowed Crater Ice Investigation"
          className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#091224] border-2 border-sky-400 p-5 sm:p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Pickaxe className="w-3.5 h-3.5" />
              Core Drill · {mode.target.name}
            </span>
            <button
              type="button"
              onClick={() => {
                stopHoldDrill();
                onClose();
              }}
              aria-label="Close activity"
              className="btn-space btn-space-slate btn-space-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Hold to Drill Shadowed Crater</h2>
          <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
            <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
            {!lightsOn
              ? '“It is pitch dark down here! Turn ON my headlights first so I can see safe drilling ground.”'
              : !drillComplete
              ? '“Headlights are shining! Press and hold my Core Drill until the sample capsule fills to 100%.”'
              : isDrySpot
              ? '“Core sealed—just dry gray dust in this pocket. Let us check the deep crater spot next!”'
              : '“Core sealed! Frozen water clues confirmed inside this icy sample!”'}
          </p>

          {!lightsOn && (
            <button
              type="button"
              onClick={onToggleHeadlights}
              className="btn-space btn-space-amber btn-space-lg w-full gap-2 font-display font-bold text-base"
            >
              <Flashlight className="w-5 h-5" />
              Turn ON Rover Headlights
            </button>
          )}

          {/* Animated Hold-to-Drill Underground Rig + Capsule SVG */}
          <svg viewBox="0 0 320 124" className="w-full h-30 rounded-2xl bg-[#040812] border border-slate-700">
            {lightsOn && (
              <polygon points="75,64 245,42 245,104" fill="#fef08a" fillOpacity="0.16" />
            )}
            <rect x="26" y="56" width="54" height="28" rx="6" fill="#e2e8f0" />
            <circle cx="38" cy="88" r="8" fill="#334155" />
            <circle cx="68" cy="88" r="8" fill="#334155" />

            {/* Sample Capsule Tube filling dynamically */}
            <rect x="242" y="24" width="56" height="50" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <rect
              x="252"
              y={70 - (drillProgress / 100) * 38}
              width="36"
              height={Math.max(4, (drillProgress / 100) * 38)}
              rx="3"
              fill={drillComplete ? (isDrySpot ? '#94a3b8' : '#38bdf8') : '#eab308'}
            />
            <text x="270" y="18" textAnchor="middle" fill="#bae6fd" fontSize="8">
              Capsule {Math.round(drillProgress)}%
            </text>

            {/* Frozen Underground Soil Strata */}
            <rect x="0" y="92" width="320" height="32" fill="#1e293b" />
            <rect x="148" y="92" width="20" height={Math.max(0, (drillProgress / 100) * 24)} fill="#020617" />

            {/* Rotating / Boring Core Drill Bit */}
            <line
              x1="158"
              y1="38"
              x2="158"
              y2={drillDepthY}
              stroke={isHoldingDrill ? '#38bdf8' : '#eab308'}
              strokeWidth="7"
              strokeLinecap="round"
            />
            {isHoldingDrill && (
              <>
                <circle cx="148" cy="88" r="3" fill="#94a3b8" />
                <circle cx="169" cy="87" r="2.5" fill="#cbd5e1" />
              </>
            )}
            <text x="230" y="112" textAnchor="middle" fill="#cbd5e1" fontSize="9">
              {drillComplete
                ? isDrySpot
                  ? 'Dry Regolith Sealed'
                  : 'Ice Core Sealed!'
                : lightsOn
                ? isHoldingDrill
                  ? 'Drilling Freezing Floor...'
                  : 'Crater Floor Lit'
                : 'Pitch Dark Floor'}
            </text>
          </svg>

          {lightsOn && !drillComplete && (
            <div className="space-y-2.5">
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-sky-400 transition-[width] duration-75"
                  style={{ width: `${Math.round(drillProgress)}%` }}
                />
              </div>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  startHoldDrill();
                }}
                onPointerUp={stopHoldDrill}
                onPointerCancel={stopHoldDrill}
                onPointerLeave={stopHoldDrill}
                className={`btn-space btn-space-lg w-full font-display font-bold text-base select-none ${
                  isHoldingDrill
                    ? 'btn-space-sky ring-4 ring-sky-400/50'
                    : 'btn-space-sky'
                }`}
              >
                {isHoldingDrill
                  ? `DRILLING... ${Math.round(drillProgress)}% (KEEP HOLDING)`
                  : drillProgress > 3
                  ? `PAUSED AT ${Math.round(drillProgress)}% — PRESS & HOLD CORE DRILL`
                  : 'PRESS & HOLD CORE DRILL'}
              </button>
            </div>
          )}

          {lightsOn && drillComplete && (
            <div className="space-y-2.5">
              <div
                className={`p-3 rounded-xl border text-xs sm:text-sm ${
                  isDrySpot
                    ? 'bg-amber-500/15 border-amber-400/60 text-amber-100'
                    : 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100'
                }`}
              >
                {isDrySpot ? (
                  <span>
                    <strong>Dry Spot Found:</strong> Not every dark crater holds ice! Check the Deep Shadow Ice Probe next.
                  </span>
                ) : (
                  <span>
                    <strong>Ice Core Sealed!</strong> Frozen water traces confirmed. Process this sample in Moon Lab next!
                  </span>
                )}
              </div>

              <NasaReferenceCard
                item={nasaItem}
                compact
                onHearAstro={() => audioEngine.speak(`${nasaItem.title}. ${nasaItem.simpleExplanation}`, 'excited')}
              />

              <button
                type="button"
                onClick={() => onCompleteCraterDrill(mode.target)}
                className="btn-space btn-space-emerald btn-space-lg w-full gap-2 font-display font-bold text-base"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isDrySpot ? 'Log Dry Probe (+1 Raw Soil)' : 'Store +1 Ice Sample in Inventory'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode.kind === 'solar_test') {
    const ridgeWatts = computeSolarCollectorWatts(solarAngle, 0.96);
    const shadowWatts = state.solarComparison.shadowWattage;
    const isOptimal = solarAngle >= 64 && solarAngle <= 86;
    const beamOpacity = Math.max(0.28, Math.min(1, ridgeWatts / 115));

    // Handle coordinates on the rotating collector blade so player can grab & drag it directly
    const panelRad = ((90 - solarAngle) * Math.PI) / 180;
    const handleX = 176 - Math.cos(panelRad) * 34;
    const handleY = 76 - Math.sin(panelRad) * 34;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Solar Collector Angle Experiment"
          className="max-w-lg w-full rounded-3xl bg-[#091224] border-2 border-amber-400 p-6 shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sun className="w-3.5 h-3.5" />
              Solar Experiment · {mode.target.name}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close activity"
              className="btn-space btn-space-slate btn-space-icon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Aim Solar Collector!</h2>
          <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
            <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
            “Drag the glowing collector panel directly toward the low South Pole Sun beams until power peaks (~75°)!”
          </p>

          {/* Direct Pointer-Draggable Solar Collector Canvas */}
          <svg
            ref={solarSvgRef}
            viewBox="0 0 320 136"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsDraggingPanel(true);
              updateAngleFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!isDraggingPanel) return;
              updateAngleFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={() => setIsDraggingPanel(false)}
            onPointerCancel={() => setIsDraggingPanel(false)}
            className="w-full h-36 rounded-2xl bg-[#070d1a] border-2 border-amber-400/50 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            {/* Low-horizon South Pole Sun */}
            <circle cx="34" cy="96" r="15" fill="#fbbf24" />
            <circle cx="34" cy="96" r="22" fill="#fbbf24" fillOpacity="0.15" />

            {/* Incoming Sunlight Rays responding live to alignment */}
            <line
              x1="54"
              y1="90"
              x2="172"
              y2="62"
              stroke="#fde047"
              strokeWidth={isOptimal ? 3.5 : 2}
              strokeOpacity={beamOpacity}
              strokeDasharray="6 4"
            />
            <line
              x1="54"
              y1="96"
              x2="174"
              y2="76"
              stroke="#fde047"
              strokeWidth={isOptimal ? 3 : 1.5}
              strokeOpacity={beamOpacity}
              strokeDasharray="6 4"
            />
            <line
              x1="54"
              y1="102"
              x2="176"
              y2="90"
              stroke="#fde047"
              strokeWidth={isOptimal ? 2.5 : 1.5}
              strokeOpacity={beamOpacity * 0.85}
            />

            {/* Guide arc */}
            <path d="M 142 76 A 34 34 0 0 1 176 42" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* Tripod + Rotating Solar Panel */}
            <line x1="176" y1="76" x2="176" y2="122" stroke="#94a3b8" strokeWidth="4" />
            <line x1="160" y1="122" x2="192" y2="122" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <g transform={`translate(176, 76) rotate(${90 - solarAngle})`}>
              <rect
                x="-34"
                y="-5"
                width="68"
                height="10"
                rx="4"
                fill={isOptimal ? '#0284c7' : '#1d4ed8'}
                stroke={isOptimal ? '#34d399' : '#93c5fd'}
                strokeWidth="2"
              />
            </g>

            {/* Draggable Grip Handle */}
            <circle
              cx={handleX}
              cy={handleY}
              r="9"
              fill={isOptimal ? '#34d399' : '#fbbf24'}
              stroke="#0f172a"
              strokeWidth="2"
            />

            <rect x="228" y="24" width="78" height="62" rx="12" fill="#0f172a" stroke={isOptimal ? '#34d399' : '#fbbf24'} strokeWidth="1.5" />
            <text x="267" y="48" textAnchor="middle" fill="#fde047" fontSize="16" fontWeight="800">
              {ridgeWatts} W
            </text>
            <text x="267" y="65" textAnchor="middle" fill="#cbd5e1" fontSize="10">
              Tilt: {solarAngle}°
            </text>
            <text x="267" y="79" textAnchor="middle" fill={isOptimal ? '#34d399' : '#fbbf24'} fontSize="8.5" fontWeight="700">
              {isOptimal ? 'PEAK SUN!' : 'DRAG PANEL'}
            </text>

            <text x="115" y="22" textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontWeight="600">
              Drag the glowing dot to tilt panel toward the Sun
            </text>
          </svg>

          {/* Accessible fine-tilt nudge controls + Site Comparison */}
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="text-slate-200">Panel Tilt</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSolarAngle((a) => Math.max(15, a - 5))}
                  aria-label="Decrease tilt 5 degrees"
                  className="btn-space btn-space-slate btn-space-icon"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className={`font-mono-num px-2 ${isOptimal ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {solarAngle}° · {ridgeWatts} W
                </span>
                <button
                  type="button"
                  onClick={() => setSolarAngle((a) => Math.min(90, a + 5))}
                  aria-label="Increase tilt 5 degrees"
                  className="btn-space btn-space-slate btn-space-icon"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/40">
                <div className="text-slate-300">Sunlit Ridge</div>
                <div className="font-mono-num font-bold text-amber-300 text-sm">{ridgeWatts} W</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-slate-400">Dark Crater</div>
                <div className="font-mono-num font-bold text-sky-300 text-sm">{shadowWatts} W</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCompleteSolarTest(mode.target, solarAngle, ridgeWatts)}
            className="btn-space btn-space-emerald btn-space-lg w-full gap-2 font-display font-bold text-base"
          >
            <CheckCircle2 className="w-5 h-5" />
            Save Solar Survey ({ridgeWatts} W)
          </button>
        </div>
      </div>
    );
  }

  // Hay-Day-inspired Moon Processing Lab with live multi-stage animated transformation chamber
  const isBusy = processingStation !== null;
  const activeVisual = processingStation ?? lastLabResult?.station ?? 'soil';
  const pctNorm = isBusy ? Math.max(0, Math.min(1, processProgress / 100)) : lastLabResult ? 1 : 0;
  const stageIdx = !isBusy && !lastLabResult ? 0 : pctNorm < 0.28 ? 1 : pctNorm < 0.65 ? 2 : pctNorm < 0.96 ? 3 : 4;
  const stageLabels =
    activeVisual === 'soil'
      ? ['Ready', '1. Pouring Dust', '2. Heating Kiln', '3. Pressing Brick', '4. Bricks Stored!']
      : activeVisual === 'water'
      ? ['Ready', '1. Ice Core Intake', '2. Melting Ice', '3. Filtering Clean', '4. Water Stored!']
      : ['Ready', '1. Loading Survey', '2. Aligning Beams', '3. Charging Cells', '4. Kits Charged!'];
  const accentStroke =
    activeVisual === 'soil' ? '#fb923c' : activeVisual === 'water' ? '#38bdf8' : '#fbbf24';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Moon Processing Lab"
        className="max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-[#091224] border-2 border-emerald-400 p-5 sm:p-6 shadow-2xl space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Factory className="w-3.5 h-3.5" />
            Simulated ISRU Lab · Real NASA Concept
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Moon Lab"
            className="btn-space btn-space-slate btn-space-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Moon Processing Lab</h2>
        <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2">
          <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
          “Tap any station below to watch raw lunar samples transform step-by-step into building supplies!”
        </p>

        {/* Live Animated Multi-Stage Resource Transformation Chamber */}
        <div className="rounded-2xl bg-[#050b17] border-2 border-slate-700 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span style={{ color: accentStroke }}>
              {activeVisual === 'soil'
                ? 'Sintering Kiln Chamber'
                : activeVisual === 'water'
                ? 'Ice Melt & Filter Extractor'
                : 'Solar Calibration Bank'}{' '}
              · {stageLabels[stageIdx]}
            </span>
            <span className="font-mono-num text-slate-200">
              {isBusy ? `${Math.round(processProgress)}%` : lastLabResult ? '100% Complete' : 'Idle'}
            </span>
          </div>

          <svg viewBox="0 0 540 132" className="w-full h-32 rounded-xl bg-[#040812] border border-slate-800">
            {/* Step Progress Track */}
            <rect x="18" y="18" width="92" height="94" rx="12" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <text x="64" y="34" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">RAW INPUT</text>

            {/* Conveyor / Flow Arrow 1 -> Chamber */}
            <line x1="114" y1="65" x2="176" y2="65" stroke={isBusy ? accentStroke : '#334155'} strokeWidth="3" strokeDasharray="6 4">
              {isBusy && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.7s" repeatCount="indefinite" />}
            </line>

            {/* Central Processing Chamber */}
            <rect
              x="180"
              y="12"
              width="180"
              height="106"
              rx="16"
              fill="#0b1326"
              stroke={isBusy || lastLabResult ? accentStroke : '#475569'}
              strokeWidth="2.2"
            />
            <text x="270" y="29" textAnchor="middle" fill={accentStroke} fontSize="9.5" fontWeight="800">
              {activeVisual === 'soil'
                ? 'THERMAL KILN CHAMBER'
                : activeVisual === 'water'
                ? 'MELT & FILTER CHAMBER'
                : 'PHOTOVOLTAIC CALIBRATOR'}
            </text>

            {/* Conveyor / Flow Arrow 2 -> Storage */}
            <line x1="364" y1="65" x2="424" y2="65" stroke={pctNorm > 0.72 ? '#34d399' : '#334155'} strokeWidth="3" strokeDasharray="6 4">
              {pctNorm > 0.72 && isBusy && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.7s" repeatCount="indefinite" />}
            </line>

            {/* Finished Storage Tray */}
            <rect
              x="428"
              y="18"
              width="94"
              height="94"
              rx="12"
              fill="#0f172a"
              stroke={pctNorm > 0.85 ? '#34d399' : '#334155'}
              strokeWidth={pctNorm > 0.85 ? 2.2 : 1.5}
            />
            <text x="475" y="34" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="700">STORAGE TRAY</text>

            {/* SOIL KILN VISUALS */}
            {activeVisual === 'soil' && (
              <>
                {/* Raw dust pile in intake */}
                <path d="M 34 94 Q 64 56 94 94 Z" fill="#64748b" />
                <circle cx="54" cy="78" r="2.5" fill="#94a3b8" />
                <circle cx="72" cy="82" r="2.2" fill="#cbd5e1" />
                {/* Traveling particle into kiln */}
                {isBusy && pctNorm < 0.7 && (
                  <circle cx={116 + pctNorm * 150} cy={65 + Math.sin(pctNorm * 24) * 5} r="5.5" fill="#94a3b8" />
                )}
                {/* Glowing Heater Coils + Brick Press */}
                <rect x="206" y="42" width="128" height="58" rx="10" fill={pctNorm > 0.25 && pctNorm < 0.85 ? '#431407' : '#0f172a'} stroke="#f97316" strokeOpacity={pctNorm > 0.25 ? 0.9 : 0.35} strokeWidth="2" />
                {[0, 1, 2, 3].map((idx) => (
                  <rect
                    key={idx}
                    x={218 + idx * 28}
                    y="48"
                    width="18"
                    height="8"
                    rx="3"
                    fill={pctNorm > 0.25 && pctNorm < 0.85 ? '#fb923c' : '#334155'}
                  />
                ))}
                {/* Transforming Powder -> Interlocking Orange Brick */}
                <rect
                  x="234"
                  y={64 + Math.max(0, 1 - pctNorm) * 8}
                  width={36 + pctNorm * 36}
                  height="24"
                  rx={12 - pctNorm * 9}
                  fill={pctNorm > 0.45 ? '#fb923c' : '#94a3b8'}
                  stroke="#fed7aa"
                  strokeWidth="1.5"
                />
                {/* Output Brick Stack in Storage */}
                <rect x="446" y="76" width="58" height="18" rx="4" fill="#fb923c" fillOpacity={pctNorm > 0.85 ? 1 : 0.3} stroke="#fed7aa" strokeWidth="1.2" />
                <rect x="454" y="56" width="42" height="17" rx="4" fill="#f97316" fillOpacity={pctNorm > 0.9 ? 1 : 0.25} stroke="#fed7aa" strokeWidth="1.2" />
              </>
            )}

            {/* WATER EXTRACTOR VISUALS */}
            {activeVisual === 'water' && (
              <>
                {/* Ice Core Cylinder Input */}
                <rect x="46" y="48" width="36" height="44" rx="8" fill="#bae6fd" stroke="#7dd3fc" strokeWidth="1.8" />
                <line x1="54" y1="58" x2="72" y2="66" stroke="#ffffff" strokeWidth="2" opacity="0.7" />
                {isBusy && pctNorm < 0.7 && (
                  <circle cx={116 + pctNorm * 150} cy={65 + Math.sin(pctNorm * 26) * 4} r="5.5" fill="#7dd3fc" />
                )}
                {/* Melt Chamber & Dual Filter Columns */}
                <rect x="202" y="42" width="54" height="58" rx="8" fill="#0c2647" stroke="#38bdf8" strokeWidth="1.6" />
                <rect
                  x="208"
                  y={96 - Math.min(46, pctNorm * 58)}
                  width="42"
                  height={Math.min(46, pctNorm * 58)}
                  rx="4"
                  fill="#0284c7"
                  opacity="0.85"
                />
                <rect x="272" y="42" width="24" height="58" rx="6" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.6" />
                <rect x="308" y="42" width="24" height="58" rx="6" fill="#0f172a" stroke="#34d399" strokeWidth="1.6" />
                {isBusy && (
                  <>
                    <circle cx="284" cy={50 + ((pctNorm * 140) % 44)} r="3.5" fill="#67e8f9" />
                    <circle cx="320" cy={50 + ((pctNorm * 180) % 44)} r="3.5" fill="#6ee7b7" />
                  </>
                )}
                {/* Clean Water Tank Storage Gauge */}
                <rect x="450" y="46" width="50" height="50" rx="8" fill="#082f49" stroke="#38bdf8" strokeWidth="1.8" />
                <rect
                  x="453"
                  y={93 - pctNorm * 42}
                  width="44"
                  height={pctNorm * 42}
                  rx="5"
                  fill="#38bdf8"
                />
              </>
            )}

            {/* SOLAR POWER BANK VISUALS */}
            {activeVisual === 'solar' && (
              <>
                {/* Sun Survey Chip Input */}
                <circle cx="64" cy="70" r="18" fill="#fbbf24" fillOpacity="0.25" stroke="#fbbf24" strokeWidth="1.8" />
                <circle cx="64" cy="70" r="9" fill="#fde047" />
                {isBusy && pctNorm < 0.7 && (
                  <circle cx={116 + pctNorm * 150} cy={65} r="5.5" fill="#fde047" />
                )}
                {/* Photon Alignment Matrix */}
                <line x1="204" y1="54" x2="296" y2="74" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 3" />
                <line x1="204" y1="74" x2="296" y2="74" stroke="#fbbf24" strokeWidth="2.5" />
                <rect x="292" y="46" width="44" height="52" rx="8" fill="#1e3a8a" stroke="#fde047" strokeWidth="1.8" />
                <line x1="314" y1="46" x2="314" y2="98" stroke="#93c5fd" strokeWidth="1" />
                <line x1="292" y1="72" x2="336" y2="72" stroke="#93c5fd" strokeWidth="1" />
                {/* Battery Cell Charge Bars in Storage */}
                <rect x="452" y="46" width="46" height="50" rx="8" fill="#052e16" stroke="#34d399" strokeWidth="1.8" />
                {[0, 1, 2, 3].map((bar) => (
                  <rect
                    key={bar}
                    x="458"
                    y={82 - bar * 10}
                    width="34"
                    height="7"
                    rx="2.5"
                    fill={pctNorm >= (bar + 1) * 0.24 ? '#34d399' : '#1e293b'}
                  />
                ))}
              </>
            )}
          </svg>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-[width] duration-75 ${
                activeVisual === 'soil'
                  ? 'bg-orange-400'
                  : activeVisual === 'water'
                  ? 'bg-sky-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${Math.round(pctNorm * 100)}%` }}
            />
          </div>

          {lastLabResult && !isBusy && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/60 text-xs text-emerald-100 animate-tip-pop">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <div>
                <strong className="text-emerald-300 mr-1.5">{lastLabResult.title}</strong>
                <span>{lastLabResult.detail}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Soil Sintering Kiln */}
          <div
            className={`rounded-2xl bg-slate-900 border p-4 flex flex-col justify-between space-y-3 transition-all ${
              processingStation === 'soil' ? 'border-orange-400 ring-2 ring-orange-400/40' : 'border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-orange-300 text-sm">Regolith Kiln</span>
                <Sparkles className={`w-4 h-4 text-orange-300 ${processingStation === 'soil' ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-xs text-slate-300 mb-2">
                Raw Soil: <strong className="text-white font-mono-num">{state.resources.rawSoil}</strong> → Regolith Units:{' '}
                <strong className="text-orange-300 font-mono-num">{state.resources.regolith}</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Used for: Crew Habitat, Air Scrubber & Radiation Wall
              </div>
            </div>
            <button
              type="button"
              disabled={state.resources.rawSoil < 1 || isBusy}
              onClick={() => {
                audioEngine.playArmMove();
                processProgressRef.current = 5;
                setProcessingStation('soil');
                setProcessProgress(5);
              }}
              className={`btn-space btn-space-sm w-full font-bold ${
                state.resources.rawSoil >= 1 && !isBusy
                  ? 'btn-space-orange'
                  : 'btn-space-slate'
              }`}
            >
              {processingStation === 'soil'
                ? 'Baking Bricks...'
                : state.resources.rawSoil >= 1
                ? 'Bake 1 Soil → +15 Regolith Units'
                : 'Scoop Raw Soil First'}
            </button>
          </div>

          {/* 2. Ice-to-Water Extractor */}
          <div
            className={`rounded-2xl bg-slate-900 border p-4 flex flex-col justify-between space-y-3 transition-all ${
              processingStation === 'water' ? 'border-sky-400 ring-2 ring-sky-400/40' : 'border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-sky-300 text-sm">Water Extractor</span>
                <Droplets className={`w-4 h-4 text-sky-300 ${processingStation === 'water' ? 'animate-bounce' : ''}`} />
              </div>
              <div className="text-xs text-slate-300 mb-2">
                Ice Samples: <strong className="text-white font-mono-num">{state.resources.iceCoreSamples}</strong> → Processed Water:{' '}
                <strong className="text-sky-300 font-mono-num">{state.resources.waterIceClues}</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Used for: Water Tanks, Oxygen Maker & Drinking Reserve
              </div>
            </div>
            <button
              type="button"
              disabled={state.resources.iceCoreSamples < 1 || isBusy}
              onClick={() => {
                audioEngine.playArmMove();
                processProgressRef.current = 5;
                setProcessingStation('water');
                setProcessProgress(5);
              }}
              className={`btn-space btn-space-sm w-full font-bold ${
                state.resources.iceCoreSamples >= 1 && !isBusy
                  ? 'btn-space-sky'
                  : 'btn-space-slate'
              }`}
            >
              {processingStation === 'water'
                ? 'Purifying Water...'
                : state.resources.iceCoreSamples >= 1
                ? 'Extract 1 Ice → +2 Processed Water'
                : 'Drill Ice Sample First'}
            </button>
          </div>

          {/* 3. Solar Battery Charger */}
          <div
            className={`rounded-2xl bg-slate-900 border p-4 flex flex-col justify-between space-y-3 transition-all ${
              processingStation === 'solar' ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-bold text-amber-300 text-sm">Solar Power Bank</span>
                <BatteryCharging className={`w-4 h-4 text-amber-300 ${processingStation === 'solar' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="text-xs text-slate-300 mb-2">
                Surveys: <strong className="text-white font-mono-num">{state.resources.solarSurveyCount}</strong> → Solar Kits:{' '}
                <strong className="text-amber-300 font-mono-num">{state.resources.sunlightData}</strong>
              </div>
              <div className="text-[11px] text-slate-400">
                Used for: Solar Panels & Backup Battery Bank ({state.resources.storedEnergy} kWh)
              </div>
            </div>
            <button
              type="button"
              disabled={state.resources.solarSurveyCount < 1 || isBusy}
              onClick={() => {
                audioEngine.playArmMove();
                processProgressRef.current = 5;
                setProcessingStation('solar');
                setProcessProgress(5);
              }}
              className={`btn-space btn-space-sm w-full font-bold ${
                state.resources.solarSurveyCount >= 1 && !isBusy
                  ? 'btn-space-amber'
                  : 'btn-space-slate'
              }`}
            >
              {processingStation === 'solar'
                ? 'Charging Solar Bank...'
                : state.resources.solarSurveyCount >= 1
                ? 'Charge 1 Survey → +2 Solar Kits'
                : 'Test Solar Ridge First'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-space btn-space-emerald btn-space-lg w-full font-display font-bold text-base"
        >
          Done in Lab
        </button>
      </div>
    </div>
  );
};
