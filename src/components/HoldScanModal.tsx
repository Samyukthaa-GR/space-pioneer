import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ScanLine, Sparkles, X } from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { getNasaMediaForTargetKind } from '../game/nasaMedia';
import { RockTarget } from '../game/types';
import { NasaReferenceCard } from './NasaReferenceCard';

interface HoldScanModalProps {
  target: RockTarget;
  roverName: string;
  onComplete: (target: RockTarget) => void;
  onCancel: () => void;
}

export const HoldScanModal: React.FC<HoldScanModalProps> = ({
  target,
  roverName,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const progressRef = useRef(0);
  const completedRef = useRef(false);
  const nasaItem = getNasaMediaForTargetKind(target.kind);

  const stopHold = useCallback(() => {
    setIsHolding(false);
    audioEngine.stopScanSound();
  }, []);

  const startHold = useCallback(() => {
    if (completedRef.current) return;
    setIsHolding(true);
    audioEngine.startScanSound();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !completedRef.current) {
        e.preventDefault();
        startHold();
      } else if (e.code === 'Escape') {
        stopHold();
        onCancel();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        stopHold();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      audioEngine.stopScanSound();
    };
  }, [onCancel, startHold, stopHold]);

  useEffect(() => {
    if (scanDone) return;
    let rafId = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (completedRef.current) return;
      const prev = progressRef.current;
      const next = isHolding ? Math.min(100, prev + dt * 72) : Math.max(0, prev - dt * 28);
      progressRef.current = next;
      setProgress(next);

      if (next >= 100 && !completedRef.current) {
        completedRef.current = true;
        audioEngine.stopScanSound();
        audioEngine.playDiscovery();
        setIsHolding(false);
        setScanDone(true);
        return;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isHolding, scanDone]);

  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Laser Scan ${target.name}`}
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#091224] border-2 border-cyan-400 p-5 sm:p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <ScanLine className="w-3.5 h-3.5" />
            Laser Spectrometer · {target.shortLabel}
          </span>
          <button
            type="button"
            onClick={() => {
              stopHold();
              onCancel();
            }}
            aria-label="Close scanner"
            className="btn-space btn-space-slate btn-space-icon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!scanDone ? (
          <>
            <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Scan {target.name}</h2>
            <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
              <strong className="text-amber-300 mr-1">{roverName}:</strong>
              “Press and hold my laser scanner until the ring reaches 100% so I can read its minerals!”
            </p>

            {/* Animated Laser Scan Ring + Beam Graphic */}
            <div className="rounded-2xl bg-[#040914] border border-cyan-500/40 p-4 flex flex-col sm:flex-row items-center gap-4">
              <svg viewBox="0 0 96 96" className="w-24 h-24 shrink-0">
                <circle cx="48" cy="48" r="36" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  fill="none"
                  stroke={isHolding ? '#22d3ee' : '#38bdf8'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 48 48)"
                />
                <text x="48" y="53" textAnchor="middle" fill="#e0f2fe" fontSize="16" fontWeight="800">
                  {Math.round(progress)}%
                </text>
              </svg>

              <div className="flex-1 w-full space-y-2">
                <svg viewBox="0 0 210 72" className="w-full h-18 rounded-xl bg-slate-950 border border-slate-800">
                  <rect x="16" y="24" width="38" height="22" rx="5" fill="#e2e8f0" />
                  <circle cx="25" cy="48" r="6" fill="#334155" />
                  <circle cx="45" cy="48" r="6" fill="#334155" />
                  {isHolding && (
                    <polygon points="54,28 148,14 148,54" fill="#22d3ee" fillOpacity="0.34" />
                  )}
                  <line
                    x1="54"
                    y1="28"
                    x2="150"
                    y2={isHolding ? 20 + ((progress * 2.5) % 28) : 34}
                    stroke={isHolding ? '#22d3ee' : '#475569'}
                    strokeWidth="2.5"
                  />
                  <polygon points="145,54 156,22 178,24 190,54" fill="#94a3b8" />
                </svg>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-[width] duration-75"
                    style={{ width: `${Math.round(progress)}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                startHold();
              }}
              onPointerUp={stopHold}
              onPointerCancel={stopHold}
              onPointerLeave={stopHold}
              className={`btn-space btn-space-lg w-full font-display font-bold text-lg select-none ${
                isHolding
                  ? 'btn-space-cyan ring-4 ring-cyan-400/50'
                  : 'btn-space-amber'
              }`}
            >
              {isHolding
                ? `SCANNING... ${Math.round(progress)}% (KEEP HOLDING)`
                : progress > 4
                ? `PAUSED AT ${Math.round(progress)}% — PRESS & HOLD TO FINISH`
                : 'PRESS & HOLD TO SCAN (OR HOLD SPACE)'}
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-300 font-hero font-bold text-lg tracking-wide">
              <Sparkles className="w-5 h-5" />
              Scan Complete: {target.scienceTitle}
            </div>
            <p className="text-sm text-sky-100 bg-emerald-500/12 border border-emerald-400/45 rounded-2xl px-3.5 py-2.5">
              <strong className="text-amber-300 mr-1">{roverName}:</strong>
              “{target.astroReaction}”
            </p>
            <NasaReferenceCard
              item={nasaItem}
              compact
              onHearAstro={() => audioEngine.speak(`${nasaItem.title}. ${nasaItem.simpleExplanation}`, 'excited')}
            />
            <button
              type="button"
              onClick={() => onComplete(target)}
              className="btn-space btn-space-emerald btn-space-lg w-full gap-2 font-display font-bold text-base"
            >
              <CheckCircle2 className="w-5 h-5" />
              Save Discovery (+{target.resourceReward?.sciencePoints ?? 15} Science)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
