import React, { useEffect, useState } from 'react';

interface VisualArrowGuideProps {
  targetKey: string | null;
  label?: string;
}

export const VisualArrowGuide: React.FC<VisualArrowGuideProps> = ({ targetKey, label }) => {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!targetKey) {
      setRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(`[data-guide-target="${targetKey}"]`) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        setRect(null);
        return;
      }
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };

    update();
    const id = window.setInterval(update, 250);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', update);
    };
  }, [targetKey]);

  if (!targetKey || !rect) return null;

  const centerX = Math.max(48, Math.min(window.innerWidth - 48, rect.left + rect.width / 2));
  const placeAbove = rect.top > 92;
  const arrowTop = placeAbove ? rect.top - 58 : rect.top + rect.height + 10;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" aria-hidden="true">
      {/* Pulsing ring around target control */}
      <div
        className="fixed rounded-2xl border-2 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.75)] animate-pulse"
        style={{
          left: rect.left - 4,
          top: rect.top - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />

      {/* Animated pointing directional arrow */}
      <div
        className="fixed -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ left: centerX, top: arrowTop }}
      >
        {placeAbove && label && (
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-display font-bold shadow-lg whitespace-nowrap">
            {label}
          </span>
        )}
        <svg
          width="34"
          height="34"
          viewBox="0 0 36 36"
          className={`drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] ${placeAbove ? '' : 'rotate-180'}`}
        >
          <path
            d="M18 4 L18 27 M18 27 L9 18 M18 27 L27 18"
            stroke="#fbbf24"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,-4; 0,3; 0,-4"
              dur="0.9s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
        {!placeAbove && label && (
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-display font-bold shadow-lg whitespace-nowrap">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};
