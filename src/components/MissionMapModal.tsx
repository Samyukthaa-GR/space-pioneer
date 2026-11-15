import React, { useMemo, useRef, useState } from 'react';
import { Compass, Info, MapPin, Play, Trash2, X } from 'lucide-react';
import {
  BOULDERS,
  OUTPOST_SITES,
  ROCK_TARGETS,
  ROVER_SPAWN,
  SHADOWED_CRATERS,
  getSunlightFactor,
  getTerrainHeight,
} from '../game/lunarTerrain';
import { createLroReliefDataUrl } from '../game/lroMapTerrain';
import { getNasaMediaById } from '../game/nasaMedia';
import { getNearestTargetForRover, getRecommendedOutpostSlots } from '../game/rules';
import { GameState, Point2D } from '../game/types';

interface MissionMapModalProps {
  state: GameState;
  onClose: () => void;
  onInspectFeature?: () => void;
  onDrawPathPoints: (points: Point2D[], finished: boolean) => void;
  onStartRoute: () => void;
  onClearRoute: () => void;
}

interface SelectedFeatureInfo {
  title: string;
  badge: string;
  x: number;
  z: number;
  sunlightPct: number;
  elevationM: number;
  scientificInterest: string;
  whyRoverVisits: string;
  nasaRefId: string;
  distinction: string;
}

const MAP_RANGE = 42;

function worldToMap(x: number, z: number): { mx: number; my: number } {
  return {
    mx: ((x + MAP_RANGE) / (MAP_RANGE * 2)) * 420,
    my: ((z + MAP_RANGE) / (MAP_RANGE * 2)) * 420,
  };
}

function mapToWorld(mx: number, my: number): Point2D {
  return {
    x: (mx / 420) * (MAP_RANGE * 2) - MAP_RANGE,
    z: (my / 420) * (MAP_RANGE * 2) - MAP_RANGE,
  };
}

export const MissionMapModal: React.FC<MissionMapModalProps> = ({
  state,
  onClose,
  onInspectFeature,
  onDrawPathPoints,
  onStartRoute,
  onClearRoute,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const localPtsRef = useRef<Point2D[]>([]);

  const selectMapFeature = (info: SelectedFeatureInfo) => {
    setSelectedFeature(info);
    onInspectFeature?.();
  };

  const nearestObj = getNearestTargetForRover(state);
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeatureInfo>(() => {
    const t = nearestObj?.target ?? ROCK_TARGETS[0];
    return {
      title: t.name,
      badge: 'Suggested Next Target',
      x: t.x,
      z: t.z,
      sunlightPct: Math.round(getSunlightFactor(t.x, t.z) * 100),
      elevationM: Number(getTerrainHeight(t.x, t.z).toFixed(1)),
      scientificInterest: t.scienceFact,
      whyRoverVisits: t.astroReaction,
      nasaRefId: t.kind === 'hydrogen_clue' ? 'water_ice' : t.kind === 'sunlight_beacon' ? 'lunar_ridges' : 'lunar_surface',
      distinction: 'Simulated Lunar Zone · Modeled after NASA LRO South Pole Data',
    };
  });

  // LRO-modeled shaded elevation & solar illumination relief bitmap
  const lroReliefUrl = useMemo(() => createLroReliefDataUrl(MAP_RANGE, 360), []);

  const getWorldFromPointer = (e: React.PointerEvent<SVGSVGElement>): Point2D | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 420;
    const my = ((e.clientY - rect.top) / rect.height) * 420;
    return mapToWorld(mx, my);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Allow clicking feature markers cleanly without immediately wiping selection
    if ((e.target as Element)?.closest('[data-map-feature="true"]')) return;
    const pt = getWorldFromPointer(e);
    if (!pt) return;
    setDrawing(true);
    const next = [pt];
    localPtsRef.current = next;
    onDrawPathPoints(next, false);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const pt = getWorldFromPointer(e);
    if (!pt) return;
    const pts = localPtsRef.current;
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.z - prev.z) >= 1.2) {
      const next = [...pts, pt];
      localPtsRef.current = next;
      onDrawPathPoints(next, false);
    }
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    onDrawPathPoints([...localPtsRef.current], true);
  };

  const roverMap = worldToMap(state.rover.x, state.rover.z);
  const roverDeg = (state.rover.headingRad * 180) / Math.PI;
  const trailPointsAttr = useMemo(() => {
    return state.roverTrail
      .map((pt) => {
        const p = worldToMap(pt.x, pt.z);
        return `${p.mx.toFixed(1)},${p.my.toFixed(1)}`;
      })
      .join(' ');
  }, [state.roverTrail]);
  const spawnMap = worldToMap(ROVER_SPAWN.x, ROVER_SPAWN.z);
  const nextTargetMap = nearestObj ? worldToMap(nearestObj.target.x, nearestObj.target.z) : null;
  const validation = state.routePlanning.validation;
  const featureNasa = getNasaMediaById(selectedFeature.nasaRefId);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/75">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lunar South Pole LRO-Style Mission Map"
        className="max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-[#081020] border-2 border-sky-400/70 p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-sky-400" />
            <div>
              <h2 className="font-hero font-bold text-lg sm:text-xl text-white tracking-wide">
                Lunar South Pole Terrain & LRO Illumination Map
              </h2>
              <p className="text-xs text-slate-300">
                Tap any crater, ridge, or beacon to inspect it—or drag from {state.roverName} to plot an auto-pilot route!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mission map"
            className="btn-space btn-space-slate btn-space-icon"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-4 items-start">
          {/* Interactive Geographical Map */}
          <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#050912]">
            <svg
              ref={svgRef}
              viewBox="0 0 420 420"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-auto cursor-crosshair touch-none"
            >
              <defs>
                <pattern id="psrHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#1e40af" strokeOpacity="0.45" strokeWidth="2" />
                </pattern>
              </defs>

              {/* LRO-Modeled Elevation & Illumination Shaded Relief */}
              {lroReliefUrl && (
                <image href={lroReliefUrl} x="0" y="0" width="420" height="420" preserveAspectRatio="none" />
              )}

              {/* Subtle Topographical Rings & Grid */}
              <circle cx="210" cy="210" r="190" fill="none" stroke="#334155" strokeDasharray="3 5" strokeWidth="1" />
              <circle cx="210" cy="210" r="120" fill="none" stroke="#1e293b" strokeWidth="1" />

              {/* Explored areas */}
              {state.exploredCells.map((cell) => {
                const [cx, cz] = cell.split(',').map(Number);
                const p = worldToMap(cx * 12, cz * 12);
                return <circle key={cell} cx={p.mx} cy={p.my} r="32" fill="#38bdf8" fillOpacity="0.11" />;
              })}

              {/* Permanently Shadowed Crater Basins */}
              {SHADOWED_CRATERS.map((c) => {
                const p = worldToMap(c.x, c.z);
                const rPx = (c.radius / (MAP_RANGE * 2)) * 420;
                return (
                  <g
                    key={c.id}
                    data-map-feature="true"
                    className="cursor-pointer"
                    onClick={() =>
                      selectMapFeature({
                        title: c.name,
                        badge: 'Permanently Shadowed Region',
                        x: c.x,
                        z: c.z,
                        sunlightPct: 5,
                        elevationM: Number((-c.depth).toFixed(1)),
                        scientificInterest:
                          'Deep crater walls block low polar sunlight year-round, trapping freezing temperatures that may preserve ancient ice.',
                        whyRoverVisits:
                          'ASTRO uses headlights here to drill core samples and check whether hydrogen signals hold frozen water!',
                        nasaRefId: 'shadowed_regions',
                        distinction: 'Simulated Crater Zone · Modeled after NASA LRO Shackleton/South Pole PSRs',
                      })
                    }
                  >
                    <circle
                      cx={p.mx}
                      cy={p.my}
                      r={rPx}
                      fill="url(#psrHatch)"
                      stroke="#38bdf8"
                      strokeWidth="1.8"
                      strokeDasharray="5 4"
                    />
                    <circle cx={p.mx} cy={p.my} r={rPx * 0.65} fill="none" stroke="#1d4ed8" strokeOpacity="0.5" strokeWidth="1" />
                    <text
                      x={p.mx}
                      y={p.my - rPx + 14}
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize="9.5"
                      fontWeight="700"
                      style={{ paintOrder: 'stroke', stroke: '#040814', strokeWidth: 3 }}
                    >
                      {c.name} (PSR)
                    </text>
                  </g>
                );
              })}

              {/* Landing Zone Marker */}
              <g transform={`translate(${spawnMap.mx}, ${spawnMap.my + 22})`}>
                <rect x="-20" y="-7" width="40" height="14" rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#cbd5e1" fontSize="7" fontWeight="700">
                  LANDING
                </text>
              </g>

              {/* Suggested Dashed Guidance Path to Next Target */}
              {nextTargetMap && (
                <line
                  x1={roverMap.mx}
                  y1={roverMap.my}
                  x2={nextTargetMap.mx}
                  y2={nextTargetMap.my}
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  strokeOpacity="0.7"
                />
              )}

              {/* Candidate Outpost Sites */}
              {OUTPOST_SITES.map((s) => {
                const p = worldToMap(s.x, s.z);
                const chosen = state.selectedOutpostSite === s.id;
                return (
                  <g
                    key={s.id}
                    data-map-feature="true"
                    className="cursor-pointer"
                    onClick={() =>
                      selectMapFeature({
                        title: s.name,
                        badge: chosen ? 'Selected Outpost Site ✓' : 'Candidate Outpost Site',
                        x: s.x,
                        z: s.z,
                        sunlightPct: s.sunlightScore,
                        elevationM: Number(getTerrainHeight(s.x, s.z).toFixed(1)),
                        scientificInterest: s.description,
                        whyRoverVisits: s.tradeoffNote,
                        nasaRefId: s.id === 'ridge_haven' ? 'lunar_ridges' : 'shadowed_regions',
                        distinction: 'Simulated Candidate Site · Inspired by NASA Artemis South Pole Landing Regions',
                      })
                    }
                  >
                    <polygon
                      points={`${p.mx},${p.my - 12} ${p.mx + 12},${p.my} ${p.mx},${p.my + 12} ${p.mx - 12},${p.my}`}
                      fill={chosen ? '#22c55e' : s.id === 'ridge_haven' ? '#fbbf24' : '#60a5fa'}
                      fillOpacity={chosen ? 0.38 : 0.18}
                      stroke={s.id === 'ridge_haven' ? '#fbbf24' : '#60a5fa'}
                      strokeWidth="2.2"
                    />
                    <text
                      x={p.mx}
                      y={s.id === 'crater_rim_shadow' ? p.my - 16 : p.my + 24}
                      textAnchor="middle"
                      fill="#fde047"
                      fontSize="8.5"
                      fontWeight="700"
                      style={{ paintOrder: 'stroke', stroke: '#050912', strokeWidth: 3 }}
                    >
                      {s.name}
                    </text>
                  </g>
                );
              })}

              {/* Phase 3/4 Placed & Proposed Outpost Modules */}
              {state.phase >= 3 &&
                getRecommendedOutpostSlots(state.selectedOutpostSite).map((slot) => {
                  const placed = state.structures.find((st) => st.type === slot.type);
                  const p = worldToMap(placed ? placed.x : slot.x, placed ? placed.z : slot.z);
                  return (
                    <g key={`slot_${slot.type}`}>
                      <rect
                        x={p.mx - 5}
                        y={p.my - 5}
                        width="10"
                        height="10"
                        rx="2"
                        fill={placed ? (placed.connectedToHabitat || placed.type === 'habitat' ? '#10b981' : '#fbbf24') : 'none'}
                        stroke={placed ? '#ecfdf5' : '#38bdf8'}
                        strokeWidth="1.4"
                        strokeDasharray={placed ? undefined : '2 2'}
                      />
                    </g>
                  );
                })}

              {/* Boulders */}
              {BOULDERS.map((b) => {
                const p = worldToMap(b.x, b.z);
                const rPx = Math.max(5.5, (b.radius / (MAP_RANGE * 2)) * 420);
                const isBlocked = validation?.blockedByBoulderId === b.id;
                return (
                  <circle
                    key={b.id}
                    cx={p.mx}
                    cy={p.my}
                    r={rPx}
                    fill={isBlocked ? '#ef4444' : '#64748b'}
                    stroke={isBlocked ? '#fca5a5' : '#94a3b8'}
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Mission Targets (Clickable, distinct geometric symbols!) */}
              {ROCK_TARGETS.map((t) => {
                const p = worldToMap(t.x, t.z);
                const done =
                  state.scannedTargetIds.includes(t.id) || state.collectedTargetIds.includes(t.id);
                const color = done
                  ? '#10b981'
                  : t.kind === 'hydrogen_clue'
                  ? '#38bdf8'
                  : t.kind === 'dry_crater_probe'
                  ? '#94a3b8'
                  : t.kind === 'sunlight_beacon'
                  ? '#fbbf24'
                  : '#f97316';
                const alignEnd = t.x < 0 || t.id === 'rock_tutorial_basalt';
                const labelX = alignEnd ? p.mx - 10 : p.mx + 10;
                const labelY =
                  t.id === 'target_sunlight_ridge'
                    ? p.my - 12
                    : t.id === 'rock_tutorial_basalt'
                    ? p.my + 16
                    : p.my + 3;
                return (
                  <g
                    key={t.id}
                    data-map-feature="true"
                    className="cursor-pointer"
                    onClick={() =>
                      selectMapFeature({
                        title: t.name,
                        badge: done ? 'Completed ✓' : `Phase ${t.phase} Target`,
                        x: t.x,
                        z: t.z,
                        sunlightPct: Math.round(getSunlightFactor(t.x, t.z) * 100),
                        elevationM: Number(getTerrainHeight(t.x, t.z).toFixed(1)),
                        scientificInterest: t.scienceFact,
                        whyRoverVisits: t.astroReaction,
                        nasaRefId:
                          t.kind === 'hydrogen_clue' || t.kind === 'dry_crater_probe'
                            ? 'water_ice'
                            : t.kind === 'regolith_loose'
                            ? 'regolith'
                            : t.kind === 'sunlight_beacon'
                            ? 'solar_panels'
                            : t.kind === 'basalt'
                            ? 'basalt_rocks'
                            : t.kind === 'anorthosite'
                            ? 'anorthosite_highlands'
                            : 'lunar_surface',
                        distinction: 'Simulated Survey Target · Grounded in NASA Lunar Science',
                      })
                    }
                  >
                    {t.kind === 'sunlight_beacon' ? (
                      <polygon
                        points={`${p.mx},${p.my - 8} ${p.mx + 7.5},${p.my + 6} ${p.mx - 7.5},${p.my + 6}`}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    ) : t.kind === 'hydrogen_clue' || t.kind === 'dry_crater_probe' ? (
                      <path
                        d={`M ${p.mx} ${p.my - 8} L ${p.mx + 6.5} ${p.my + 2} A 6.5 6.5 0 1 1 ${p.mx - 6.5} ${p.my + 2} Z`}
                        fill={color}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <circle cx={p.mx} cy={p.my} r="7" fill={color} stroke="#0f172a" strokeWidth="1.5" />
                    )}
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor={alignEnd ? 'end' : 'start'}
                      fill="#e2e8f0"
                      fontSize="8.5"
                      fontWeight="600"
                      style={{ paintOrder: 'stroke', stroke: '#050912', strokeWidth: 3 }}
                    >
                      {t.shortLabel}
                    </text>
                  </g>
                );
              })}

              {/* Real-Time Rover Trail History */}
              {state.roverTrail.length > 1 && (
                <polyline
                  points={trailPointsAttr}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="3 4"
                  strokeOpacity="0.8"
                  strokeLinecap="round"
                />
              )}

              {/* Drawn Route Preview */}
              {validation && validation.sampledPoints.length > 1 && (
                <g>
                  {validation.sampledPoints.slice(1).map((pt, i) => {
                    const prev = validation.sampledPoints[i];
                    const p1 = worldToMap(prev.x, prev.z);
                    const p2 = worldToMap(pt.x, pt.z);
                    return (
                      <line
                        key={i}
                        x1={p1.mx}
                        y1={p1.my}
                        x2={p2.mx}
                        y2={p2.my}
                        stroke={pt.valid && prev.valid ? '#34d399' : '#ef4444'}
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}

              {/* Real-Time Rotated Rover Heading Marker */}
              <g transform={`translate(${roverMap.mx}, ${roverMap.my})`}>
                <circle r="13" fill="#38bdf8" fillOpacity="0.22" stroke="#38bdf8" strokeWidth="1.5" />
                <polygon
                  points="0,-9 7,6 0,3 -7,6"
                  fill="#fbbf24"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                  transform={`rotate(${180 - roverDeg})`}
                />
                <text y="-16" textAnchor="middle" fill="#fde047" fontSize="10" fontWeight="700">
                  {state.roverName}
                </text>
              </g>
            </svg>
            <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /> Rock/Soil
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Ice Probe
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 inline-block" /> Site / Sun
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Done
                </span>
              </div>
              <span className="text-sky-300/90 font-semibold">LRO-Modeled Shaded Relief · Simulated Terrain</span>
            </div>
          </div>

          {/* Right Column: Selected Site Inspector + NASA Reference + Route Actions */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900 border border-sky-400/50 overflow-hidden">
              <img
                src={featureNasa.imageUrl}
                alt={featureNasa.title}
                className="w-full h-28 object-cover"
              />
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300">
                    {selectedFeature.badge}
                  </span>
                  <span className="text-[11px] font-mono-num text-amber-300 font-bold">
                    {selectedFeature.sunlightPct}% Sun · {selectedFeature.elevationM}m
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-white">{selectedFeature.title}</h3>
                <p className="text-xs text-slate-200 leading-snug">{selectedFeature.scientificInterest}</p>
                <p className="text-[11px] text-emerald-200 leading-snug">
                  <strong>Why visit: </strong>
                  {selectedFeature.whyRoverVisits}
                </p>
                <div className="text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
                  <span className="flex items-start gap-1">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      {selectedFeature.distinction} · {featureNasa.nasaId}
                    </span>
                  </span>
                  <a
                    href={featureNasa.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:underline font-semibold"
                  >
                    {featureNasa.officialLinkLabel} ↗
                  </a>
                </div>
              </div>
            </div>

            {validation && (
              <div
                className={`rounded-2xl p-3 border text-xs ${
                  validation.valid
                    ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-100'
                    : 'bg-rose-500/15 border-rose-400/60 text-rose-100'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {validation.valid ? 'Safe Route Ready' : 'Route Needs Fixing'}
                </div>
                <p className="leading-snug mb-1">{validation.childMessage}</p>
                <div className="font-mono-num text-[11px] text-slate-300">
                  Distance: {validation.estimatedDistanceM}m · Energy: {validation.estimatedEnergyCost}%
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {validation?.valid && (
                <button
                  type="button"
                  onClick={() => {
                    onStartRoute();
                    onClose();
                  }}
                  className="btn-space btn-space-emerald btn-space-md w-full gap-2 font-display font-bold text-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  START ROVER ROUTE
                </button>
              )}
              {state.routePlanning.rawPoints.length > 0 && (
                <button
                  type="button"
                  onClick={onClearRoute}
                  className="btn-space btn-space-slate btn-space-sm w-full gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Path
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
