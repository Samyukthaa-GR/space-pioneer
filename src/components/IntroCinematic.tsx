import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Captions,
  Compass,
  Cpu,
  Hammer,
  Package,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { INTRO_SCENES, ROVER_NAME_SUGGESTIONS } from '../game/missionData';
import { MOON_TOUR_TOPICS, ROVER_PARTS, getNasaMediaById } from '../game/nasaMedia';
import { NasaReferenceCard } from './NasaReferenceCard';

interface IntroCinematicProps {
  sceneIndex: number;
  tourTopicIndex: number;
  roverPartIndex: number;
  roverName: string;
  muted: boolean;
  captionsEnabled: boolean;
  narrationDone: boolean;
  onChangeScene: (idx: number) => void;
  onChangeTourTopic: (idx: number) => void;
  onChangeRoverPart: (idx: number) => void;
  onNameRover: (name: string) => void;
  onFinishIntro: () => void;
  onSkipIntro: () => void;
  onRestartIntro: () => void;
  onToggleMute: () => void;
  onToggleCaptions: () => void;
  onReplayVoice: (customText?: string) => void;
}

export const IntroCinematic: React.FC<IntroCinematicProps> = ({
  sceneIndex,
  tourTopicIndex,
  roverPartIndex,
  roverName,
  muted,
  captionsEnabled,
  narrationDone,
  onChangeScene,
  onChangeTourTopic,
  onChangeRoverPart,
  onNameRover,
  onFinishIntro,
  onSkipIntro,
  onRestartIntro,
  onToggleMute,
  onToggleCaptions,
  onReplayVoice,
}) => {
  const [nameInput, setNameInput] = useState(roverName);
  const [namedConfirmed, setNamedConfirmed] = useState(false);

  const scene = INTRO_SCENES[sceneIndex] ?? INTRO_SCENES[0];
  const activeTopic = MOON_TOUR_TOPICS[tourTopicIndex] ?? MOON_TOUR_TOPICS[0];
  const activePart = ROVER_PARTS[roverPartIndex] ?? ROVER_PARTS[0];
  const partNasaRef = getNasaMediaById(activePart.nasaRefId);

  // Auto-advance ONLY non-interactive story scenes (0, 1, 3) AFTER narration finishes cleanly
  useEffect(() => {
    if (!narrationDone) return;
    if (sceneIndex === 2 || sceneIndex >= 4) return;
    const timer = window.setTimeout(() => {
      onChangeScene(sceneIndex + 1);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [narrationDone, sceneIndex, onChangeScene]);

  const handleConfirmName = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleaned = nameInput.trim().slice(0, 16) || 'ASTRO';
    onNameRover(cleaned);
    setNamedConfirmed(true);
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6 pointer-events-none">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#070d1b]/92 border border-sky-400/40">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
            {scene.label}
          </span>
          <div className="flex items-center gap-1.5 ml-1">
            {INTRO_SCENES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Jump to ${s.label}`}
                onClick={() => onChangeScene(s.id)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  s.id === sceneIndex ? 'w-7 bg-amber-400' : 'w-2.5 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onRestartIntro();
            }}
            aria-label="Replay introduction"
            className="btn-space btn-space-slate btn-space-sm gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Replay
          </button>

          <button
            type="button"
            onClick={onToggleCaptions}
            aria-label={captionsEnabled ? 'Hide captions' : 'Show captions'}
            className={`btn-space btn-space-sm gap-1.5 ${
              captionsEnabled ? 'btn-space-sky-soft' : 'btn-space-slate'
            }`}
          >
            <Captions className="w-4 h-4" />
            Captions
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="btn-space btn-space-slate btn-space-sm gap-1.5"
          >
            {muted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            {muted ? 'Muted' : 'Audio'}
          </button>

          <button
            type="button"
            onClick={onSkipIntro}
            className="btn-space btn-space-slate btn-space-sm gap-1.5 px-3.5"
          >
            Skip Intro
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SCENE 2: Interactive 12-Topic Moon & Mission Tour + NASA Side Panel */}
      {sceneIndex === 2 && (
        <div className="my-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pointer-events-none">
          {/* Interactive Topic Picker Pill Strip */}
          <div className="pointer-events-auto max-w-xs w-full rounded-2xl bg-[#071022]/92 border border-sky-400/50 p-3.5 shadow-2xl space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
              Moon & Outpost Tour ({tourTopicIndex + 1}/12)
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-[42vh] overflow-y-auto pr-1">
              {MOON_TOUR_TOPICS.map((topic, idx) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onChangeTourTopic(idx)}
                  className={`btn-space btn-space-xs !justify-start text-left px-2.5 py-1.5 ${
                    idx === tourTopicIndex ? 'btn-space-amber' : 'btn-space-slate'
                  }`}
                >
                  {topic.title}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => onChangeTourTopic((tourTopicIndex - 1 + MOON_TOUR_TOPICS.length) % MOON_TOUR_TOPICS.length)}
                className="btn-space btn-space-slate btn-space-xs gap-1 px-2.5 py-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tourTopicIndex < MOON_TOUR_TOPICS.length - 1) {
                    onChangeTourTopic(tourTopicIndex + 1);
                  } else {
                    onChangeScene(3);
                  }
                }}
                className="btn-space btn-space-sky btn-space-xs gap-1 px-3 py-1.5"
              >
                {tourTopicIndex < MOON_TOUR_TOPICS.length - 1 ? 'Next Object' : 'Mission Plan'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Side NASA Reference Card beside 3D Moon Terrain */}
          <div className="pointer-events-auto max-w-sm w-full ml-auto">
            <NasaReferenceCard
              item={activeTopic}
              onHearAstro={() => onReplayVoice(`${activeTopic.title}. ${activeTopic.simpleExplanation} Fun fact: ${activeTopic.funFact}`)}
            />
          </div>
        </div>
      )}

      {/* SCENE 3: Four Mission Stages Overview */}
      {sceneIndex === 3 && (
        <div className="my-auto mx-auto max-w-4xl w-full grid grid-cols-2 md:grid-cols-4 gap-3 pointer-events-auto">
          {[
            { num: '1', title: 'EXPLORE', desc: 'Scout ridges & dark craters.', icon: Compass, color: 'border-sky-400 text-sky-300' },
            { num: '2', title: 'COLLECT', desc: 'Scoop, drill & process!', icon: Package, color: 'border-amber-400 text-amber-300' },
            { num: '3', title: 'BUILD', desc: 'Place & connect your base.', icon: Hammer, color: 'border-emerald-400 text-emerald-300' },
            { num: '4', title: 'SURVIVE', desc: 'Protect astronauts!', icon: ShieldCheck, color: 'border-rose-400 text-rose-300' },
          ].map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.num}
                className={`rounded-2xl bg-[#091122]/92 border-2 ${stage.color} p-4 shadow-xl`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-6 h-6" />
                  <span className="font-display font-bold text-lg">
                    {stage.num}. {stage.title}
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-snug">{stage.desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* SCENE 4: Dedicated Rover Intro & Interactive 7-Part Breakdown */}
      {sceneIndex === 4 && (
        <div className="my-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pointer-events-none">
          <div className="pointer-events-auto max-w-md w-full rounded-3xl bg-[#081020]/94 border-2 border-amber-400/70 p-4 sm:p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4" />
              Rover Hardware Briefing · 7 Parts
            </div>
            <h2 className="font-display font-bold text-xl text-white">
              Why Robots Explore Before Astronauts
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Robotic rovers scout dangerous cliffs, freezing dark craters, and radiation zones first—testing water ice and soil so human crews arrive safely!
            </p>

            {/* 7 Clickable Rover Parts */}
            <div className="flex flex-wrap gap-1.5">
              {ROVER_PARTS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChangeRoverPart(idx)}
                  className={`btn-space btn-space-xs ${
                    idx === roverPartIndex ? 'btn-space-amber' : 'btn-space-slate'
                  }`}
                >
                  {idx + 1}. {p.id === 'arm' ? 'Robotic Arm' : p.id.charAt(0).toUpperCase() + p.id.slice(1)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-900/95 border border-sky-400/50 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display font-bold text-base text-amber-300">
                  {activePart.name}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                  {activePart.shortRole}
                </span>
              </div>
              <p className="text-xs text-slate-100 leading-relaxed">{activePart.simpleExplanation}</p>
              <p className="text-[11px] text-amber-200">
                <strong>Cool Fact: </strong>
                {activePart.funFact}
              </p>
            </div>
          </div>

          <div className="pointer-events-auto max-w-sm w-full ml-auto">
            <NasaReferenceCard
              item={partNasaRef}
              compact
              onHearAstro={() => onReplayVoice(`${activePart.name}. ${activePart.simpleExplanation}`)}
            />
          </div>
        </div>
      )}

      {/* SCENE 5: Rover Naming Card */}
      {sceneIndex === 5 && (
        <div className="my-auto ml-auto max-w-md w-full rounded-3xl bg-[#081020]/94 border-2 border-sky-400/70 p-6 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2 text-sky-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Your Rover Companion
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">
            Name Your Rover Buddy!
          </h2>
          <p className="text-slate-200 text-sm mb-4">
            “Hi, Commander! I’m ASTRO, your Moon buddy! Keep my name or give me a fun nickname below!”
          </p>

          <form onSubmit={handleConfirmName} className="space-y-3">
            <div>
              <label htmlFor="rover-name-input" className="block text-xs font-semibold text-slate-300 mb-1">
                Rover Name
              </label>
              <div className="flex gap-2">
                <input
                  id="rover-name-input"
                  type="text"
                  maxLength={16}
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setNamedConfirmed(false);
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-white font-semibold focus:outline-none focus:border-sky-400"
                  placeholder="Enter a name..."
                />
                <button
                  type="submit"
                  className="btn-space btn-space-sky btn-space-md"
                >
                  Say Hi!
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ROVER_NAME_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setNameInput(s);
                    onNameRover(s);
                    setNamedConfirmed(true);
                  }}
                  className="btn-space btn-space-slate btn-space-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </form>

          {namedConfirmed && (
            <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-sm font-medium">
              Beep-boop! “{nameInput.trim() || 'ASTRO'}” did a happy hop! Ready for Rover Academy!
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              const cleaned = nameInput.trim().slice(0, 16) || 'ASTRO';
              onNameRover(cleaned);
              onFinishIntro();
            }}
            className="mt-4 w-full btn-space btn-space-amber btn-space-lg gap-2"
          >
            Start Interactive Tutorial
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Compact Bottom Scene Title & Next Scene Bar (ASTRO VoiceOverlay handles narration captions & controls) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="px-3.5 py-2 rounded-xl bg-[#070d1b]/90 border border-slate-700/80 shadow-lg">
          <h1 className="font-hero text-base sm:text-lg text-amber-300 leading-tight">
            {scene.headline}
          </h1>
          {scene.subDetail && (
            <p className="text-slate-300 text-[11px] sm:text-xs leading-snug">{scene.subDetail}</p>
          )}
        </div>

        {sceneIndex < 5 && (
          <button
            type="button"
            onClick={() => onChangeScene(sceneIndex + 1)}
            className="btn-space btn-space-sky btn-space-md gap-2 shrink-0"
          >
            {sceneIndex === 2
              ? 'Continue to Mission Plan'
              : sceneIndex === 4
              ? 'Name Your Rover'
              : 'Next Scene'}
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
