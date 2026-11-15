import React, { useState } from 'react';
import { ExternalLink, Info, Sparkles, Volume2, X } from 'lucide-react';
import { NasaMediaItem } from '../game/nasaMedia';

interface NasaReferenceCardProps {
  item: NasaMediaItem;
  compact?: boolean;
  onHearAstro?: () => void;
  onClose?: () => void;
}

export const NasaReferenceCard: React.FC<NasaReferenceCardProps> = ({
  item,
  compact = false,
  onHearAstro,
  onClose,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="rounded-2xl bg-[#071022]/96 border border-sky-400/55 overflow-hidden shadow-2xl">
      <div className="relative bg-slate-950">
        {!imgFailed ? (
          <img
            src={item.imageUrl}
            alt={`${item.title} — ${item.missionSource}`}
            onError={() => setImgFailed(true)}
            className={`w-full object-cover ${compact ? 'h-28' : 'h-40'}`}
            loading="lazy"
          />
        ) : (
          <div className={`w-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center ${compact ? 'h-28' : 'h-40'}`}>
            <Sparkles className="w-6 h-6 text-sky-400 mb-1" />
            <div className="text-xs font-bold text-slate-200">{item.title}</div>
            <div className="text-[11px] text-slate-400">{item.missionSource}</div>
          </div>
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide shadow ${
            item.dataDistinction.startsWith('Archived NASA')
              ? 'bg-sky-500/90 text-slate-950'
              : 'bg-amber-400/90 text-slate-950'
          }`}
        >
          {item.dataDistinction.startsWith('Archived NASA') ? 'REAL NASA PHOTO' : 'NASA HARDWARE REF'}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close NASA reference card"
            className="btn-space btn-space-slate btn-space-xs absolute top-2 right-2 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-base text-white leading-tight">{item.title}</h3>
            <p className="text-[11px] text-sky-300 font-semibold">{item.missionSource} · ID: {item.nasaId}</p>
          </div>
          {onHearAstro && (
            <button
              type="button"
              onClick={onHearAstro}
              aria-label={`Hear ASTRO explain ${item.title}`}
              className="btn-space btn-space-sky-soft btn-space-xs gap-1 shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Hear
            </button>
          )}
        </div>

        <p className="text-xs text-slate-100 leading-relaxed">{item.simpleExplanation}</p>

        <div className="rounded-xl bg-amber-500/12 border border-amber-400/40 px-2.5 py-2 text-[11px] text-amber-100 leading-snug">
          <strong className="text-amber-300">Cool Fact: </strong>
          {item.funFact}
        </div>

        {!compact && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/35 px-2.5 py-2 text-[11px] text-emerald-100 leading-snug">
            <strong className="text-emerald-300">In Our Mission: </strong>
            {item.missionTieIn}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            {item.dataDistinction}
          </span>
          <div className="flex items-center gap-2.5">
            <a
              href={item.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-emerald-300 hover:underline font-semibold"
            >
              {item.officialLinkLabel} <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={`https://images.nasa.gov/details/${encodeURIComponent(item.nasaId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-sky-300 hover:underline"
            >
              Image Info <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
