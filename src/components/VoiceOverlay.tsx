import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { audioEngine } from '../game/audioEngine';
import { NarrationSnapshot } from '../game/narrationState';
import { AppScreen, MissionPhase } from '../game/types';

interface VoiceOverlayProps {
  screen: AppScreen;
  phase: MissionPhase;
  roverName: string;
  captionsEnabled: boolean;
  hasBlockingModal: boolean;
  onToggleMute: () => void;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
  screen,
  phase,
  roverName,
  captionsEnabled,
  hasBlockingModal,
  onToggleMute,
}) => {
  const [snap, setSnap] = useState<NarrationSnapshot>(() => audioEngine.getNarrationSnapshot());
  const [minimized, setMinimized] = useState(true);

  useEffect(() => {
    return audioEngine.subscribeNarration(setSnap);
  }, []);

  const isActive = snap.status === 'loading' || snap.status === 'playing' || snap.status === 'paused';

  // Expand cleanly while ASTRO is speaking/paused; auto-minimize shortly after finishing
  useEffect(() => {
    if (isActive) {
      setMinimized(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setMinimized(true);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [isActive, snap.sequence]);

  // Never clutter Title, Paused, or Victory screens
  if (screen === 'title' || screen === 'paused' || screen === 'victory') {
    return null;
  }

  const displayText = snap.text || snap.lastText;
  if (!displayText && !snap.autoplayBlocked && !snap.error) {
    return null;
  }

  // Responsive non-overlapping placement per screen/modal state
  const compactOnMobileModal = hasBlockingModal;
  const positionClass = hasBlockingModal
    ? 'fixed top-2.5 left-2.5 md:left-1/2 md:-translate-x-1/2 z-50'
    : screen === 'intro'
    ? 'fixed top-[8.25rem] md:top-[4.25rem] left-1/2 -translate-x-1/2 z-40'
    : phase >= 3
    ? 'fixed top-[6.25rem] md:top-[6.85rem] left-1/2 -translate-x-1/2 z-30'
    : 'fixed bottom-[13.75rem] md:bottom-auto md:top-[6.85rem] left-1/2 -translate-x-1/2 z-30';

  // Auto-minimized unobtrusive pill once narration finishes
  if (minimized && !isActive && !snap.autoplayBlocked) {
    return (
      <div data-testid="astro-voice-overlay" className={`${positionClass} pointer-events-auto`}>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#070f20]/94 border border-sky-400/40 shadow-lg text-[11px]">
          <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-display font-bold text-amber-300">{roverName}</span>
          {displayText && (
            <button
              type="button"
              onClick={() => (snap.error ? audioEngine.retrySpeech() : audioEngine.replaySpeech())}
              aria-label={snap.error ? 'Retry ASTRO voice' : 'Replay ASTRO narration'}
              className="btn-space btn-space-sky btn-space-xs inline-flex items-center gap-1 rounded-full"
            >
              <RotateCcw className="w-3 h-3" />
              {snap.error ? 'Retry' : 'Replay'}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={snap.muted ? 'Unmute ASTRO voice' : 'Mute ASTRO voice'}
            className="btn-space btn-space-slate btn-space-icon !p-1.5 rounded-full"
          >
            {snap.muted ? (
              <VolumeX className="w-3 h-3 text-amber-400" />
            ) : (
              <Volume2 className="w-3 h-3 text-sky-300" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="astro-voice-overlay"
      className={`${positionClass} ${
        compactOnMobileModal ? 'w-auto max-w-[calc(100vw-13rem)] md:w-[min(92vw,32rem)] md:max-w-none' : 'w-[min(92vw,32rem)]'
      } pointer-events-auto`}
    >
      <div className="rounded-2xl bg-[#070f20]/96 border border-sky-400/60 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xl space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-end gap-0.5 h-3.5 shrink-0" aria-hidden="true">
              <span
                className={`w-0.5 rounded-full ${
                  snap.status === 'playing' && snap.provider !== 'silent'
                    ? 'h-2.5 bg-sky-400'
                    : snap.status === 'paused'
                    ? 'h-1.5 bg-amber-400'
                    : 'h-1 bg-slate-500'
                }`}
              />
              <span
                className={`w-0.5 rounded-full ${
                  snap.status === 'playing' && snap.provider !== 'silent'
                    ? 'h-3.5 bg-emerald-400'
                    : snap.status === 'paused'
                    ? 'h-1.5 bg-amber-400'
                    : 'h-1 bg-slate-500'
                }`}
              />
              <span
                className={`w-0.5 rounded-full ${
                  snap.status === 'playing' && snap.provider !== 'silent'
                    ? 'h-2 bg-sky-300'
                    : snap.status === 'paused'
                    ? 'h-1.5 bg-amber-400'
                    : 'h-1 bg-slate-500'
                }`}
              />
            </div>

            <span className="text-[11px] font-display font-bold uppercase tracking-wider text-amber-300 shrink-0">
              {roverName}
            </span>
            <span className="text-[10px] font-semibold text-sky-300 truncate">
              {snap.muted
                ? 'Muted'
                : !snap.voiceEnabled
                ? 'Voice Off'
                : snap.error
                ? 'Captions Mode'
                : snap.status === 'loading'
                ? 'Preparing...'
                : snap.status === 'playing'
                ? 'Speaking'
                : snap.status === 'paused'
                ? 'Paused'
                : 'Ready'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {snap.autoplayBlocked && !snap.muted && (
              <button
                type="button"
                onClick={() => audioEngine.unlockUserGesture()}
                className="btn-space btn-space-amber btn-space-xs"
              >
                Enable Voice
              </button>
            )}

            {snap.error && !snap.muted && snap.voiceEnabled && (
              <button
                type="button"
                onClick={() => audioEngine.retrySpeech()}
                className="btn-space btn-space-amber btn-space-xs inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Retry Voice
              </button>
            )}

            {isActive && !snap.muted && snap.voiceEnabled && !snap.error && (
              <button
                type="button"
                onClick={() => audioEngine.toggleNarrationPause()}
                aria-label={snap.status === 'paused' ? 'Resume ASTRO narration' : 'Pause ASTRO narration'}
                className="btn-space btn-space-slate btn-space-xs inline-flex items-center gap-1"
              >
                {snap.status === 'paused' ? (
                  <>
                    <Play className="w-3 h-3 text-emerald-400" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 text-amber-300" />
                    Pause
                  </>
                )}
              </button>
            )}

            {displayText && !snap.error && (
              <button
                type="button"
                onClick={() => audioEngine.replaySpeech()}
                aria-label="Replay ASTRO narration"
                className="btn-space btn-space-sky btn-space-xs inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Replay
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={snap.muted ? 'Unmute ASTRO voice' : 'Mute ASTRO voice'}
              className="btn-space btn-space-slate btn-space-icon !p-1.5"
            >
              {snap.muted ? (
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              )}
            </button>
          </div>
        </div>

        {snap.error && !snap.muted && snap.voiceEnabled && (
          <p className="text-[11px] font-semibold text-amber-300 leading-tight">
            {snap.error}
          </p>
        )}

        {captionsEnabled && displayText && (
          <p
            className={`${
              compactOnMobileModal ? 'hidden md:line-clamp-2' : 'line-clamp-2'
            } text-xs sm:text-[13px] text-slate-100 leading-snug`}
          >
            “{displayText}”
          </p>
        )}
      </div>
    </div>
  );
};
