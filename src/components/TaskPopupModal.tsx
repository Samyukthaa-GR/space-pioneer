import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Flame,
  FlaskConical,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { NasaMediaItem } from '../game/nasaMedia';
import { NoticeTone, TaskPopupData } from '../game/types';
import { NasaReferenceCard } from './NasaReferenceCard';
import { ScienceDiagram } from './ScienceDiagrams';

interface TaskPopupModalProps {
  popup: TaskPopupData;
  roverName?: string;
  nasaItem?: NasaMediaItem | null;
  onClose: () => void;
  onReplayVoice: () => void;
}

const TONE_STYLES: Record<
  NoticeTone,
  { border: string; badgeBg: string; badgeText: string; ctaBg: string; Icon: React.FC<{ className?: string }> }
> = {
  new_task: {
    border: 'border-sky-400',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-300',
    ctaBg: 'btn-space-amber',
    Icon: Compass,
  },
  warning: {
    border: 'border-amber-400',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    ctaBg: 'btn-space-amber',
    Icon: AlertTriangle,
  },
  danger: {
    border: 'border-rose-500',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    ctaBg: 'btn-space-rose',
    Icon: Flame,
  },
  discovery: {
    border: 'border-cyan-400',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    ctaBg: 'btn-space-cyan',
    Icon: Sparkles,
  },
  complete: {
    border: 'border-emerald-400',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    ctaBg: 'btn-space-emerald',
    Icon: CheckCircle2,
  },
  science: {
    border: 'border-indigo-400',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    ctaBg: 'btn-space-indigo',
    Icon: FlaskConical,
  },
};

export const TaskPopupModal: React.FC<TaskPopupModalProps> = ({
  popup,
  roverName = 'ASTRO',
  nasaItem = null,
  onClose,
  onReplayVoice,
}) => {
  const [showMoreScience, setShowMoreScience] = useState(false);
  const style = TONE_STYLES[popup.tone];
  const Icon = style.Icon;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-popup-title"
        className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#091224] border-2 ${style.border} p-5 sm:p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${style.badgeBg} ${style.badgeText}`}
          >
            <Icon className="w-4 h-4" />
            {popup.badge}
          </span>

          <button
            type="button"
            onClick={onReplayVoice}
            className="btn-space btn-space-slate btn-space-sm gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            Hear ASTRO
          </button>
        </div>

        <h2 id="task-popup-title" className="font-hero font-bold text-2xl text-white mb-2.5 tracking-wide">
          {popup.title}
        </h2>

        {/* ASTRO Friendly Speech Bubble */}
        <div className="mb-3.5 px-4 py-3 rounded-2xl bg-sky-500/15 border border-sky-400/45 text-sm sm:text-base text-sky-50 leading-snug">
          <span className="font-display font-bold text-amber-300 mr-1.5">{roverName}:</span>
          “{popup.astroLine || popup.whatIsHappening}”
        </div>

        {nasaItem && (
          <div className="mb-3.5">
            <NasaReferenceCard item={nasaItem} compact onHearAstro={onReplayVoice} />
          </div>
        )}

        {popup.diagramKind && (
          <div className="mb-3.5">
            <ScienceDiagram kind={popup.diagramKind} />
          </div>
        )}

        {/* Quick visual action list */}
        {popup.steps.length > 0 && (
          <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-3.5 mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1.5">
              Quick Mission Checklist
            </div>
            <ul className="space-y-1.5 text-sm text-slate-100">
              {popup.steps.map((s, idx) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Short why-it-matters pill */}
        <p className="text-xs sm:text-sm text-slate-300 mb-3 px-1">
          <strong className="text-amber-300">Why? </strong>
          {popup.whyItMatters}
        </p>

        {/* Optional Deeper NASA Science Drawer (never forces reading paragraphs!) */}
        {popup.scienceCard && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowMoreScience((v) => !v)}
              className="btn-space btn-space-slate btn-space-xs gap-1.5 text-indigo-200"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              More NASA Science
              {showMoreScience ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showMoreScience && (
              <div className="mt-2 rounded-2xl bg-indigo-950/60 border border-indigo-400/50 p-3.5">
                <div className="text-xs font-bold text-indigo-200 mb-1">{popup.scienceCard.title}</div>
                <p className="text-xs text-indigo-100 leading-relaxed mb-1">{popup.scienceCard.body}</p>
                <p className="text-[10px] text-indigo-300/90">{popup.scienceCard.sourceNote}</p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className={`btn-space btn-space-lg w-full font-display font-bold text-lg ${style.ctaBg}`}
        >
          {popup.ctaLabel}
        </button>
      </div>
    </div>
  );
};
