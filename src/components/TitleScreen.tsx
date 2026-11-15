import React, { useEffect } from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  hasSavedGame: boolean;
  savedPhase?: number;
  savedRoverName?: string;
  muted: boolean;
  onStartNew: () => void;
  onResumeSaved: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedGame,
  savedPhase,
  savedRoverName,
  muted,
  onStartNew,
  onResumeSaved,
  onToggleMute,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSavedGame) onResumeSaved();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSavedGame, onResumeSaved, onStartNew]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none">
      {/* Top bar: only mute utility */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          className="pointer-events-auto btn-space btn-space-slate btn-space-sm gap-2 px-3.5 py-2"
        >
          {muted ? <VolumeX className="w-5 h-5 text-amber-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
          <span className="text-sm">{muted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Asymmetric left-aligned title lockup over calm dark space negative space */}
      <div className="max-w-xl my-auto bg-[#070d1b]/88 border border-sky-400/35 rounded-3xl p-7 md:p-9 shadow-2xl pointer-events-auto">
        <svg
          viewBox="0 0 430 114"
          className="w-full max-w-[400px] h-auto mb-3"
          role="img"
          aria-label="Space Pioneers: Mission Beyond Earth"
        >
          {/* Crescent Moon & Orbit Crest */}
          <circle cx="44" cy="54" r="32" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="44" cy="54" r="23" fill="#e2e8f0" />
          <circle cx="53" cy="48" r="19" fill="#0f172a" />
          <circle cx="29" cy="48" r="3" fill="#94a3b8" />
          <circle cx="35" cy="64" r="4" fill="#94a3b8" />
          <ellipse
            cx="44"
            cy="56"
            rx="40"
            ry="13"
            transform="rotate(-18 44 56)"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
          />
          <circle cx="79" cy="44" r="4.5" fill="#fbbf24" />
          {/* Rounded Chunky Space-Game Title Typography */}
          <text
            x="96"
            y="50"
            fill="#f8fafc"
            fontFamily="'Lilita One', 'Fredoka', sans-serif"
            fontSize="32"
            fontWeight="400"
            letterSpacing="1"
          >
            SPACE PIONEERS
          </text>
          <text
            x="98"
            y="77"
            fill="#7dd3fc"
            fontFamily="'Fredoka', 'Nunito', sans-serif"
            fontSize="16"
            fontWeight="700"
            letterSpacing="2.2"
          >
            MISSION BEYOND EARTH
          </text>
          <line x1="98" y1="90" x2="380" y2="90" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
        </svg>

        <p className="text-slate-200 text-base md:text-lg leading-relaxed mb-6 font-medium">
          Team up with your robotic rover buddy to explore the Moon’s South Pole, draw safe driving paths, collect lunar resources, and protect an astronaut outpost.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {hasSavedGame ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onResumeSaved}
                className="btn-space btn-space-emerald btn-space-lg gap-2.5 shadow-xl"
              >
                <Play className="w-5 h-5 fill-current" />
                Resume Mission (Phase {savedPhase ?? 1} · {savedRoverName ?? 'ASTRO'})
              </button>
              <button
                type="button"
                onClick={onStartNew}
                className="btn-space btn-space-slate btn-space-md gap-2 py-3.5 px-5 text-base"
              >
                <RotateCcw className="w-4 h-4" />
                Start Fresh Adventure
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onStartNew}
              className="btn-space btn-space-amber btn-space-lg gap-3 px-8 py-4 text-xl shadow-xl"
            >
              <Play className="w-6 h-6 fill-current" />
              Start Mission
            </button>
          )}
        </div>
      </div>

      {/* Single flat control hint line */}
      <div className="text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#070d1b]/80 text-slate-300 text-xs md:text-sm tracking-wide">
          WASD / Arrows Drive · Drag to Draw Rover Route · Mouse Orbit & Zoom · Enter Start · Esc Pause
        </span>
      </div>
    </div>
  );
};
