import React, { useState } from 'react';
import { Award, CheckCircle2, Circle, HelpCircle, RotateCcw, SkipForward } from 'lucide-react';
import { TUTORIAL_STEPS } from '../game/missionData';
import { TutorialProgress } from '../game/types';

interface TutorialOverlayProps {
  roverName: string;
  tutorial: TutorialProgress;
  nearTutorialRock?: boolean;
  onAdvanceStep: () => void;
  onSkipTutorial: () => void;
  onCompleteTutorial: () => void;
  onHighlightAction: (stepId: TutorialProgress['step'], hintLevel: number) => void;
  onRepeatStep: (stepId: TutorialProgress['step']) => void;
}

const TutorialDemoMiniSvg: React.FC<{ step: TutorialProgress['step'] }> = ({ step }) => {
  if (step === 'look_around') {
    return (
      <svg viewBox="0 0 240 62" className="w-full h-14 rounded-xl bg-slate-950 border border-sky-400/40">
        <circle cx="120" cy="31" r="11" fill="#334155" />
        <path d="M 80 24 C 100 8, 140 8, 160 24" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeDasharray="4 3" />
        <circle cx="80" cy="24" r="5" fill="#fbbf24">
          <animateMotion dur="2s" repeatCount="indefinite" path="M 0 0 C 20 -16, 60 -16, 80 0" />
        </circle>
        <text x="120" y="56" textAnchor="middle" fill="#93c5fd" fontSize="8.5" fontWeight="700">Drag ground · Tap + · Tap Top View</text>
      </svg>
    );
  }
  if (step === 'move_rover') {
    return (
      <svg viewBox="0 0 240 62" className="w-full h-14 rounded-xl bg-slate-950 border border-sky-400/40">
        <rect x="28" y="20" width="38" height="18" rx="4" fill="#e2e8f0">
          <animate attributeName="x" values="28;168;28" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect x="92" y="42" width="56" height="16" rx="4" fill="#0ea5e9" />
        <text x="120" y="53" textAnchor="middle" fill="#082f49" fontSize="9" fontWeight="800">Hold ▲ or W</text>
      </svg>
    );
  }
  if (step === 'learn_map') {
    return (
      <svg viewBox="0 0 240 62" className="w-full h-14 rounded-xl bg-slate-950 border border-sky-400/40">
        <rect x="168" y="8" width="58" height="22" rx="6" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="2" />
        <text x="197" y="22" textAnchor="middle" fill="#082f49" fontSize="9.5" fontWeight="800">MAP</text>
        <circle cx="150" cy="40" r="5" fill="#fbbf24">
          <animate attributeName="cx" values="130;186;130" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="cy" values="46;20;46" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <text x="86" y="34" textAnchor="middle" fill="#cbd5e1" fontSize="9">Tap top-right Map!</text>
      </svg>
    );
  }
  if (step === 'draw_route') {
    return (
      <svg viewBox="0 0 240 62" className="w-full h-14 rounded-xl bg-slate-950 border border-sky-400/40">
        <circle cx="44" cy="36" r="8" fill="#38bdf8" />
        <path d="M 48 36 Q 110 14, 176 34" stroke="#34d399" strokeWidth="3.5" fill="none" strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
        </path>
        <circle cx="176" cy="34" r="6" fill="#34d399" />
        <text x="120" y="56" textAnchor="middle" fill="#6ee7b7" fontSize="8.5" fontWeight="700">1. DRAW PATH · 2. Drag line · 3. START</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 62" className="w-full h-14 rounded-xl bg-slate-950 border border-sky-400/40">
      <rect x="52" y="22" width="32" height="16" rx="4" fill="#e2e8f0" />
      <polygon points="84,26 146,18 146,42" fill="#38bdf8" fillOpacity="0.35">
        <animate attributeName="fill-opacity" values="0.15;0.45;0.15" dur="1.1s" repeatCount="indefinite" />
      </polygon>
      <circle cx="156" cy="30" r="10" fill="#34d399" />
      <text x="120" y="55" textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="700">Roll near green ring → Tap SCAN OBJECT</text>
    </svg>
  );
};

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  roverName,
  tutorial,
  nearTutorialRock = false,
  onAdvanceStep,
  onSkipTutorial,
  onCompleteTutorial,
  onHighlightAction,
  onRepeatStep,
}) => {
  const [hintLevel, setHintLevel] = useState(0);
  const [lastStep, setLastStep] = useState(tutorial.step);

  if (lastStep !== tutorial.step) {
    setLastStep(tutorial.step);
    setHintLevel(0);
  }

  const stepData = TUTORIAL_STEPS[tutorial.step];

  const getChecklistChecks = (): boolean[] => {
    switch (tutorial.step) {
      case 'look_around':
        return [tutorial.rotatedCamera, tutorial.zoomedCamera, tutorial.switchedCameraView];
      case 'move_rover':
        return [tutorial.movedRover];
      case 'learn_map':
        return [tutorial.openedMap, tutorial.inspectedMapTarget];
      case 'draw_route':
        return [tutorial.activatedDrawMode, tutorial.drewRoute, tutorial.startedRoute];
      case 'scan_rock':
        return [nearTutorialRock || tutorial.scannedRock, tutorial.scannedRock];
      case 'complete':
        return [true, true, true, true];
    }
  };

  const checks = getChecklistChecks();
  const isStepSatisfied = checks.every(Boolean);

  if (tutorial.step === 'complete') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/55">
        <div className="max-w-lg w-full rounded-3xl bg-[#0a1326] border-2 border-emerald-400 p-7 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
              <Award className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                First Achievement Unlocked!
              </span>
              <h2 className="font-hero font-bold text-2xl text-white tracking-wide">
                {stepData.title}
              </h2>
            </div>
          </div>

          <p className="text-slate-200 text-base mb-4">
            You and <span className="text-amber-300 font-bold">{roverName}</span> earned the{' '}
            <span className="text-emerald-300 font-bold">Junior Moon Pioneer</span> badge!
          </p>

          <div className="space-y-2 mb-6 bg-slate-900/80 rounded-2xl p-4 border border-slate-700">
            {stepData.actionChecklist.map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onCompleteTutorial}
            className="btn-space btn-space-amber btn-space-lg w-full font-display font-bold text-lg"
          >
            Begin Phase 1: EXPLORE
          </button>
        </div>
      </div>
    );
  }

  const activeHintText =
    hintLevel > 0 ? stepData.progressiveHints[Math.min(2, hintLevel - 1)] : null;

  return (
    <div className="fixed top-14 sm:top-16 left-3 sm:left-4 z-20 max-w-[calc(100vw-1.5rem)] sm:max-w-sm w-full pointer-events-auto">
      <div className="rounded-2xl bg-[#091224]/95 border-2 border-sky-400/75 p-3.5 sm:p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
            Rover Academy · Step {stepData.stepNumber} of 5
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setHintLevel(0);
                onRepeatStep(tutorial.step);
              }}
              title="Repeat this step"
              className="btn-space btn-space-sky-soft btn-space-xs gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Repeat
            </button>
            <button
              type="button"
              onClick={onSkipTutorial}
              className="btn-space btn-space-slate btn-space-xs gap-1"
            >
              Skip
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        <h2 className="font-hero font-bold text-lg text-white mb-1.5 tracking-wide">{stepData.title}</h2>

        {/* ASTRO Speech Bubble */}
        <div className="mb-2.5 px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-400/40 text-xs text-sky-100 leading-snug">
          <strong className="text-amber-300 mr-1">{roverName}:</strong>
          “{stepData.astroBubble}”
        </div>

        <div className="space-y-1.5 mb-2.5">
          {stepData.actionChecklist.map((item, idx) => {
            const done = checks[idx] ?? false;
            return (
              <div
                key={item}
                className={`flex items-start gap-2 text-xs font-medium px-2.5 py-2 rounded-xl border ${
                  done
                    ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                    : 'bg-slate-900/90 border-slate-700 text-slate-200'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                )}
                <span>{item}</span>
              </div>
            );
          })}
        </div>

        {/* Progressive Hint + Animated Demo when "Need Help?" is tapped */}
        {activeHintText && (
          <div className="mb-2.5 space-y-2 p-2.5 rounded-xl bg-amber-500/12 border border-amber-400/50">
            <div className="text-xs text-amber-100 leading-snug">
              <span className="font-bold text-amber-300 mr-1">Hint {hintLevel}/3:</span>
              {activeHintText}
            </div>
            <TutorialDemoMiniSvg step={tutorial.step} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isStepSatisfied && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 rounded-xl px-3 py-2">
                {stepData.confirmMessage}
              </div>
              <button
                type="button"
                onClick={onAdvanceStep}
                className="btn-space btn-space-emerald btn-space-md w-full font-display font-bold text-sm"
              >
                Next Lesson
              </button>
            </div>
          )}

          {/* Persistent Need Help? button */}
          <button
            type="button"
            onClick={() => {
              const nextLvl = hintLevel >= 3 ? 1 : hintLevel + 1;
              setHintLevel(nextLvl);
              onHighlightAction(tutorial.step, nextLvl);
            }}
            className="btn-space btn-space-amber-soft btn-space-sm w-full gap-1.5 font-bold"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
            {hintLevel === 0 ? 'Need Help?' : `Need Help? (More Hint ${hintLevel}/3)`}
          </button>
        </div>
      </div>
    </div>
  );
};
