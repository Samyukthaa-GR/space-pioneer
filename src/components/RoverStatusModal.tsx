import React, { useState } from 'react';
import { AlertTriangle, BatteryCharging, CheckCircle2, Sparkles, Wrench, X } from 'lucide-react';
import { GameState } from '../game/types';

interface RoverStatusModalProps {
  state: GameState;
  onRepairDust: () => void;
  onRechargeBattery: () => void;
  onRepairWheels: () => void;
  onClose: () => void;
}

export const RoverStatusModal: React.FC<RoverStatusModalProps> = ({
  state,
  onRepairDust,
  onRechargeBattery,
  onRepairWheels,
  onClose,
}) => {
  const [animatingFix, setAnimatingFix] = useState<'dust' | 'battery' | 'wheels' | null>(null);
  const dust = Math.round(state.rover.dustLevel);
  const battery = Math.round(state.rover.battery);
  const health = Math.round(state.rover.health);
  const issue = state.rover.lastIssue;

  const activeIssue =
    issue ??
    (dust >= 22
      ? {
          id: 'dust_buildup',
          component: 'Navigation Camera & Solar Deck' as const,
          causeTitle: 'Fine Moon Dust Settled on Sensors',
          whyItHappened:
            'Driving across powdery lunar regolith kicked sharp dust grains onto ASTRO’s camera lens and solar deck.',
          consequenceIfIgnored:
            'Camera views look hazy in Rover-Cam, and solar panels recharge up to 35% slower!',
          severity: dust >= 55 ? ('urgent' as const) : ('warn' as const),
        }
      : battery < 65
      ? {
          id: 'low_battery',
          component: 'Battery Power Cell' as const,
          causeTitle: 'Battery Drained From Heavy Driving & Tools',
          whyItHappened:
            'Climbing steep crater rims and running drills uses steady electric power from ASTRO’s core pack.',
          consequenceIfIgnored:
            'Auto-pilot routes stop if power drops too low to finish safely!',
          severity: battery < 30 ? ('urgent' as const) : ('warn' as const),
        }
      : health < 95
      ? {
          id: 'wheel_knock',
          component: 'Rocker-Bogie Wheels' as const,
          causeTitle: 'Boulder Bump Tested Wheel Alignment',
          whyItHappened:
            'Tapping a sharp lunar boulder jarred the front suspension strut.',
          consequenceIfIgnored:
            'More bumps can slow rover steering and damage scientific instruments!',
          severity: 'warn' as const,
        }
      : null);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rover Maintenance and Status Dashboard"
        className="max-w-lg w-full rounded-3xl bg-[#081020] border-2 border-amber-400/80 p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-hero font-bold text-xl text-white tracking-wide">
                {state.roverName} Systems & Maintenance
              </h2>
              <p className="text-xs text-slate-300">
                Rover Repair Kits Available:{' '}
                <strong className="text-amber-300 font-mono-num">{state.rover.repairKits}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rover maintenance"
            className="btn-space btn-space-slate btn-space-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Telemetry Cards */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-[11px] text-slate-400 font-semibold">Energy</div>
            <div className={`font-mono-num font-bold text-lg ${battery < 35 ? 'text-rose-400' : 'text-emerald-300'}`}>
              {battery}%
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-[11px] text-slate-400 font-semibold">Camera Clarity</div>
            <div className={`font-mono-num font-bold text-lg ${dust > 30 ? 'text-amber-300' : 'text-sky-300'}`}>
              {Math.max(15, 100 - dust)}%
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-700 p-2.5">
            <div className="text-[11px] text-slate-400 font-semibold">Wheels & Frame</div>
            <div className={`font-mono-num font-bold text-lg ${health < 85 ? 'text-amber-300' : 'text-emerald-300'}`}>
              {health}%
            </div>
          </div>
        </div>

        {/* Cause-and-Effect Diagnostic Panel */}
        {activeIssue ? (
          <div className="rounded-2xl bg-amber-500/12 border border-amber-400/55 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              Affected Part: {activeIssue.component}
            </div>
            <div className="font-display font-bold text-base text-white">{activeIssue.causeTitle}</div>
            <p className="text-xs text-slate-200 leading-relaxed">
              <strong className="text-sky-300">Why this happened: </strong>
              {activeIssue.whyItHappened}
            </p>
            <p className="text-xs text-rose-200 leading-relaxed">
              <strong className="text-rose-300">If ignored: </strong>
              {activeIssue.consequenceIfIgnored}
            </p>

            {/* Quick Animated Fix Preview */}
            <svg viewBox="0 0 280 58" className="w-full h-14 rounded-xl bg-slate-950 border border-slate-700">
              <rect x="24" y="18" width="54" height="24" rx="5" fill="#e2e8f0" />
              <rect x="34" y="22" width="32" height="10" rx="2" fill="#eab308" />
              <circle cx="36" cy="44" r="6" fill="#334155" />
              <circle cx="64" cy="44" r="6" fill="#334155" />
              <path
                d="M 105 28 L 175 28"
                stroke={animatingFix ? '#34d399' : '#fbbf24'}
                strokeWidth="3"
                strokeDasharray="6 4"
              >
                <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.9s" repeatCount="indefinite" />
              </path>
              <rect x="184" y="14" width="76" height="28" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="222" y="32" textAnchor="middle" fill="#bae6fd" fontSize="9.5" fontWeight="700">
                {animatingFix === 'dust'
                  ? 'Wiping Dust...'
                  : animatingFix === 'battery'
                  ? 'Solar Charging...'
                  : animatingFix === 'wheels'
                  ? 'Aligning Struts...'
                  : 'Use Repair Kit'}
              </text>
            </svg>
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/50 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-100 leading-relaxed">
              <strong className="text-emerald-300 block text-sm mb-0.5">All Rover Systems Healthy!</strong>
              Wheels, stereo cameras, robotic arm, and solar cells are running cleanly with zero dust buildup.
            </div>
          </div>
        )}

        {/* Purpose-Driven Repair Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            disabled={dust < 5}
            onClick={() => {
              setAnimatingFix('dust');
              window.setTimeout(() => {
                setAnimatingFix(null);
                onRepairDust();
              }, 350);
            }}
            className={`btn-space btn-space-md flex-col gap-1 py-2.5 px-3 text-xs ${
              dust >= 5 ? 'btn-space-sky' : 'btn-space-slate'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Wipe Dust (1 Kit)
          </button>

          <button
            type="button"
            disabled={battery >= 98}
            onClick={() => {
              setAnimatingFix('battery');
              window.setTimeout(() => {
                setAnimatingFix(null);
                onRechargeBattery();
              }, 350);
            }}
            className={`btn-space btn-space-md flex-col gap-1 py-2.5 px-3 text-xs ${
              battery < 98 ? 'btn-space-emerald' : 'btn-space-slate'
            }`}
          >
            <BatteryCharging className="w-4 h-4" />
            Solar Top-Up
          </button>

          <button
            type="button"
            disabled={health >= 99}
            onClick={() => {
              setAnimatingFix('wheels');
              window.setTimeout(() => {
                setAnimatingFix(null);
                onRepairWheels();
              }, 350);
            }}
            className={`btn-space btn-space-md flex-col gap-1 py-2.5 px-3 text-xs ${
              health < 99 ? 'btn-space-amber' : 'btn-space-slate'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Check Wheels (1 Kit)
          </button>
        </div>
      </div>
    </div>
  );
};
