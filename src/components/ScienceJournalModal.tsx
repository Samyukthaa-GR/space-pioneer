import React from 'react';
import { BookOpen, Lock, Sparkles, X } from 'lucide-react';
import { INITIAL_SCIENCE_ENTRIES } from '../game/missionData';

interface ScienceJournalModalProps {
  unlockedIds: string[];
  onClose: () => void;
}

export const ScienceJournalModal: React.FC<ScienceJournalModalProps> = ({
  unlockedIds,
  onClose,
}) => {
  const unlockedCount = INITIAL_SCIENCE_ENTRIES.filter((e) => unlockedIds.includes(e.id)).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Explorer Science Journal"
        className="max-w-2xl w-full max-h-[86vh] flex flex-col rounded-3xl bg-[#081020] border-2 border-indigo-400/75 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-300" />
            <div>
              <h2 className="font-hero font-bold text-2xl text-white tracking-wide">
                Explorer Science Journal
              </h2>
              <p className="text-xs text-slate-300">
                {unlockedCount} of {INITIAL_SCIENCE_ENTRIES.length} lunar science discoveries unlocked
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close science journal"
            className="btn-space btn-space-slate btn-space-icon"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1">
          {INITIAL_SCIENCE_ENTRIES.map((entry) => {
            const isUnlocked = unlockedIds.includes(entry.id);
            return (
              <div
                key={entry.id}
                className={`rounded-2xl p-4 border ${
                  isUnlocked
                    ? 'bg-slate-900/95 border-indigo-400/45'
                    : 'bg-slate-900/50 border-slate-700/60 opacity-75'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                    {isUnlocked ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {entry.category}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      entry.dataOrigin === 'Archived NASA Science'
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                        : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                    }`}
                  >
                    {entry.dataOrigin}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg text-white mb-1">
                  {isUnlocked ? entry.title : 'Locked Discovery — Keep Exploring!'}
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {isUnlocked
                    ? entry.summary
                    : 'Scan new lunar rocks, investigate craters, and build outpost systems to unlock this science card.'}
                </p>
                {isUnlocked && (
                  <p className="text-[11px] text-slate-400 mt-2">
                    Source & Coverage: {entry.sourceAttribution}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
