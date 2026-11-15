import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  Wind,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { getOutpostEquipmentStatus } from '../game/rules';
import { GameState, Phase4ChallengeId } from '../game/types';

/* 1. Cinematic Phase 4 Opening Story */
export const SurvivePhaseIntro: React.FC<{
  state: GameState;
  onContinue: () => void;
}> = ({ state, onContinue }) => {
  const [pillarIdx, setPillarIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const roverXRef = useRef<number>(120);
  const eq = getOutpostEquipmentStatus(state.structures, state.connections);

  const pillars = [
    {
      label: '1. Electricity',
      detail: eq.hasSolar
        ? `Your ${eq.solarConnected ? 'connected ' : ''}Solar Panels & Battery keep lights and heaters humming!`
        : 'Every base needs power so machines never shut off!',
      Icon: Zap,
      color: 'text-amber-300 border-amber-400/60',
    },
    {
      label: '2. Clean Water',
      detail: eq.hasWater
        ? 'Your Water Tanks recycle every precious drop for astronauts!'
        : 'Astronauts recycle water carefully on the dry Moon!',
      Icon: Droplets,
      color: 'text-sky-300 border-sky-400/60',
    },
    {
      label: '3. Cozy Temperature',
      detail: 'Moon nights plunge to -130°C—radiators and heaters keep domes at 21°C!',
      Icon: Flame,
      color: 'text-orange-300 border-orange-400/60',
    },
    {
      label: '4. Fresh Breathable Air',
      detail: eq.hasAir
        ? 'Your Air Scrubber removes CO₂ while Oxygen Maker pumps fresh O₂!'
        : 'Scrubbers clear stale CO₂ and supply fresh oxygen!',
      Icon: Wind,
      color: 'text-emerald-300 border-emerald-400/60',
    },
    {
      label: '5. Space Hazard Safety',
      detail: eq.hasShielding
        ? 'Your Regolith Wall & inner shelter shutters protect crew from solar particles!'
        : 'Inner Habitat shutters shelter astronauts if fast solar particles arrive!',
      Icon: ShieldCheck,
      color: 'text-rose-300 border-rose-400/60',
    },
  ];

  const introSpeech =
    'Awesome base, Commander! Building our home was part one—now comes Phase Four: keeping astronauts safe! Let us learn how Electricity, Water, Warmth, Fresh Air, and Storm Shields protect our Moon crew.';

  useEffect(() => {
    audioEngine.speakOnce('phase4_cinematic_intro', introSpeech, 'warm');
  }, [introSpeech]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPillarIdx((i) => (i + 1) % pillars.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [pillars.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#020510');
      bg.addColorStop(0.65, '#071128');
      bg.addColorStop(1, '#0f1c35');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const camDrift = Math.sin(t * 0.4) * 5;

      // Crisp stars
      for (let i = 0; i < 40; i++) {
        const alpha = 0.3 + 0.55 * Math.abs(Math.sin(t * 1.8 + i * 0.7));
        ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc((i * 89 + 14 + camDrift * 0.3 + w) % w, (i * 41 + 9) % (h * 0.58), i % 3 === 0 ? 1.5 : 1.0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Earth in sky
      const ex = w * 0.87 + camDrift * 0.4;
      const ey = h * 0.21;
      const eg = ctx.createRadialGradient(ex - 5, ey - 5, 2, ex, ey, 16);
      eg.addColorStop(0, '#93c5fd');
      eg.addColorStop(0.6, '#1d4ed8');
      eg.addColorStop(1, '#091430');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, 15, 0, Math.PI * 2);
      ctx.fill();

      // Sunbeams if pillar 0 active
      if (pillarIdx === 0) {
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.38)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -t * 38;
        for (const ox of [w * 0.12, w * 0.18, w * 0.24]) {
          ctx.beginPath();
          ctx.moveTo(40, 22);
          ctx.lineTo(ox, h * 0.72 - 20);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Lunar ground with subtle crater shadow
      const gy = h * 0.74;
      const gGrad = ctx.createLinearGradient(0, gy, 0, h);
      gGrad.addColorStop(0, '#475569');
      gGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = gGrad;
      ctx.fillRect(0, gy, w, h - gy);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      const hx = w * 0.5;
      // Central Habitat
      if (eq.hasHabitat) {
        const domeGlow = pillarIdx === 2 ? '#fbbf24' : pillarIdx === 4 ? '#fb923c' : '#34d399';
        const aura = ctx.createRadialGradient(hx, gy - 10, 6, hx, gy - 10, 54);
        aura.addColorStop(0, `${domeGlow}36`);
        aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(hx, gy - 10, 54, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = domeGlow;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hx, gy, 40, Math.PI, 0);
        ctx.lineTo(hx + 40, gy + 12);
        ctx.lineTo(hx - 40, gy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cozy interior warmth pulse
        const winAlpha = pillarIdx === 2 ? 0.72 + 0.28 * Math.sin(t * 5) : 0.85;
        ctx.fillStyle = `rgba(251, 191, 36, ${winAlpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.roundRect(hx - 15, gy - 15, 30, 11, 4);
        ctx.fill();
      }

      // Built Phase 3 Solar Panels + animated power pulse
      if (eq.hasSolar) {
        ctx.fillStyle = '#1d4ed8';
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.fillRect(w * 0.13, gy - 24, 44, 21);
        ctx.strokeRect(w * 0.13, gy - 24, 44, 21);
        if (eq.solarConnected) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(w * 0.13 + 44, gy);
          ctx.lineTo(hx - 40, gy);
          ctx.stroke();
          const sparkX = w * 0.13 + 44 + ((t * 90) % (hx - 40 - (w * 0.13 + 44)));
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(sparkX, gy, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Built Battery Bank with live charge bars
      if (eq.hasBattery) {
        ctx.fillStyle = '#065f46';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.fillRect(w * 0.28, gy - 18, 28, 20);
        ctx.strokeRect(w * 0.28, gy - 18, 28, 20);
        const bars = pillarIdx === 0 ? 1 + (Math.floor(t * 3) % 3) : 3;
        ctx.fillStyle = '#34d399';
        for (let b = 0; b < bars; b++) {
          ctx.fillRect(w * 0.28 + 5, gy - 2 - b * 5, 18, 3);
        }
      }

      // Built Water Tank + droplet flow on Pillar 1
      if (eq.hasWater) {
        ctx.fillStyle = '#082f49';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(w * 0.67, gy - 27, 32, 27);
        ctx.strokeRect(w * 0.67, gy - 27, 32, 27);
        const lvl = 14 + Math.sin(t * 3) * 2.5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.fillRect(w * 0.67 + 3, gy - lvl, 26, lvl - 2);
        if (pillarIdx === 1) {
          const span = w * 0.67 - (hx + 40);
          const dx = w * 0.67 - ((t * 65) % Math.max(20, span));
          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.arc(dx, gy - 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Built Air Scrubber / Oxygen Maker with rotating fan + O2 bubbles on Pillar 3
      if (eq.hasAir || eq.hasOxygen) {
        const ax = w * 0.81;
        ctx.fillStyle = '#064e3b';
        ctx.strokeStyle = '#6ee7b7';
        ctx.lineWidth = 2;
        ctx.fillRect(ax, gy - 25, 32, 25);
        ctx.strokeRect(ax, gy - 25, 32, 25);
        ctx.save();
        ctx.translate(ax + 16, gy - 12);
        ctx.rotate(t * (pillarIdx === 3 ? 6 : 2.5));
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2;
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -7);
          ctx.stroke();
        }
        ctx.restore();
        if (pillarIdx === 3) {
          for (let i = 0; i < 3; i++) {
            const by = gy - 28 - ((t * 28 + i * 14) % 34);
            ctx.fillStyle = 'rgba(110, 231, 183, 0.78)';
            ctx.beginPath();
            ctx.arc(ax + 8 + i * 8, by, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Regolith Shield Wall
      if (eq.hasShielding) {
        ctx.fillStyle = '#9a3412';
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.fillRect(hx - 54, gy - 25, 11, 26);
        ctx.strokeRect(hx - 54, gy - 25, 11, 26);
      }

      // Pillar-specific environmental effects: Frost crystals (Pillar 2) & Solar Particles (Pillar 4)
      if (pillarIdx === 2) {
        ctx.fillStyle = 'rgba(125, 211, 252, 0.7)';
        for (let f = 0; f < 6; f++) {
          const fx = (f * 93 + t * 18) % w;
          const fy = (f * 37 + t * 24) % (gy - 10);
          ctx.beginPath();
          ctx.arc(fx, fy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pillarIdx === 4) {
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.8)';
        ctx.lineWidth = 2;
        for (let s = 0; s < 5; s++) {
          const progress = (t * 1.4 + s * 0.21) % 1;
          const sx = w * 0.1 + s * 75 + progress * 48;
          const sy = progress * (gy - 36);
          ctx.beginPath();
          ctx.moveTo(sx - 10, sy - 10);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
      }

      // Smoothly patrolling ASTRO rover inspecting each pillar station
      const targetX = [w * 0.22, w * 0.7, hx, w * 0.83, hx - 48][pillarIdx] ?? hx;
      roverXRef.current += (targetX - roverXRef.current) * 0.05;
      const rx = roverXRef.current;
      const movingDir = targetX >= rx ? 1 : -1;
      ctx.save();
      ctx.translate(rx, gy + 9);
      ctx.scale(movingDir, 1);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(-11, -8, 22, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-5, -6, 9, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(6, -13, 6, 4);
      for (const wx of [-7, 0, 7]) {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(wx, 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Pulsing spotlight ring around inspected station
      ctx.strokeStyle = `rgba(251, 191, 36, ${(0.5 + 0.4 * Math.sin(t * 4.5)).toFixed(2)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(targetX, gy - 12, 29, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [eq, pillarIdx]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/78">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Phase 4 Survival Story Introduction"
        className="max-w-2xl w-full max-h-[92vh] overflow-y-auto rounded-3xl bg-[#071022] border-2 border-amber-400/80 p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Phase 4 · Life Support Story
          </span>
          <button
            type="button"
            onClick={() => audioEngine.speak(introSpeech, 'warm')}
            className="btn-space btn-space-sm btn-space-slate gap-1.5 text-sky-200"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Replay Voice
          </button>
        </div>

        <div>
          <h2 className="font-hero text-2xl sm:text-3xl text-white leading-tight">
            How Astronauts Survive on the Moon
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">
            Building your outpost was step one—now let’s learn how all five survival systems protect our crew!
          </p>
        </div>

        <canvas
          ref={canvasRef}
          width={560}
          height={186}
          className="w-full h-44 rounded-2xl border border-slate-700 bg-[#030713]"
        />

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {pillars.map((p, idx) => {
            const Icon = p.Icon;
            const active = idx === pillarIdx;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setPillarIdx(idx)}
                className={`btn-space p-2.5 flex-col items-start text-left transition-all ${
                  active
                    ? `btn-space-amber-soft ${p.color} ring-1 ring-amber-400`
                    : 'btn-space-slate text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <div className="font-display font-bold text-[11px] leading-tight">{p.label}</div>
              </button>
            );
          })}
        </div>

        <div className="px-3.5 py-2.5 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-xs sm:text-sm text-sky-100">
          <strong className="text-amber-300 mr-1.5">{state.roverName}:</strong>
          “{pillars[pillarIdx]?.detail}”
        </div>

        <button
          type="button"
          onClick={() => {
            audioEngine.playDiscovery();
            audioEngine.stopSpeech();
            onContinue();
          }}
          className="btn-space btn-space-lg btn-space-amber w-full gap-2 font-bold"
        >
          <Play className="w-5 h-5 fill-current" />
          Inspect Our Built Outpost →
        </button>
      </div>
    </div>
  );
};

/* 2. Teach-Before-Emergency Interactive 3-Step Visual Lesson for Each Scenario */
interface LessonScript {
  badge: string;
  title: string;
  conceptSpeech: string;
  conceptCaption: string;
  workingCaption: string;
  problemTitle: string;
  problemCaption: string;
  solutionCaption: string;
  solutionSteps: string[];
  accentHex: string;
}

const LESSON_SCRIPTS: Record<Phase4ChallengeId, LessonScript> = {
  low_sunlight: {
    badge: 'LESSON 1 · ELECTRICITY & BACKUPS',
    title: 'How Outpost Power Works',
    conceptSpeech:
      'First let us learn how power works! Sunlight turns Solar Panels on, charging our Battery Bank. If sunlight dips, we turn off extra lab lights and switch on our Backup Battery!',
    conceptCaption: 'Sunlight → Solar Panels → Battery Bank → Habitat Heaters & Air',
    workingCaption: 'Working Normally: Steady sun rays keep battery full and cabin powered.',
    problemTitle: 'What Could Go Wrong: Low-Sunlight Shadow Dip',
    problemCaption: 'Long Moon shadows lower solar watts while extra lab lights drain power fast.',
    solutionCaption: 'Your Solution: Visit Battery Bank → Switch Off Extra Lights → Enable Backup Battery!',
    solutionSteps: ['1. Visit Battery Station', '2. Switch Off Extra Lights', '3. Turn On Backup Battery'],
    accentHex: '#fbbf24',
  },
  extreme_temperature: {
    badge: 'LESSON 2 · CABIN TEMPERATURE',
    title: 'Staying Warm in Freezing Moon Night',
    conceptSpeech:
      'Outside the habitat, Moon shadows drop way below freezing! Radiators release extra heat when sunny, so if a radiator louver sticks open, heat leaks away until we close it and boost heaters!',
    conceptCaption: 'Insulated Dome + Adjustable Radiator Louver + Habitat Heaters = Cozy 21°C',
    workingCaption: 'Working Normally: Closed night louvers trap cozy warmth inside the dome.',
    problemTitle: 'What Could Go Wrong: Stuck Radiator Valve',
    problemCaption: 'A stuck-open radiator spills indoor warmth out into freezing space!',
    solutionCaption: 'Your Solution: Visit Habitat → Close Stuck Radiator → Boost Habitat Heaters!',
    solutionSteps: ['1. Visit Habitat Dome', '2. Close Stuck Radiator', '3. Boost Cabin Heaters'],
    accentHex: '#38bdf8',
  },
  water_shortage: {
    badge: 'LESSON 3 · WATER RECYCLING',
    title: 'Protecting Every Drop of Moon Water',
    conceptSpeech:
      'Every drop of water on the Moon is treasure! Water Tanks pump clean water for drinking and oxygen. If a pipe valve loosens, tighten the valve first and open your processed reserve!',
    conceptCaption: 'Water Tanks → Habitat Pipes → Recycling Loop → Oxygen Maker',
    workingCaption: 'Working Normally: Sealed pipes loop clean water smoothly with zero leaks.',
    problemTitle: 'What Could Go Wrong: Loose Pipe Coupling',
    problemCaption: 'A tiny loose valve drains tank pressure until sealed tight.',
    solutionCaption: 'Your Solution: Visit Water Tanks → Tighten Valve → Open Processed Reserve!',
    solutionSteps: ['1. Visit Water Tanks', '2. Tighten Loose Valve', '3. Open Processed Reserve'],
    accentHex: '#22d3ee',
  },
  life_support: {
    badge: 'LESSON 4 · FRESH AIR & CO₂ SCRUBBER',
    title: 'Keeping Cabin Air Fresh & Clean',
    conceptSpeech:
      'As astronauts breathe, carbon dioxide builds up inside the dome. Our Air Scrubber traps CO2 while Oxygen Makers refresh air—so if dusty lint clogs the intake, brush dust, swap the filter, and restart the fan!',
    conceptCaption: 'Air Scrubber Filters CO₂ · Oxygen Maker Supplies Fresh O₂',
    workingCaption: 'Working Normally: Clean fan draws stale CO₂ out and circulates fresh O₂.',
    problemTitle: 'What Could Go Wrong: Lunar Dust Clogging',
    problemCaption: 'Sticky Moon dust coats the scrubber mesh, making CO₂ climb slowly.',
    solutionCaption: 'Your Solution: Visit Air Scrubber → Brush Dust & Swap Filter → Restart Fan!',
    solutionSteps: ['1. Inspect Intake', '2. Brush Dust & Swap Filter', '3. Restart Scrubber Fan'],
    accentHex: '#34d399',
  },
  solar_particle_event: {
    badge: 'LESSON 5 · SPACE WEATHER SAFETY',
    title: 'Solar Particle Alerts & Crew Safety',
    conceptSpeech:
      'Sometimes the Sun sends fast invisible energy particles across space. Space weather alerts warn us ahead of time so astronauts can step inside the shielded core and seal storm shutters safely!',
    conceptCaption: 'Weather Alert Beacon + Inner Core Shelter + Regolith & Storm Shutters',
    workingCaption: 'Calm Space Weather: Normal habitat walls easily shield everyday sunlight.',
    problemTitle: 'What Could Go Wrong: Incoming Solar Particle Burst',
    problemCaption: 'Fast solar particles arrive—astronauts stay calm by moving inside protective shields!',
    solutionCaption: 'Your Solution: Check Weather Alert → Move Crew to Core → Close Shield Shutters!',
    solutionSteps: ['1. Check Solar Alert', '2. Move Crew Inside Core', '3. Seal Shield Shutters'],
    accentHex: '#fb923c',
  },
};

export const SurvivalScenarioLesson: React.FC<{
  challengeId: Phase4ChallengeId;
  state: GameState;
  onStartActivity: () => void;
}> = ({ challengeId, state, onStartActivity }) => {
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0: Concept & Built Equipment, 1: Problem & Working Comparison, 2: Guided Solution Preview
  const lesson = LESSON_SCRIPTS[challengeId];
  const eq = getOutpostEquipmentStatus(state.structures, state.connections);

  useEffect(() => {
    setStage(0);
    audioEngine.speakOnce(`lesson_intro_${challengeId}`, lesson.conceptSpeech, 'warm');
  }, [challengeId, lesson.conceptSpeech]);

  // Honest build-phase consistency check
  const buildConsistencyNote = (() => {
    if (challengeId === 'low_sunlight') {
      return eq.hasBattery && eq.hasSolar
        ? `Built Check ✓: Using your Phase 3 Solar Panels & Battery Bank${eq.batteryConnected ? ' (Wired ✓)' : ' (Needs Line Check)'}.`
        : 'Emergency Backup Reserve Engaged from Outpost Core.';
    }
    if (challengeId === 'extreme_temperature') {
      return `Built Check ✓: Inspecting your Phase 3 Crew Habitat Thermal Core.`;
    }
    if (challengeId === 'water_shortage') {
      return eq.hasWater
        ? `Built Check ✓: Using your Phase 3 Water Tanks${eq.waterConnected ? ' (Piped ✓)' : ''} (${state.resources.waterIceClues} Water Ready).`
        : 'Using emergency Habitat water loop reserve.';
    }
    if (challengeId === 'life_support') {
      return eq.hasAir
        ? `Built Check ✓: Inspecting your Phase 3 Air Scrubber${eq.hasOxygen ? ' & Oxygen Maker' : ''}.`
        : 'Inspecting core Habitat air circulation filter.';
    }
    return eq.hasShielding
      ? 'Built Check ✓: Your Phase 3 Regolith Wall + Habitat Core are ready to protect the crew!'
      : 'Built Check Note: No outer Regolith Wall was built, so Habitat Inner Core & Shutters will shield the crew!';
  })();

  const stepTags = ['1 · Concept & Equipment', '2 · What Could Go Wrong', '3 · How We Fix It'];

  return (
    <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[calc(100vw-1.5rem)] pointer-events-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lesson.title}
        className="rounded-3xl bg-[#071124]/98 border-2 border-sky-400 p-4 sm:p-5 shadow-2xl space-y-3 max-h-[78vh] overflow-y-auto"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {lesson.badge}
          </span>
          <button
            type="button"
            onClick={() => audioEngine.speak(lesson.conceptSpeech, 'warm')}
            className="btn-space btn-space-sm btn-space-slate gap-1.5 text-sky-200"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Hear {state.roverName}
          </button>
        </div>

        <div>
          <h3 className="font-hero text-xl sm:text-2xl text-white leading-tight">{lesson.title}</h3>
          <div className="text-[11px] font-semibold text-emerald-300 mt-0.5">{buildConsistencyNote}</div>
        </div>

        {/* 3-tab Animated Visual Learning Diagram */}
        <div className="flex gap-1.5">
          {stepTags.map((t, idx) => (
            <button
              key={t}
              type="button"
              onClick={() => setStage(idx as 0 | 1 | 2)}
              className={`btn-space btn-space-xs flex-1 font-bold ${
                stage === idx ? 'btn-space-sky' : 'btn-space-slate'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Animated Equipment Visual Comparison SVG */}
        <svg viewBox="0 0 520 132" className="w-full h-32 rounded-2xl bg-[#040914] border border-slate-700">
          {/* Left box: Your Built Module */}
          <rect x="18" y="18" width="136" height="96" rx="14" fill="#0f172a" stroke={lesson.accentHex} strokeWidth="2" />
          <text x="86" y="36" textAnchor="middle" fill={lesson.accentHex} fontSize="9.5" fontWeight="800">
            YOUR MODULE
          </text>

          {/* Animated Flow Arrow */}
          <line
            x1="160"
            y1="66"
            x2="220"
            y2="66"
            stroke={stage === 1 ? '#fb7185' : '#34d399'}
            strokeWidth="3.5"
            strokeDasharray="6 4"
          >
            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
          </line>

          {/* Center-Right: System Response Visualization */}
          <rect
            x="228"
            y="18"
            width="274"
            height="96"
            rx="14"
            fill={stage === 1 ? '#220b12' : '#081b1a'}
            stroke={stage === 1 ? '#fb7185' : '#34d399'}
            strokeWidth="2"
          />

          {challengeId === 'low_sunlight' && (
            <>
              <circle cx="56" cy="64" r="14" fill="#fbbf24" opacity={stage === 1 ? 0.35 : 1} />
              <rect x="88" y="48" width="44" height="32" rx="6" fill="#065f46" stroke="#34d399" strokeWidth="1.8" />
              <text x="110" y="68" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="800">BATT</text>
              <text x="365" y="54" textAnchor="middle" fill={stage === 1 ? '#fda4af' : '#6ee7b7'} fontSize="12" fontWeight="800">
                {stage === 0 ? 'POWER FLOWING: 100%' : stage === 1 ? 'EXTRA LIGHTS DRAINING!' : 'LIGHTS OFF + BACKUP ON ✓'}
              </text>
              <rect x="268" y="70" width="194" height="18" rx="6" fill="#0f172a" stroke="#334155" />
              <rect
                x="270"
                y="72"
                width={stage === 1 ? 54 : 184}
                height="14"
                rx="5"
                fill={stage === 1 ? '#fb7185' : '#34d399'}
              />
            </>
          )}

          {challengeId === 'extreme_temperature' && (
            <>
              <path d="M 46 84 A 38 38 0 0 1 122 84 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <text x="84" y="102" textAnchor="middle" fill="#bae6fd" fontSize="9" fontWeight="700">HABITAT</text>
              <text x="365" y="56" textAnchor="middle" fill={stage === 1 ? '#7dd3fc' : '#fde047'} fontSize="13" fontWeight="800">
                {stage === 0 ? 'COZY CABIN: 21°C' : stage === 1 ? 'OPEN VALVE LEAKING: 6°C' : 'VALVE CLOSED · HEATERS 21°C ✓'}
              </text>
              <text x="365" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                {stage === 2 ? 'Close Radiator Louver → Boost Heaters' : 'Moon Shadows: -130°C Outside'}
              </text>
            </>
          )}

          {challengeId === 'water_shortage' && (
            <>
              <rect x="52" y="46" width="28" height="46" rx="6" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.8" />
              <rect x="92" y="46" width="28" height="46" rx="6" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.8" />
              <text x="365" y="56" textAnchor="middle" fill={stage === 1 ? '#fda4af' : '#7dd3fc'} fontSize="12.5" fontWeight="800">
                {stage === 0 ? 'WATER TANK: RECYCLING' : stage === 1 ? 'LOOSE VALVE DRIPPING!' : 'VALVE TIGHT + RESERVE OPEN ✓'}
              </text>
              <text x="365" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                {stage === 2 ? 'Tighten Pipe Valve → Open Lab Water Reserve' : 'Recycles Crew Water & Makes Oxygen'}
              </text>
            </>
          )}

          {challengeId === 'life_support' && (
            <>
              <circle cx="86" cy="70" r="24" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
              <text x="86" y="74" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="800">SCRUB</text>
              <text x="365" y="56" textAnchor="middle" fill={stage === 1 ? '#fde047' : '#6ee7b7'} fontSize="12.5" fontWeight="800">
                {stage === 0 ? 'CLEAN AIR: CO₂ 0.4% · O₂ 21%' : stage === 1 ? 'DUST CLOGGED INTAKE!' : 'BRUSH DUST → SWAP FILTER → FAN ON ✓'}
              </text>
              <text x="365" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                {stage === 2 ? '3 Quick Steps Clear Fresh Air' : 'Traps Stale CO₂ So Astronauts Breathe Easy'}
              </text>
            </>
          )}

          {challengeId === 'solar_particle_event' && (
            <>
              {eq.hasShielding && (
                <rect x="34" y="50" width="16" height="44" rx="4" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />
              )}
              <path d="M 60 88 A 34 34 0 0 1 128 88 Z" fill="#1e293b" stroke="#fb923c" strokeWidth="2" />
              <text x="365" y="56" textAnchor="middle" fill={stage === 1 ? '#fda4af' : '#6ee7b7'} fontSize="12.5" fontWeight="800">
                {stage === 0 ? 'CALM SPACE WEATHER' : stage === 1 ? 'SOLAR PARTICLES INCOMING!' : 'CREW IN CORE + SHUTTERS SEALED ✓'}
              </text>
              <text x="365" y="84" textAnchor="middle" fill="#cbd5e1" fontSize="10.5">
                {stage === 2 ? 'Check Alert → Shelter Crew → Seal Shutters' : eq.hasShielding ? 'Regolith Wall Helps Block Particles!' : 'Inner Core Shutters Protect Crew!'}
              </text>
            </>
          )}
        </svg>

        <div className="px-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-slate-100">
          {stage === 0 && (
            <div>
              <strong className="text-sky-300 mr-1.5">How It Works:</strong>
              {lesson.conceptCaption} — {lesson.workingCaption}
            </div>
          )}
          {stage === 1 && (
            <div>
              <strong className="text-rose-300 mr-1.5">{lesson.problemTitle}:</strong>
              {lesson.problemCaption}
            </div>
          )}
          {stage === 2 && (
            <div className="space-y-1.5">
              <div className="text-emerald-300 font-bold">{lesson.solutionCaption}</div>
              <div className="flex flex-wrap gap-1.5">
                {lesson.solutionSteps.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 text-xs font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          {stage > 0 ? (
            <button
              type="button"
              onClick={() => setStage((s) => (s - 1) as 0 | 1 | 2)}
              className="btn-space btn-space-sm btn-space-slate gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {stage < 2 ? (
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setStage((s) => (s + 1) as 0 | 1 | 2);
              }}
              className="btn-space btn-space-md btn-space-sky gap-1.5 font-bold"
            >
              {stage === 0 ? 'See Potential Problem' : 'See How to Fix It'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                audioEngine.playMissionAlert();
                audioEngine.stopSpeech();
                onStartActivity();
              }}
              className="btn-space btn-space-md btn-space-amber gap-1.5 font-bold"
            >
              <Play className="w-4 h-4 fill-current" />
              Let’s Try It Now!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* 3. Step 7 Brief Result Screen After Each Solved Scenario */
const RESULT_COPY: Record<Phase4ChallengeId, { headline: string; accomplished: string; stat: string }> = {
  low_sunlight: {
    headline: 'Power Restored & Protected!',
    accomplished: 'You cut unnecessary lights and engaged Backup Battery so life-support never flickered.',
    stat: 'Battery Stabilized at 90%',
  },
  extreme_temperature: {
    headline: 'Cabin Warm & Cozy Again!',
    accomplished: 'Closing the stuck radiator louver trapped heat inside while heaters warmed the crew.',
    stat: 'Habitat Temperature: 21°C',
  },
  water_shortage: {
    headline: 'Water Reserve Flowing Clean!',
    accomplished: 'Tightening the leaky pipe and opening Moon Lab reserve restored safe hydration.',
    stat: 'Water Supply Restored',
  },
  life_support: {
    headline: 'Fresh Breathable Air Online!',
    accomplished: 'Clearing lunar dust and swapping the CO₂ filter brought oxygen back to healthy levels.',
    stat: 'CO₂ 0.4% · O₂ 20.8%',
  },
  solar_particle_event: {
    headline: 'Crew Safe From Solar Storm!',
    accomplished: 'Checking space weather early, moving astronauts inside, and sealing shutters stopped radiation.',
    stat: 'Radiation Dropped to 12 mSv',
  },
};

export const SurvivalChallengeResultModal: React.FC<{
  challengeId: Phase4ChallengeId;
  roverName: string;
  isFinal: boolean;
  onContinue: () => void;
}> = ({ challengeId, roverName, isFinal, onContinue }) => {
  const copy = RESULT_COPY[challengeId];
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100vw-2rem)] pointer-events-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.headline}
        className="rounded-3xl bg-[#071a16]/98 border-2 border-emerald-400 p-5 shadow-2xl space-y-3 animate-tip-pop"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            System Recovered!
          </span>
          <span className="font-mono-num text-xs font-bold text-emerald-200">{copy.stat}</span>
        </div>

        <h3 className="font-hero text-2xl text-white leading-tight">{copy.headline}</h3>
        <p className="text-xs sm:text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
          <strong className="text-amber-300 mr-1">{roverName}:</strong>“{copy.accomplished}”
        </p>

        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            onContinue();
          }}
          className="btn-space btn-space-md btn-space-emerald w-full gap-2 font-bold"
        >
          {isFinal ? (
            <>
              <Sun className="w-4 h-4" />
              Celebrate Mission Complete! →
            </>
          ) : (
            <>
              Prepare Next System Lesson →
            </>
          )}
        </button>
      </div>
    </div>
  );
};
