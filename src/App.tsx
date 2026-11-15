import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HelpCircle, Volume2, X } from 'lucide-react';
import { BuildPhaseExperience, ModuleExplainerModal } from './components/BuildPhaseExperience';
import { HoldScanModal } from './components/HoldScanModal';
import { IntroCinematic } from './components/IntroCinematic';
import { InspectedObjectState, MissionGuidanceHUD } from './components/MissionGuidanceHUD';
import { MissionMapModal } from './components/MissionMapModal';
import {
  OutpostSiteModal,
  SettingsModal,
  SurvivalChallengeModal,
  VictoryModal,
} from './components/PhasePanels';
import {
  ResourceActivityModal,
  ResourceActivityMode,
} from './components/ResourceActivityModal';
import { RoverStatusModal } from './components/RoverStatusModal';
import { ScienceJournalModal } from './components/ScienceJournalModal';
import {
  SurvivePhaseIntro,
  SurvivalChallengeResultModal,
  SurvivalScenarioLesson,
} from './components/SurvivePhaseStory';
import { TaskPopupModal } from './components/TaskPopupModal';
import { TitleScreen } from './components/TitleScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { VisualArrowGuide } from './components/VisualArrowGuide';
import { VoiceOverlay } from './components/VoiceOverlay';
import { audioEngine } from './game/audioEngine';
import {
  OUTPOST_SITES,
  ROCK_TARGETS,
  getSunlightFactor,
} from './game/lunarTerrain';
import {
  INTRO_SCENES,
  PHASE4_CHALLENGES,
  PHASE_INTRO_POPUPS,
  PHASE_TUTORIALS,
  STRUCTURES,
  TASK_POPUPS,
  TUTORIAL_STEPS,
} from './game/missionData';
import {
  MOON_TOUR_TOPICS,
  ROVER_PARTS,
  getNasaMediaForTargetKind,
} from './game/nasaMedia';
import { validateRoverPath } from './game/pathSystem';
import {
  canAffordStructure,
  clearSavedGameState,
  computeStructureEfficiency,
  createInitialGameState,
  getNearestTargetForRover,
  getPhaseMissionSteps,
  getRecommendedOutpostSlots,
  isPhaseComplete,
  loadSavedGameState,
  refundResourcesForStructure,
  saveGameState,
  spendResourcesForStructure,
  tickPhase4Simulation,
} from './game/rules';
import {
  CameraMode,
  GameState,
  Point2D,
  RockTarget,
  StructureType,
  TutorialProgress,
} from './game/types';
import { LunarSceneController, SceneObjectLabel } from './three/LunarSceneController';

const EMPTY_ROUTE = {
  isDrawingMode: false,
  rawPoints: [] as Point2D[],
  validation: null,
  isExecuting: false,
  isPaused: false,
  progressIndex: 0,
};

export default function App() {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [savedSnapshot, setSavedSnapshot] = useState<GameState | null>(() =>
    autostart ? null : loadSavedGameState()
  );
  const [state, setState] = useState<GameState>(() => createInitialGameState(autostart));

  const [showMap, setShowMap] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRoverStatus, setShowRoverStatus] = useState(false);
  const [showOutpostPicker, setShowOutpostPicker] = useState(false);
  const [activityMode, setActivityMode] = useState<ResourceActivityMode | null>(null);
  const [holdScanTarget, setHoldScanTarget] = useState<RockTarget | null>(null);
  const [inspectedObject, setInspectedObject] = useState<InspectedObjectState | null>(null);
  const [inspectedFading, setInspectedFading] = useState(false);
  const [projectedLabels, setProjectedLabels] = useState<SceneObjectLabel[]>([]);
  const [autoplayBlocked, setAutoplayBlocked] = useState(() => audioEngine.isAutoplayBlocked());
  const [phase3ShowcaseActive, setPhase3ShowcaseActive] = useState(false);
  const [sitePickerTutorialSeen, setSitePickerTutorialSeen] = useState(false);
  const [arrowGuide, setArrowGuide] = useState<{ targetKey: string; label: string } | null>(null);
  const [phaseGuideOpen, setPhaseGuideOpen] = useState(false);
  const [phaseHintLevel, setPhaseHintLevel] = useState(0);
  const [introNarrationDone, setIntroNarrationDone] = useState(false);
  const [showcaseMinTimeDone, setShowcaseMinTimeDone] = useState(false);
  const [showcaseNarrationDone, setShowcaseNarrationDone] = useState(false);
  const [tutorialHighlightActive, setTutorialHighlightActive] = useState(false);
  const [inventoryPulseTag, setInventoryPulseTag] = useState<string | null>(null);
  const [explainModuleType, setExplainModuleType] = useState<StructureType | null>(null);
  const [phase4PanelExpanded, setPhase4PanelExpanded] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<LunarSceneController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const lastProgressTimeRef = useRef<number>(Date.now());
  const lastCraterNoticeRef = useRef<boolean>(false);
  const lastObstacleNoticeRef = useRef<number>(0);
  const promptedOutpostRef = useRef<boolean>(false);
  const phase3ShowcaseDoneRef = useRef<boolean>(false);

  const markProgress = useCallback(() => {
    lastProgressTimeRef.current = Date.now();
    setArrowGuide(null);
  }, []);

  const flashInventoryPulse = useCallback((tag: string) => {
    setInventoryPulseTag(tag);
    window.setTimeout(() => {
      setInventoryPulseTag((cur) => (cur === tag ? null : cur));
    }, 2400);
  }, []);

  // Mirror body.dataset.state for shell consistency & testability
  useEffect(() => {
    const mapped =
      state.screen === 'victory'
        ? 'gameover'
        : state.screen === 'paused'
        ? 'paused'
        : state.screen === 'title' || state.screen === 'intro'
        ? 'title'
        : 'playing';
    document.body.dataset.state = mapped;
    document.body.dataset.phase = String(state.phase);
    document.body.dataset.screen = state.screen;
    document.body.dataset.rover = `${state.rover.x.toFixed(1)},${state.rover.z.toFixed(1)},${state.rover.distanceDrivenM.toFixed(1)}`;
  }, [state.screen, state.phase, state.rover.x, state.rover.z, state.rover.distanceDrivenM]);

  // Sync 3-channel audio settings & background music mode
  useEffect(() => {
    audioEngine.setSettings({
      muted: state.audio.muted,
      volume: state.audio.volume,
      narrationVolume: state.audio.narrationVolume,
      musicVolume: state.audio.musicVolume,
      sfxVolume: state.audio.sfxVolume,
      voiceEnabled: state.audio.voiceEnabled,
    });
  }, [
    state.audio.muted,
    state.audio.volume,
    state.audio.narrationVolume,
    state.audio.musicVolume,
    state.audio.sfxVolume,
    state.audio.voiceEnabled,
  ]);

  useEffect(() => {
    if (state.screen === 'paused') {
      audioEngine.pauseAll();
      return;
    }
    audioEngine.resumeAll();
    if (state.screen === 'intro') audioEngine.setMusicMode('intro');
    else if (state.screen === 'playing' && state.phase === 4) audioEngine.setMusicMode('alert');
    else if (state.screen === 'tutorial' || state.screen === 'playing') audioEngine.setMusicMode('explore');
    else audioEngine.setMusicMode('none');
  }, [state.screen, state.phase]);

  // Browser autoplay unlock listener
  useEffect(() => {
    return audioEngine.onAutoplayBlockedChange(setAutoplayBlocked);
  }, []);

  // 50-second auto-fadeout for inspected NASA object card (pauses while paused)
  useEffect(() => {
    if (!inspectedObject || state.screen === 'paused') return;
    setInspectedFading(false);
    const fadeTimer = window.setTimeout(() => setInspectedFading(true), 49300);
    const clearTimer = window.setTimeout(() => {
      setInspectedObject(null);
      setInspectedFading(false);
    }, 50000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [inspectedObject, state.screen]);

  // 7-second auto-dismiss for Quick Tips / Contextual Notices (pauses while paused)
  useEffect(() => {
    const noticeId = state.contextualNotice?.id;
    if (!noticeId || state.screen === 'paused') return;
    const t = window.setTimeout(() => {
      setState((prev) =>
        prev.contextualNotice?.id === noticeId ? { ...prev, contextualNotice: null } : prev
      );
    }, 7000);
    return () => window.clearTimeout(t);
  }, [state.contextualNotice?.id, state.screen]);

  // Speak each intro scene ONCE per scene ID so revisiting or pausing never overlaps/replays
  useEffect(() => {
    if (state.screen === 'intro') {
      setIntroNarrationDone(false);
      const s = INTRO_SCENES[state.introScene];
      if (s) {
        audioEngine.speakOnce(`intro_scene_${state.introScene}`, s.caption, s.mood, () => {
          setIntroNarrationDone(true);
        });
      }
    }
  }, [state.screen, state.introScene]);

  useEffect(() => {
    if (state.activePopup && state.screen !== 'paused') {
      audioEngine.speakOnce(
        `popup_${state.activePopup.id}`,
        state.activePopup.astroLine || `${state.activePopup.title}. ${state.activePopup.whatIsHappening}`,
        state.activePopup.astroMood ?? 'warm'
      );
    }
  }, [state.activePopup, state.screen]);

  // Speak tutorial step welcome ONCE per step ID
  useEffect(() => {
    if (state.screen === 'tutorial') {
      setTutorialHighlightActive(true);
      const t = TUTORIAL_STEPS[state.tutorial.step];
      if (t) {
        audioEngine.speakOnce(
          `tutorial_${t.id}`,
          t.astroBubble,
          t.id === 'complete' ? 'celebrating' : 'warm'
        );
      }
    } else {
      setTutorialHighlightActive(false);
    }
  }, [state.screen, state.tutorial.step]);

  const updateState = useCallback(
    (updater: (prev: GameState) => GameState, persist = false) => {
      setState((prev) => {
        const next = updater(prev);
        return persist ? saveGameState(next) : next;
      });
    },
    []
  );

  // Auto-open Outpost Site Picker once Phase 1 exploration steps are complete
  useEffect(() => {
    if (
      state.screen === 'playing' &&
      state.phase === 1 &&
      !state.activePopup &&
      !showOutpostPicker &&
      !promptedOutpostRef.current &&
      state.selectedOutpostSite === null &&
      state.exploredCells.length >= 4 &&
      state.scannedTargetIds.includes('rock_highland_anorthosite') &&
      state.visitedCrater
    ) {
      promptedOutpostRef.current = true;
      setShowOutpostPicker(true);
    }
  }, [state, showOutpostPicker]);

  // Check phase completion after state transitions
  useEffect(() => {
    if (state.screen !== 'playing' || state.activePopup || activityMode || holdScanTarget) return;
    if (!isPhaseComplete(state)) return;

    if (state.phase === 1) {
      audioEngine.playPhaseComplete();
      markProgress();
      updateState(
        (prev) => ({
          ...prev,
          phase: 2,
          routePlanning: EMPTY_ROUTE,
          scienceJournalIds: Array.from(new Set([...prev.scienceJournalIds, 'sci_south_pole_light'])),
          activePopup: {
            id: 'phase_1_complete_to_2',
            tone: 'complete',
            badge: 'PHASE 1 COMPLETE!',
            title: 'South Pole Scouted!',
            astroLine:
              prev.selectedOutpostSite === 'ridge_haven'
                ? 'Awesome scouting, Commander! Sunlit Peak Ridge is bright and ready—now let’s scoop soil, drill craters, and test solar angles!'
                : 'Great scouting! Shadow Rim Terrace puts us super close to the dark crater—now let’s gather real Moon supplies!',
            astroMood: 'celebrating',
            whatIsHappening: 'You explored the lunar terrain and chose our future outpost home.',
            whyItMatters: 'Next, we collect raw soil, water clues, and solar data, then process them in the Moon Lab!',
            steps: PHASE_INTRO_POPUPS[2].steps,
            whatHappensNext: 'Phase 2: Collect & Process begins now!',
            ctaLabel: 'START PHASE 2: COLLECT',
            diagramKind: 'sunlight',
          },
        }),
        true
      );
    } else if (state.phase === 2) {
      audioEngine.playPhaseComplete();
      markProgress();
      updateState(
        (prev) => ({
          ...prev,
          phase: 3,
          cameraMode: 'topDown',
          selectedBuildType: 'habitat',
          buildMode: 'place',
          routePlanning: EMPTY_ROUTE,
          activePopup: {
            id: 'phase_2_complete_to_3',
            tone: 'complete',
            badge: 'PHASE 2 COMPLETE!',
            title: 'Supplies Processed & Ready!',
            astroLine: `Woohoo! We processed ${prev.resources.regolith} Regolith Units, ${prev.resources.waterIceClues} Processed Water Tanks, and ${prev.resources.sunlightData} Solar Kits! Let’s build our home!`,
            astroMood: 'celebrating',
            whatIsHappening: 'Your processed resources are stocked for outpost construction.',
            whyItMatters: 'Placing modules in smart spots and connecting cables keeps astronauts safe!',
            steps: PHASE_INTRO_POPUPS[3].steps,
            whatHappensNext: 'Phase 3: Engineer & Connect begins now!',
            ctaLabel: 'START PHASE 3: BUILD',
            diagramKind: 'solar',
          },
        }),
        true
      );
    } else if (state.phase === 3) {
      if (!phase3ShowcaseDoneRef.current) {
        if (!phase3ShowcaseActive) {
          audioEngine.playPhaseComplete();
          setShowcaseMinTimeDone(false);
          setShowcaseNarrationDone(false);
          audioEngine.speak(
            'Awesome! Every module is connected! Watch sunlight turn into electricity while water and fresh air flow into our Moon home!',
            'celebrating',
            () => setShowcaseNarrationDone(true)
          );
          setPhase3ShowcaseActive(true);
          updateState((prev) => ({ ...prev, cameraMode: 'topDown', selectedBuildType: null }));
        }
        return;
      }
      audioEngine.playMissionAlert();
      markProgress();
      updateState(
        (prev) => ({
          ...prev,
          phase: 4,
          selectedBuildType: null,
          routePlanning: EMPTY_ROUTE,
          scienceJournalIds: Array.from(new Set([...prev.scienceJournalIds, 'sci_space_weather'])),
          activePopup: null,
        }),
        true
      );
    } else if (state.phase === 4 && !state.survival.lastResolvedChallenge) {
      audioEngine.playPhaseComplete();
      controllerRef.current?.triggerVictoryReaction();
      audioEngine.speakOnce(
        'victory_celebration',
        'Mission complete, Commander! Look at the Moon outpost you built—every astronaut is safe, warm, and breathing fresh air because of your science and engineering!',
        'celebrating'
      );
      updateState((prev) => ({ ...prev, screen: 'victory' }), true);
    }
  }, [state, activityMode, holdScanTarget, phase3ShowcaseActive, updateState, markProgress]);

  // 4.2-second Connected Outpost Showcase timer (waits for both min visual window AND ASTRO sentence to finish!)
  const enterPhase4FromShowcase = useCallback((stopCurrentVoice = false) => {
    if (stopCurrentVoice) {
      audioEngine.stopSpeech();
    }
    phase3ShowcaseDoneRef.current = true;
    setPhase3ShowcaseActive(false);
    setShowcaseMinTimeDone(false);
    setShowcaseNarrationDone(false);
    audioEngine.playMissionAlert();
    markProgress();
    updateState(
      (prev) => ({
        ...prev,
        phase: 4,
        selectedBuildType: null,
        routePlanning: EMPTY_ROUTE,
        scienceJournalIds: Array.from(new Set([...prev.scienceJournalIds, 'sci_space_weather'])),
        activePopup: null,
      }),
      true
    );
  }, [markProgress, updateState]);

  useEffect(() => {
    if (!phase3ShowcaseActive || state.screen === 'paused') return;
    const timer = window.setTimeout(() => {
      setShowcaseMinTimeDone(true);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [phase3ShowcaseActive, state.screen]);

  useEffect(() => {
    if (phase3ShowcaseActive && showcaseMinTimeDone && showcaseNarrationDone && state.screen !== 'paused') {
      enterPhase4FromShowcase(false);
    }
  }, [phase3ShowcaseActive, showcaseMinTimeDone, showcaseNarrationDone, state.screen, enterPhase4FromShowcase]);

  // Phase 4 live 1Hz telemetry simulation tick (freezes cleanly on Pause, intros, lessons, results, or modal overlays)
  useEffect(() => {
    if (
      state.screen !== 'playing' ||
      state.phase !== 4 ||
      !state.phase4IntroSeen ||
      !state.survival.overviewSeen ||
      Boolean(state.survival.lastResolvedChallenge) ||
      !state.survival.activeChallenge ||
      !state.survival.taughtChallenges.includes(state.survival.activeChallenge) ||
      state.activePopup ||
      state.survival.resolvedChallenges.length >= 5 ||
      showMap ||
      showJournal ||
      showSettings ||
      showRoverStatus ||
      activityMode
    ) {
      return;
    }
    const simTimer = window.setInterval(() => {
      updateState((prev) => tickPhase4Simulation(prev));
    }, 1000);
    return () => window.clearInterval(simTimer);
  }, [
    state.screen,
    state.phase,
    state.phase4IntroSeen,
    state.survival.overviewSeen,
    state.survival.lastResolvedChallenge,
    state.survival.activeChallenge,
    state.survival.taughtChallenges,
    state.survival.resolvedChallenges.length,
    state.activePopup,
    showMap,
    showJournal,
    showSettings,
    showRoverStatus,
    activityMode,
    updateState,
  ]);

  // Gentle idle hint + directional arrow if player pauses for ~12s (timer resets while modal/paused)
  useEffect(() => {
    if (
      (state.screen !== 'playing' && state.screen !== 'tutorial') ||
      state.activePopup ||
      activityMode ||
      holdScanTarget ||
      showMap ||
      showJournal ||
      showSettings ||
      showRoverStatus ||
      showOutpostPicker ||
      phaseGuideOpen ||
      phase3ShowcaseActive ||
      explainModuleType ||
      (state.phase === 3 && !state.phase3IntroSeen) ||
      (state.phase === 4 && (!state.phase4IntroSeen || Boolean(state.survival.lastResolvedChallenge)))
    ) {
      lastProgressTimeRef.current = Date.now();
      return;
    }
    const timer = window.setInterval(() => {
      const idleSec = (Date.now() - lastProgressTimeRef.current) / 1000;
      if (idleSec > 12) {
        const cur = stateRef.current;
        if (cur.screen === 'tutorial') {
          const stepInfo = TUTORIAL_STEPS[cur.tutorial.step];
          if (stepInfo && cur.tutorial.step !== 'complete') {
            lastProgressTimeRef.current = Date.now();
            setArrowGuide({ targetKey: stepInfo.highlightTarget, label: 'Next Step' });
          }
          return;
        }
        const { steps } = getPhaseMissionSteps(cur);
        const nextStep = steps.find((s) => !s.completed);
        if (nextStep) {
          lastProgressTimeRef.current = Date.now();
          if (nextStep.guideTarget) {
            setArrowGuide({ targetKey: nextStep.guideTarget, label: 'Next Step' });
          }
          if (!cur.contextualNotice) {
            updateState((prev) => ({
              ...prev,
              contextualNotice: {
                id: `idle_hint_${Date.now()}`,
                tone: 'science',
                title: 'Quick Tip',
                message: nextStep.hint,
              },
            }));
          }
        }
      }
    }, 3500);
    return () => window.clearInterval(timer);
  }, [
    state.screen,
    state.phase,
    state.phase3IntroSeen,
    state.phase4IntroSeen,
    state.survival.lastResolvedChallenge,
    state.activePopup,
    activityMode,
    holdScanTarget,
    showMap,
    showJournal,
    showSettings,
    showRoverStatus,
    showOutpostPicker,
    phaseGuideOpen,
    phase3ShowcaseActive,
    explainModuleType,
    updateState,
  ]);

  // Shared structure placement helper (used by 3D clicks AND "Place at Dotted Preview")
  const placeStructureAt = useCallback(
    (type: StructureType, x: number, z: number) => {
      markProgress();
      updateState((prev) => {
        if (prev.phase !== 3) return prev;
        if (!canAffordStructure(prev.resources, type)) {
          audioEngine.playGentleWarning();
          return {
            ...prev,
            contextualNotice: {
              id: 'need_res',
              tone: 'warning',
              title: 'Need More Regolith Units',
              message: 'Tap Construction Supply Kit in the builder bar for +15 Regolith Units!',
            },
          };
        }
        const efficiencyPct = computeStructureEfficiency(
          type,
          x,
          z,
          prev.selectedOutpostSite
        );
        const nextResources = spendResourcesForStructure(prev.resources, type);
        const needsCable = Boolean(STRUCTURES[type].needsConnectionTo?.length);
        const placed = {
          id: `${type}_${Date.now()}`,
          type,
          x,
          z,
          rotationDeg: prev.buildRotationDeg,
          connectedToHabitat: !needsCable,
          efficiencyPct,
          status: needsCable ? ('needs_attention' as const) : ('connected' as const),
          placedAt: Date.now(),
        };
        audioEngine.playBuild();
        const def = STRUCTURES[type];
        const nextStructures = [...prev.structures, placed];
        const reqOrder: StructureType[] = ['habitat', 'solar', 'battery', 'water', 'air', 'oxygen'];
        const nextUnplaced = reqOrder.find((rt) => !nextStructures.some((s) => s.type === rt));

        return {
          ...prev,
          resources: nextResources,
          structures: nextStructures,
          selectedBuildType: nextUnplaced ?? prev.selectedBuildType,
          butterfly: {
            ...prev.butterfly,
            installedRegolithShielding:
              prev.butterfly.installedRegolithShielding || type === 'shielding',
            builtBackupBattery:
              prev.butterfly.builtBackupBattery || type === 'battery',
            protectedCableRoute:
              prev.butterfly.protectedCableRoute || type === 'cable',
          },
          scienceJournalIds:
            type === 'shielding' && !prev.scienceJournalIds.includes('sci_regolith_shielding')
              ? [...prev.scienceJournalIds, 'sci_regolith_shielding']
              : prev.scienceJournalIds,
          contextualNotice: {
            id: `built_${type}`,
            tone: 'complete',
            title: `${def.name} Unfolded!`,
            message: needsCable
              ? `${efficiencyPct}% site score! Remember to connect its line to Habitat.`
              : `${efficiencyPct}% site score!`,
          },
        };
      }, true);
    },
    [markProgress, updateState]
  );

  // Helper to connect a pair of structures cleanly in Phase 3
  const connectStructurePair = useCallback(
    (fromId: string, toId: string) => {
      markProgress();
      audioEngine.playCableConnect();
      updateState((prev) => {
        const from = prev.structures.find((s) => s.id === fromId);
        const to = prev.structures.find((s) => s.id === toId);
        if (!from || !to || from.id === to.id) return { ...prev, connectSourceId: null };

        const kind = STRUCTURES[from.type].connectionKind ?? STRUCTURES[to.type].connectionKind ?? 'power';
        const exists = prev.connections.some(
          (c) =>
            (c.fromId === from.id && c.toId === to.id) ||
            (c.fromId === to.id && c.toId === from.id)
        );
        const nextConnections = exists
          ? prev.connections.map((c) =>
              (c.fromId === from.id && c.toId === to.id) ||
              (c.fromId === to.id && c.toId === from.id)
                ? { ...c, status: 'connected' as const }
                : c
            )
          : [
              ...prev.connections,
              {
                id: `conn_${from.id}_${to.id}`,
                fromId: from.id,
                toId: to.id,
                kind,
                status: 'connected' as const,
              },
            ];

        const nextStructures = prev.structures.map((s) =>
          s.id === from.id || s.id === to.id
            ? { ...s, connectedToHabitat: true, status: 'connected' as const }
            : s
        );

        return {
          ...prev,
          connectSourceId: null,
          connections: nextConnections,
          structures: nextStructures,
          contextualNotice: {
            id: `wired_${from.id}`,
            tone: 'complete',
            title: `${STRUCTURES[from.type].name} Connected!`,
            message: `${kind.toUpperCase()} line linked cleanly to Habitat.`,
          },
        };
      }, true);
    },
    [markProgress, updateState]
  );

  // Mount Three.js controller once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const ctrl = new LunarSceneController(mount, stateRef.current, {
      onCameraAction: (action) => {
        updateState((prev) => {
          if (prev.screen !== 'tutorial' || prev.tutorial.step !== 'look_around') return prev;
          return {
            ...prev,
            tutorial: {
              ...prev.tutorial,
              rotatedCamera: prev.tutorial.rotatedCamera || action === 'rotate',
              zoomedCamera: prev.tutorial.zoomedCamera || action === 'zoom',
            },
          };
        });
      },
      onRoverStep: (step) => {
        if (step.distanceDelta > 0.02) markProgress();
        updateState((prev) => {
          const cellKey = `${Math.round(step.x / 12)},${Math.round(step.z / 12)}`;
          const explored = prev.exploredCells.includes(cellKey)
            ? prev.exploredCells
            : [...prev.exploredCells, cellKey];

          const nextDust = Math.min(100, Math.max(0, prev.rover.dustLevel + step.dustDelta));
          const sunHere = getSunlightFactor(step.x, step.z);
          const solarTrickle =
            step.distanceDelta < 0.01 && sunHere > 0.7 && prev.rover.dustLevel < 60 ? 0.08 : 0;
          const nextBat = Math.min(100, Math.max(12, prev.rover.battery + step.energyDelta + solarTrickle));

          let notice = prev.contextualNotice;
          if (step.inCrater && !lastCraterNoticeRef.current) {
            lastCraterNoticeRef.current = true;
            audioEngine.playRoverChirp();
            notice = {
              id: 'crater_entry',
              tone: 'science',
              title: 'Shadowed Crater',
              message: prev.rover.headlightsOn
                ? 'Nice! Headlights are lighting up this freezing crater floor!'
                : 'Super dark crater! Tap Lights ON at the bottom so we can see clearly.',
            };
          } else if (!step.inCrater) {
            lastCraterNoticeRef.current = false;
          }

          let butterfly = prev.butterfly;
          if (step.onLooseRegolith && step.distanceDelta > 0.04) {
            butterfly = { ...butterfly, tookDustyShortcut: true };
          }
          let nextIssue = prev.rover.lastIssue;
          if (nextDust > 35 && prev.rover.dustLevel <= 35) {
            audioEngine.playGentleWarning();
            nextIssue = {
              id: 'dust_buildup',
              component: 'Navigation Camera & Solar Deck',
              causeTitle: 'Fine Moon Dust Settled on Sensors',
              whyItHappened:
                'Driving across powdery lunar regolith kicked sharp dust grains onto your rover lens and solar deck.',
              consequenceIfIgnored:
                'Camera views turn hazy and solar charging slows down until wiped clean!',
              severity: 'warn',
            };
            notice = {
              id: 'dust_warning',
              tone: 'warning',
              title: 'Dusty Sensors',
              message: 'Fine Moon dust kicked up! Tap Rover Care at the bottom to inspect & wipe it.',
            };
          }

          const lastTrail = prev.roverTrail[prev.roverTrail.length - 1];
          const shouldAppendTrail =
            !lastTrail || Math.hypot(step.x - lastTrail.x, step.z - lastTrail.z) >= 0.95;
          const nextTrail = shouldAppendTrail
            ? [...prev.roverTrail, { x: Number(step.x.toFixed(2)), z: Number(step.z.toFixed(2)) }].slice(-180)
            : prev.roverTrail;

          return {
            ...prev,
            exploredCells: explored,
            visitedCrater: prev.visitedCrater || step.inCrater,
            roverTrail: nextTrail,
            butterfly,
            scienceJournalIds:
              step.onLooseRegolith && !prev.scienceJournalIds.includes('sci_lunar_dust')
                ? [...prev.scienceJournalIds, 'sci_lunar_dust']
                : prev.scienceJournalIds,
            tutorial:
              prev.screen === 'tutorial' &&
              prev.tutorial.step === 'move_rover' &&
              prev.rover.distanceDrivenM + step.distanceDelta > 0.35
                ? { ...prev.tutorial, movedRover: true }
                : prev.tutorial,
            rover: {
              ...prev.rover,
              x: step.x,
              y: step.y,
              z: step.z,
              headingRad: step.headingRad,
              speed: step.speed,
              animState: step.animState,
              battery: nextBat,
              dustLevel: nextDust,
              distanceDrivenM: prev.rover.distanceDrivenM + step.distanceDelta,
              lastIssue: nextIssue,
            },
            contextualNotice: notice,
          };
        });
      },
      onRouteDrawSample: (points, finished) => {
        markProgress();
        updateState((prev) => {
          const validation = finished
            ? validateRoverPath(
                points,
                { x: prev.rover.x, z: prev.rover.z },
                prev.rover.battery,
                undefined,
                { dustLevel: prev.rover.dustLevel }
              )
            : null;
          if (finished && validation && !validation.valid) {
            audioEngine.playGentleWarning();
          } else if (finished && validation?.valid) {
            audioEngine.playRoverChirp();
          }
          return {
            ...prev,
            tutorial:
              finished && validation?.valid && prev.screen === 'tutorial' && prev.tutorial.step === 'draw_route'
                ? { ...prev.tutorial, drewRoute: true }
                : prev.tutorial,
            routePlanning: {
              ...prev.routePlanning,
              isExecuting: false,
              isPaused: false,
              rawPoints: points,
              validation,
              progressIndex: 0,
            },
          };
        });
      },
      onRouteProgress: (index, finished) => {
        markProgress();
        updateState((prev) => ({
          ...prev,
          routePlanning: {
            ...prev.routePlanning,
            progressIndex: index,
            isExecuting: !finished,
            isPaused: false,
            isDrawingMode: finished ? false : prev.routePlanning.isDrawingMode,
          },
          contextualNotice: finished
            ? {
                id: 'route_done',
                tone: 'complete',
                title: 'Arrived Safely!',
                message: `${prev.roverName} reached your destination!`,
              }
            : prev.contextualNotice,
        }));
        if (finished) audioEngine.playRoverChirp();
      },
      onDynamicObstacle: () => {
        const now = Date.now();
        if (now - lastObstacleNoticeRef.current < 2500) return;
        lastObstacleNoticeRef.current = now;
        audioEngine.playBump();
        updateState((prev) => ({
          ...prev,
          rover: {
            ...prev.rover,
            health: Math.max(40, prev.rover.health - 4),
            lastIssue: {
              id: 'wheel_knock',
              component: 'Rocker-Bogie Wheels',
              causeTitle: 'Boulder Bump Jarred Wheel Alignment',
              whyItHappened: 'Tapping a sharp lunar boulder jarred the front suspension strut.',
              consequenceIfIgnored: 'Steering slows down if suspension takes repeated bumps.',
              severity: 'warn',
            },
          },
          routePlanning: {
            ...prev.routePlanning,
            isExecuting: false,
            isPaused: false,
          },
          contextualNotice: {
            id: `obstacle_${now}`,
            tone: 'warning',
            title: 'Big Rock Ahead',
            message: 'Rover braked safely! Open Rover Care to check wheels or steer around.',
          },
        }));
      },
      onTerrainClickForBuild: (x, z) => {
        const type = stateRef.current.selectedBuildType;
        if (!type) return;
        placeStructureAt(type, x, z);
      },
      onStructureClick: (structureId) => {
        const cur = stateRef.current;
        if (cur.phase === 3 && cur.buildMode === 'connect') {
          if (!cur.connectSourceId) {
            audioEngine.playClick();
            updateState((p) => ({ ...p, connectSourceId: structureId }));
          } else {
            connectStructurePair(cur.connectSourceId, structureId);
          }
          return;
        }
        if (
          cur.phase === 4 &&
          cur.screen === 'playing' &&
          cur.phase4IntroSeen &&
          cur.survival.overviewSeen &&
          !cur.survival.lastResolvedChallenge &&
          cur.survival.activeChallenge &&
          cur.survival.taughtChallenges.includes(cur.survival.activeChallenge)
        ) {
          const ch = PHASE4_CHALLENGES.find((c) => c.id === cur.survival.activeChallenge);
          const clicked = cur.structures.find((s) => s.id === structureId);
          if (ch && clicked && clicked.type === ch.targetStructure) {
            markProgress();
            audioEngine.playRoverChirp();
            updateState((p) => ({
              ...p,
              survival: { ...p.survival, stationVisited: true },
              contextualNotice: {
                id: 'station_inspected',
                tone: 'complete',
                title: `${STRUCTURES[ch.targetStructure].name} Reached!`,
                message: 'Station controls unlocked—use the panel below!',
              },
            }));
          }
        }
      },
      onInspectSceneObject: (payload) => {
        audioEngine.playClick();
        const media = getNasaMediaForTargetKind(payload.kind);
        setInspectedObject({
          item: media,
          title: payload.title,
          badge: payload.badge,
        });
      },
      onProjectedLabels: setProjectedLabels,
    });

    controllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, [updateState, markProgress, connectStructurePair, placeStructureAt]);

  useEffect(() => {
    controllerRef.current?.syncState(state);
  }, [state]);

  // Actions: Phase 1 Scan OR Phase 2 Interactive Gameplay Activity!
  const handleScanOrCollect = useCallback(() => {
    markProgress();
    const cur = stateRef.current;
    const nearest = getNearestTargetForRover(cur);

    if (!nearest || nearest.distance > 5.5) {
      audioEngine.playGentleWarning();
      updateState((prev) => ({
        ...prev,
        contextualNotice: {
          id: 'too_far_scan',
          tone: 'warning',
          title: 'Roll Closer',
          message: 'Drive up beside a glowing ring on the Moon, then tap Scan / Collect!',
        },
      }));
      return;
    }

    const target = nearest.target;

    // In Phase 2, launch physical gameplay mini-activity instead of reading a paragraph!
    if (cur.phase === 2 && cur.screen === 'playing') {
      if (target.kind === 'regolith_loose') {
        audioEngine.playArmMove();
        controllerRef.current?.triggerScoopAnimation();
        audioEngine.speak(target.astroReaction, 'excited');
        setActivityMode({ kind: 'soil_scoop', target });
        return;
      }
      if (target.kind === 'hydrogen_clue' || target.kind === 'dry_crater_probe') {
        audioEngine.playScanSweep();
        controllerRef.current?.triggerDrillAnimation();
        audioEngine.speak(
          cur.rover.headlightsOn
            ? target.astroReaction
            : 'Whoa, it is super dark in here! Switch ON my headlights first!',
          'excited'
        );
        setActivityMode({ kind: 'crater_drill', target });
        return;
      }
      if (target.kind === 'sunlight_beacon') {
        audioEngine.playScanSweep();
        controllerRef.current?.triggerScanAnimation();
        audioEngine.speak(target.astroReaction, 'excited');
        setActivityMode({ kind: 'solar_test', target });
        return;
      }
    }

    // Phase 1 & Tutorial: open Hold-to-Scan interactive laser spectrometer modal!
    audioEngine.playClick();
    controllerRef.current?.triggerScanAnimation();
    setHoldScanTarget(target);
  }, [markProgress, updateState]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const s = stateRef.current;
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (s.screen === 'playing' || s.screen === 'tutorial') {
          updateState((prev) => ({ ...prev, screen: 'paused' }));
        } else if (s.screen === 'paused') {
          updateState((prev) => ({ ...prev, screen: prev.tutorialCompleted ? 'playing' : 'tutorial' }));
        }
      } else if (
        e.code === 'Space' &&
        (s.screen === 'playing' || s.screen === 'tutorial') &&
        !s.activePopup &&
        !activityMode &&
        !holdScanTarget
      ) {
        e.preventDefault();
        handleScanOrCollect();
      } else if (e.key.toLowerCase() === 'm' && (s.screen === 'playing' || s.screen === 'tutorial')) {
        setShowMap((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleScanOrCollect, activityMode, holdScanTarget, updateState]);

  const handleDrawFromMap = (points: Point2D[], finished: boolean) => {
    markProgress();
    updateState((prev) => {
      const validation = finished
        ? validateRoverPath(points, { x: prev.rover.x, z: prev.rover.z }, prev.rover.battery)
        : null;
      return {
        ...prev,
        tutorial:
          finished && validation?.valid && prev.screen === 'tutorial' && prev.tutorial.step === 'draw_route'
            ? { ...prev.tutorial, drewRoute: true }
            : prev.tutorial,
        routePlanning: {
          ...prev.routePlanning,
          isExecuting: false,
          isPaused: false,
          rawPoints: points,
          validation,
          progressIndex: 0,
        },
      };
    });
  };

  const handleStartRoute = () => {
    markProgress();
    audioEngine.playRoverChirp();
    updateState((prev) => ({
      ...prev,
      tutorial:
        prev.screen === 'tutorial' && prev.tutorial.step === 'draw_route'
          ? { ...prev.tutorial, startedRoute: true }
          : prev.tutorial,
      routePlanning: {
        ...prev.routePlanning,
        isDrawingMode: false,
        isExecuting: true,
        isPaused: false,
        progressIndex: 0,
      },
    }));
  };

  const handleAdvanceTutorial = () => {
    const order: TutorialProgress['step'][] = [
      'look_around',
      'move_rover',
      'learn_map',
      'draw_route',
      'scan_rock',
      'complete',
    ];
    audioEngine.playClick();
    updateState((prev) => {
      const idx = order.indexOf(prev.tutorial.step);
      const nextStep = order[Math.min(order.length - 1, idx + 1)];
      if (nextStep === 'complete') audioEngine.playPhaseComplete();
      return {
        ...prev,
        routePlanning: {
          ...prev.routePlanning,
          isExecuting: false,
          isPaused: false,
        },
        tutorial: { ...prev.tutorial, step: nextStep },
      };
    });
  };

  const handleRepeatTutorialStep = (stepId: TutorialProgress['step']) => {
    audioEngine.playClick();
    const stepInfo = TUTORIAL_STEPS[stepId];
    if (stepInfo) {
      audioEngine.speak(stepInfo.astroBubble, 'warm', undefined, { forceReplay: true });
    }
    updateState((prev) => ({
      ...prev,
      tutorial: {
        ...prev.tutorial,
        ...(stepId === 'look_around' && { rotatedCamera: false, zoomedCamera: false, switchedCameraView: false }),
        ...(stepId === 'move_rover' && { movedRover: false }),
        ...(stepId === 'learn_map' && { openedMap: false, inspectedMapTarget: false }),
        ...(stepId === 'draw_route' && { activatedDrawMode: false, drewRoute: false, startedRoute: false }),
        ...(stepId === 'scan_rock' && { scannedRock: false }),
      },
    }));
  };

  const handleCompleteTutorial = () => {
    audioEngine.stopSpeech();
    audioEngine.playPhaseComplete();
    markProgress();
    updateState(
      (prev) => ({
        ...prev,
        screen: 'playing',
        phase: 1,
        tutorialCompleted: true,
        achievements: Array.from(new Set([...prev.achievements, 'Junior Moon Pioneer'])),
        activePopup: PHASE_INTRO_POPUPS[1],
      }),
      true
    );
  };

  const handleStartFresh = () => {
    audioEngine.stopSpeech();
    audioEngine.playClick();
    audioEngine.resetPlayedKeys();
    clearSavedGameState();
    setSavedSnapshot(null);
    setShowMap(false);
    setShowJournal(false);
    setShowSettings(false);
    setShowRoverStatus(false);
    setShowOutpostPicker(false);
    setActivityMode(null);
    setHoldScanTarget(null);
    setInspectedObject(null);
    setInspectedFading(false);
    setProjectedLabels([]);
    setPhase3ShowcaseActive(false);
    setShowcaseMinTimeDone(false);
    setShowcaseNarrationDone(false);
    setSitePickerTutorialSeen(false);
    setArrowGuide(null);
    setPhaseGuideOpen(false);
    setPhaseHintLevel(0);
    setExplainModuleType(null);
    promptedOutpostRef.current = false;
    phase3ShowcaseDoneRef.current = false;
    const fresh = createInitialGameState(false);
    setState({ ...fresh, screen: 'intro', introScene: 0 });
  };

  const handleResumeSaved = () => {
    if (!savedSnapshot) return;
    audioEngine.playClick();
    setState({ ...savedSnapshot, screen: 'playing' });
  };

  const activeTutorialHighlight =
    state.screen === 'tutorial' && tutorialHighlightActive
      ? TUTORIAL_STEPS[state.tutorial.step]?.highlightTarget ?? null
      : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#03050a]">
      {/* Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} data-testid="lunar-3d-canvas" className="absolute inset-0 w-full h-full" />

      {/* Title Screen */}
      {state.screen === 'title' && (
        <TitleScreen
          hasSavedGame={savedSnapshot !== null}
          savedPhase={savedSnapshot?.phase}
          savedRoverName={savedSnapshot?.roverName}
          muted={state.audio.muted}
          onStartNew={handleStartFresh}
          onResumeSaved={handleResumeSaved}
          onToggleMute={() =>
            updateState((p) => ({ ...p, audio: { ...p.audio, muted: !p.audio.muted } }))
          }
        />
      )}

      {/* 6-Scene Continuous Cinematic Introduction */}
      {state.screen === 'intro' && (
        <IntroCinematic
          sceneIndex={state.introScene}
          tourTopicIndex={state.introTourTopicIndex}
          roverPartIndex={state.roverPartIndex}
          roverName={state.roverName}
          muted={state.audio.muted}
          captionsEnabled={state.audio.captionsEnabled}
          narrationDone={introNarrationDone}
          onChangeScene={(idx) => {
            audioEngine.playClick();
            updateState((p) => ({ ...p, introScene: idx }));
          }}
          onChangeTourTopic={(idx) => {
            audioEngine.playClick();
            const topic = MOON_TOUR_TOPICS[idx];
            if (topic) {
              audioEngine.speakOnce(
                `tour_topic_${topic.id}`,
                `${topic.title}. ${topic.simpleExplanation}`,
                'warm'
              );
            }
            updateState((p) => ({ ...p, introTourTopicIndex: idx }));
          }}
          onChangeRoverPart={(idx) => {
            audioEngine.playClick();
            const part = ROVER_PARTS[idx];
            if (part) {
              audioEngine.speakOnce(
                `rover_part_${part.id}`,
                `${part.name}. ${part.simpleExplanation}`,
                'warm'
              );
            }
            updateState((p) => ({ ...p, roverPartIndex: idx }));
          }}
          onNameRover={(name) => {
            audioEngine.playRoverChirp();
            updateState((p) => ({ ...p, roverName: name }));
          }}
          onFinishIntro={() => {
            audioEngine.stopSpeech();
            audioEngine.playPhaseComplete();
            updateState((p) => ({ ...p, screen: 'tutorial' }));
          }}
          onSkipIntro={() => {
            audioEngine.stopSpeech();
            audioEngine.playClick();
            updateState((p) => ({ ...p, screen: 'tutorial' }));
          }}
          onRestartIntro={() => {
            audioEngine.stopSpeech();
            audioEngine.resetPlayedKeys();
            audioEngine.playClick();
            updateState((p) => ({ ...p, introScene: 0 }));
          }}
          onToggleMute={() =>
            updateState((p) => ({ ...p, audio: { ...p.audio, muted: !p.audio.muted } }))
          }
          onToggleCaptions={() =>
            updateState((p) => ({
              ...p,
              audio: { ...p.audio, captionsEnabled: !p.audio.captionsEnabled },
            }))
          }
          onReplayVoice={(customText) =>
            customText
              ? audioEngine.speak(customText, 'warm', undefined, { forceReplay: true })
              : audioEngine.replaySpeech()
          }
        />
      )}

      {/* Active Gameplay & Tutorial HUD */}
      {(state.screen === 'tutorial' || state.screen === 'playing') && (
        <MissionGuidanceHUD
          state={state}
          tutorialHighlight={activeTutorialHighlight}
          inventoryPulseTag={inventoryPulseTag}
          inspectedObject={inspectedObject}
          inspectedFading={inspectedFading}
          projectedLabels={projectedLabels}
          autoplayBlocked={autoplayBlocked}
          phase3ShowcaseActive={phase3ShowcaseActive}
          onUnlockAudio={() => {
            audioEngine.unlockUserGesture();
          }}
          onContinuePhase4={() => enterPhase4FromShowcase(true)}
          onInspectProjectedLabel={(lbl) => {
            audioEngine.playClick();
            if (lbl.kind === 'proposed' && lbl.proposedType) {
              updateState((p) => ({ ...p, selectedBuildType: lbl.proposedType!, buildMode: 'place' }));
              return;
            }
            const kindKey =
              lbl.kind === 'rover'
                ? 'rover'
                : lbl.kind === 'structure'
                ? lbl.label.toLowerCase().includes('solar')
                  ? 'solar'
                  : lbl.label.toLowerCase().includes('water')
                  ? 'water'
                  : 'habitat'
                : lbl.kind === 'site'
                ? 'anorthosite'
                : 'basalt';
            setInspectedObject({
              item: getNasaMediaForTargetKind(kindKey),
              title: lbl.label,
              badge: lbl.sub,
            });
          }}
          onCloseInspectedObject={() => {
            setInspectedObject(null);
            setInspectedFading(false);
          }}
          modalOpen={Boolean(
            showMap ||
              showJournal ||
              showSettings ||
              showRoverStatus ||
              showOutpostPicker ||
              activityMode ||
              holdScanTarget ||
              phaseGuideOpen ||
              explainModuleType ||
              (state.screen === 'playing' && state.phase === 3 && !state.phase3IntroSeen) ||
              (state.screen === 'playing' &&
                state.phase === 4 &&
                (!state.phase4IntroSeen || Boolean(state.survival.lastResolvedChallenge)))
          )}
          onSelectCameraMode={(mode: CameraMode) => {
            markProgress();
            audioEngine.playClick();
            updateState((p) => ({
              ...p,
              cameraMode: mode,
              tutorial:
                p.screen === 'tutorial' && p.tutorial.step === 'look_around'
                  ? { ...p.tutorial, switchedCameraView: true }
                  : p.tutorial,
            }));
          }}
          onZoom={(factor) => {
            markProgress();
            controllerRef.current?.zoomBy(factor);
          }}
          onToggleHeadlights={() => {
            markProgress();
            const nextOn = !stateRef.current.rover.headlightsOn;
            audioEngine.playHeadlightsToggle(nextOn);
            updateState((p) => ({
              ...p,
              rover: { ...p.rover, headlightsOn: nextOn },
            }));
          }}
          onToggleDrawMode={() => {
            markProgress();
            audioEngine.playClick();
            updateState((p) => {
              const nextDraw = !p.routePlanning.isDrawingMode;
              return {
                ...p,
                cameraMode: nextDraw ? 'routePlan' : p.cameraMode,
                tutorial:
                  nextDraw && p.screen === 'tutorial' && p.tutorial.step === 'draw_route'
                    ? { ...p.tutorial, activatedDrawMode: true }
                    : p.tutorial,
                routePlanning: {
                  ...p.routePlanning,
                  isDrawingMode: nextDraw,
                },
              };
            });
          }}
          onStartRoute={handleStartRoute}
          onPauseResumeRoute={() =>
            updateState((p) => ({
              ...p,
              routePlanning: { ...p.routePlanning, isPaused: !p.routePlanning.isPaused },
            }))
          }
          onStopRoute={() =>
            updateState((p) => ({
              ...p,
              routePlanning: { ...p.routePlanning, isExecuting: false, isPaused: false },
            }))
          }
          onClearRoute={() =>
            updateState((p) => ({
              ...p,
              routePlanning: {
                ...p.routePlanning,
                rawPoints: [],
                validation: null,
                isExecuting: false,
                isPaused: false,
              },
            }))
          }
          onScanOrCollect={handleScanOrCollect}
          onOpenMoonLab={() => {
            markProgress();
            audioEngine.playClick();
            setActivityMode({ kind: 'moon_lab' });
          }}
          onOpenRoverStatus={() => {
            markProgress();
            audioEngine.playClick();
            setShowRoverStatus(true);
          }}
          onOpenOutpostPicker={() => {
            markProgress();
            setShowOutpostPicker(true);
          }}
          onOpenMap={() => {
            markProgress();
            audioEngine.playClick();
            setShowMap(true);
            updateState((p) => ({
              ...p,
              tutorial:
                p.screen === 'tutorial' && p.tutorial.step === 'learn_map'
                  ? { ...p.tutorial, openedMap: true }
                  : p.tutorial,
            }));
          }}
          onOpenJournal={() => {
            audioEngine.playClick();
            setShowJournal(true);
          }}
          onOpenSettings={() => {
            audioEngine.playClick();
            setShowSettings(true);
          }}
          onToggleMute={() =>
            updateState((p) => ({ ...p, audio: { ...p.audio, muted: !p.audio.muted } }))
          }
          onPauseGame={() => updateState((p) => ({ ...p, screen: 'paused' }))}
          onReopenGuide={() =>
            updateState((p) => ({ ...p, activePopup: PHASE_INTRO_POPUPS[p.phase] }))
          }
          onOpenPhaseGuide={() => {
            audioEngine.playClick();
            setPhaseHintLevel(0);
            setPhaseGuideOpen(true);
          }}
          onRequestHint={() => {
            const { steps } = getPhaseMissionSteps(state);
            const next = steps.find((s) => !s.completed);
            audioEngine.playRoverChirp();
            if (next) {
              audioEngine.speak(next.hint, 'encouraging');
              if (next.guideTarget) {
                setArrowGuide({ targetKey: next.guideTarget, label: 'Try Here!' });
              }
            }
            updateState((p) => ({
              ...p,
              contextualNotice: {
                id: `hint_${Date.now()}`,
                tone: 'science',
                title: 'Helpful Hint',
                message: next?.hint ?? 'Keep exploring!',
              },
            }));
          }}
          onTouchDrive={(fwd, turn) => controllerRef.current?.setTouchDrive(fwd, turn)}
          onSelectBuildType={(t: StructureType) =>
            updateState((p) => ({ ...p, selectedBuildType: t, buildMode: 'place' }))
          }
          onSetBuildMode={(mode) => {
            markProgress();
            audioEngine.playClick();
            updateState((p) => ({ ...p, buildMode: mode, connectSourceId: null }));
          }}
          onPlaceAtRecommendedSlot={(type: StructureType) => {
            const slot = getRecommendedOutpostSlots(stateRef.current.selectedOutpostSite).find(
              (sl) => sl.type === type && !stateRef.current.structures.some((s) => s.type === type)
            );
            if (slot) {
              placeStructureAt(type, slot.x, slot.z);
            }
          }}
          onConnectStructurePair={connectStructurePair}
          onAutoConnectAll={() => {
            const cur = stateRef.current;
            const habitat = cur.structures.find((s) => s.type === 'habitat');
            if (!habitat) return;
            for (const st of cur.structures) {
              if (STRUCTURES[st.type].needsConnectionTo?.length) {
                connectStructurePair(st.id, habitat.id);
              }
            }
          }}
          onRotateBuild={() =>
            updateState((p) => ({ ...p, buildRotationDeg: (p.buildRotationDeg + 45) % 360 }))
          }
          onRemoveLastStructure={() =>
            updateState((p) => {
              if (p.structures.length === 0) return p;
              const removed = p.structures[p.structures.length - 1];
              return {
                ...p,
                structures: p.structures.slice(0, -1),
                connections: p.connections.filter(
                  (c) => c.fromId !== removed.id && c.toId !== removed.id
                ),
                resources: refundResourcesForStructure(p.resources, removed.type),
              };
            }, true)
          }
          onCollectBonusRegolith={() => {
            audioEngine.playDiscovery();
            flashInventoryPulse('15 Regolith Units');
            updateState((p) => ({
              ...p,
              resources: { ...p.resources, regolith: p.resources.regolith + 15 },
              contextualNotice: {
                id: 'supply_kit',
                tone: 'complete',
                title: 'Regolith Units Delivered!',
                message: `${p.roverName} hauled +15 Regolith Units via Construction Supply Kit!`,
              },
            }));
          }}
          onReplayBuildIntro={() => updateState((p) => ({ ...p, phase3IntroSeen: false }))}
          onExplainModule={(t) => setExplainModuleType(t)}
          onDismissNotice={() => updateState((p) => ({ ...p, contextualNotice: null }))}
        />
      )}

      {/* Phase 3 Cinematic Intro & Animated 5-Step Construction Tutorial */}
      {state.screen === 'playing' &&
        state.phase === 3 &&
        !state.activePopup &&
        !state.phase3IntroSeen && (
          <BuildPhaseExperience
            roverName={state.roverName}
            onCompleteIntro={() =>
              updateState((p) => ({ ...p, phase3IntroSeen: true }), true)
            }
          />
        )}

      {/* Replayable Module Visual Explainer Modal */}
      {explainModuleType && (
        <ModuleExplainerModal
          type={explainModuleType}
          roverName={state.roverName}
          onClose={() => setExplainModuleType(null)}
        />
      )}

      {/* Tutorial Step Overlay */}
      {state.screen === 'tutorial' && (
        <TutorialOverlay
          roverName={state.roverName}
          tutorial={state.tutorial}
          nearTutorialRock={
            Math.hypot(state.rover.x - ROCK_TARGETS[0].x, state.rover.z - ROCK_TARGETS[0].z) <= 5.5
          }
          onAdvanceStep={() => {
            setArrowGuide(null);
            handleAdvanceTutorial();
          }}
          onSkipTutorial={() => {
            setArrowGuide(null);
            handleCompleteTutorial();
          }}
          onCompleteTutorial={() => {
            setArrowGuide(null);
            handleCompleteTutorial();
          }}
          onHighlightAction={(stepId, hintLvl) => {
            audioEngine.playRoverChirp();
            setTutorialHighlightActive(true);
            const stepInfo = TUTORIAL_STEPS[stepId];
            if (stepInfo) {
              setArrowGuide({ targetKey: stepInfo.highlightTarget, label: 'Try This!' });
              const hint = stepInfo.progressiveHints[Math.min(2, hintLvl - 1)];
              if (hint) audioEngine.speak(hint, 'encouraging');
            }
          }}
          onRepeatStep={handleRepeatTutorialStep}
        />
      )}

      {/* Hold-to-Scan Laser Spectrometer Modal */}
      {holdScanTarget && (
        <HoldScanModal
          target={holdScanTarget}
          roverName={state.roverName}
          onCancel={() => setHoldScanTarget(null)}
          onComplete={(target) => {
            setHoldScanTarget(null);
            audioEngine.playDiscovery();
            const media = getNasaMediaForTargetKind(target.kind);
            if (stateRef.current.screen === 'tutorial') {
              audioEngine.speak(target.astroReaction, 'excited');
              setInspectedObject({
                item: media,
                title: target.scienceTitle,
                badge: 'Scan Complete ✓',
              });
            }
            updateState((prev) => {
              const reward = target.resourceReward ?? {};
              const nextResources = {
                ...prev.resources,
                waterIceClues: prev.resources.waterIceClues + (reward.waterIceClues ?? 0),
                processedWater: prev.resources.processedWater + (reward.waterIceClues ?? 0),
                regolith: prev.resources.regolith + (reward.regolith ?? 0),
                sunlightData: prev.resources.sunlightData + (reward.sunlightData ?? 0),
                sciencePoints: prev.resources.sciencePoints + (reward.sciencePoints ?? 0),
              };
              const scanned = prev.scannedTargetIds.includes(target.id)
                ? prev.scannedTargetIds
                : [...prev.scannedTargetIds, target.id];

              const popup =
                prev.screen === 'playing'
                  ? {
                      id: `discover_${target.id}`,
                      tone: 'discovery' as const,
                      badge: 'NEW DISCOVERY!',
                      title: target.scienceTitle,
                      astroLine: target.astroReaction,
                      astroMood: 'excited' as const,
                      whatIsHappening: target.scienceFact,
                      whyItMatters: 'Understanding Moon rocks helps us choose a safe astronaut home!',
                      steps: [],
                      whatHappensNext: 'Check your Objective Panel for the next landmark.',
                      ctaLabel: 'AWESOME!',
                      diagramKind: 'scanner' as const,
                      scienceCard: {
                        title: target.scienceTitle,
                        body: target.scienceFact,
                        sourceNote: 'NASA Artemis Lunar Geology Archive',
                      },
                    }
                  : null;

              return {
                ...prev,
                scannedTargetIds: scanned,
                resources: nextResources,
                routePlanning: EMPTY_ROUTE,
                tutorial:
                  prev.screen === 'tutorial' &&
                  prev.tutorial.step === 'scan_rock' &&
                  target.id === 'rock_tutorial_basalt'
                    ? { ...prev.tutorial, scannedRock: true }
                    : prev.tutorial,
                activePopup: popup,
              };
            }, true);
          }}
        />
      )}

      {/* Phase 2 Interactive Gameplay & Moon Processing Lab Modal */}
      {activityMode && (
        <ResourceActivityModal
          mode={activityMode}
          state={state}
          onToggleHeadlights={() => {
            const nextOn = !stateRef.current.rover.headlightsOn;
            audioEngine.playHeadlightsToggle(nextOn);
            updateState((p) => ({
              ...p,
              rover: { ...p.rover, headlightsOn: nextOn },
            }));
          }}
          onCompleteSoilScoop={(target: RockTarget) => {
            audioEngine.playInventoryCollect();
            flashInventoryPulse('1 Raw Soil');
            setActivityMode(null);
            updateState((p) => {
              const collected = p.collectedTargetIds.includes(target.id)
                ? p.collectedTargetIds
                : [...p.collectedTargetIds, target.id];
              const soilCount = collected.filter((id) => id.startsWith('target_regolith')).length;
              return {
                ...p,
                routePlanning: EMPTY_ROUTE,
                collectedTargetIds: collected,
                scannedTargetIds: Array.from(new Set([...p.scannedTargetIds, target.id])),
                resources: {
                  ...p.resources,
                  rawSoil: p.resources.rawSoil + 1,
                  sciencePoints: p.resources.sciencePoints + (target.resourceReward?.sciencePoints ?? 10),
                },
                butterfly: {
                  ...p.butterfly,
                  collectedExtraRegolith: p.butterfly.collectedExtraRegolith || soilCount >= 2,
                },
                contextualNotice: {
                  id: `scoop_${target.id}`,
                  tone: 'complete',
                  title: 'Raw Moon Soil Stored!',
                  message: 'Open Moon Lab at the bottom to bake soil into Regolith Units!',
                },
              };
            }, true);
          }}
          onCompleteCraterDrill={(target: RockTarget) => {
            const isDry = target.kind === 'dry_crater_probe';
            audioEngine.playInventoryCollect();
            flashInventoryPulse(isDry ? '1 Raw Soil' : '1 Ice Sample');
            setActivityMode(null);
            updateState((p) => {
              const collected = p.collectedTargetIds.includes(target.id)
                ? p.collectedTargetIds
                : [...p.collectedTargetIds, target.id];
              return {
                ...p,
                routePlanning: EMPTY_ROUTE,
                collectedTargetIds: collected,
                scannedTargetIds: Array.from(new Set([...p.scannedTargetIds, target.id])),
                scienceJournalIds:
                  !isDry && !p.scienceJournalIds.includes('sci_hydrogen_clues')
                    ? [...p.scienceJournalIds, 'sci_hydrogen_clues']
                    : p.scienceJournalIds,
                resources: {
                  ...p.resources,
                  rawSoil: p.resources.rawSoil + (isDry ? 1 : 0),
                  iceCoreSamples: p.resources.iceCoreSamples + (isDry ? 0 : 1),
                  sciencePoints: p.resources.sciencePoints + (target.resourceReward?.sciencePoints ?? 20),
                },
                contextualNotice: {
                  id: `drill_${target.id}`,
                  tone: isDry ? 'science' : 'complete',
                  title: isDry ? 'Dry Crater Core Tested' : 'Ice Sample Stored!',
                  message: isDry
                    ? 'That crater spot was dry dust! Try the Ice Investigation Spot deeper in the shadow!'
                    : 'Open Moon Lab to extract clean Processed Water from your Ice Sample!',
                },
              };
            }, true);
          }}
          onCompleteSolarTest={(target: RockTarget, angleDeg: number, ridgeWatts: number) => {
            audioEngine.playDiscovery();
            flashInventoryPulse('1 Solar Test');
            setActivityMode(null);
            updateState((p) => ({
              ...p,
              routePlanning: EMPTY_ROUTE,
              collectedTargetIds: p.collectedTargetIds.includes(target.id)
                ? p.collectedTargetIds
                : [...p.collectedTargetIds, target.id],
              scannedTargetIds: Array.from(new Set([...p.scannedTargetIds, target.id])),
              solarComparison: {
                ...p.solarComparison,
                ridgeAngleDeg: angleDeg,
                ridgeWattage: ridgeWatts,
                saved: true,
              },
              resources: {
                ...p.resources,
                solarSurveyCount: p.resources.solarSurveyCount + 1,
                sciencePoints: p.resources.sciencePoints + (target.resourceReward?.sciencePoints ?? 20),
              },
              contextualNotice: {
                id: 'solar_saved',
                tone: 'complete',
                title: `Solar Tilt Saved (${ridgeWatts} W)!`,
                message: 'Open Moon Lab to turn your survey into calibrated Solar Power Kits!',
              },
            }), true);
          }}
          onProcessSoil={() => {
            audioEngine.playResourceProcess();
            flashInventoryPulse('15 Regolith Units');
            updateState((p) => {
              if (p.resources.rawSoil < 1) return p;
              return {
                ...p,
                processedSampleCount: p.processedSampleCount + 1,
                resources: {
                  ...p.resources,
                  rawSoil: p.resources.rawSoil - 1,
                  regolith: p.resources.regolith + 15,
                  sciencePoints: p.resources.sciencePoints + 10,
                },
              };
            }, true);
          }}
          onProcessWater={() => {
            audioEngine.playResourceProcess();
            flashInventoryPulse('2 Processed Water');
            updateState((p) => {
              if (p.resources.iceCoreSamples < 1) return p;
              const nextWater = p.resources.waterIceClues + 2;
              return {
                ...p,
                processedSampleCount: p.processedSampleCount + 1,
                butterfly: {
                  ...p.butterfly,
                  processedExtraWater: p.butterfly.processedExtraWater || nextWater >= 2,
                },
                resources: {
                  ...p.resources,
                  iceCoreSamples: p.resources.iceCoreSamples - 1,
                  waterIceClues: nextWater,
                  processedWater: p.resources.processedWater + 2,
                  sciencePoints: p.resources.sciencePoints + 15,
                },
              };
            }, true);
          }}
          onProcessSolar={() => {
            audioEngine.playResourceProcess();
            flashInventoryPulse('2 Solar Kits');
            updateState((p) => {
              if (p.resources.solarSurveyCount < 1) return p;
              return {
                ...p,
                processedSampleCount: p.processedSampleCount + 1,
                resources: {
                  ...p.resources,
                  solarSurveyCount: p.resources.solarSurveyCount - 1,
                  sunlightData: p.resources.sunlightData + 2,
                  storedEnergy: p.resources.storedEnergy + 25,
                  sciencePoints: p.resources.sciencePoints + 15,
                },
              };
            }, true);
          }}
          onClose={() => setActivityMode(null)}
        />
      )}

      {/* Phase 4 Cinematic Intro, Teach-Before-Emergency Lessons, Step 7 Result Cards & Live Survival Console */}
      {state.screen === 'playing' &&
        state.phase === 4 &&
        !state.activePopup &&
        (state.survival.resolvedChallenges.length < 5 ||
          Boolean(state.survival.lastResolvedChallenge)) && (
          <>
            {!state.phase4IntroSeen ? (
              <SurvivePhaseIntro
                state={state}
                onContinue={() =>
                  updateState((p) => ({ ...p, phase4IntroSeen: true }), true)
                }
              />
            ) : state.survival.lastResolvedChallenge ? (
              <SurvivalChallengeResultModal
                challengeId={state.survival.lastResolvedChallenge}
                roverName={state.roverName}
                isFinal={state.survival.resolvedChallenges.length >= 5}
                onContinue={() => {
                  audioEngine.playClick();
                  updateState(
                    (p) => ({
                      ...p,
                      survival: { ...p.survival, lastResolvedChallenge: null },
                    }),
                    true
                  );
                }}
              />
            ) : !state.survival.overviewSeen ? (
              <SurvivalChallengeModal
                state={state}
                onStartSimulation={() => {
                  audioEngine.playClick();
                  updateState(
                    (p) => ({
                      ...p,
                      survival: { ...p.survival, overviewSeen: true, stationVisited: false },
                    }),
                    true
                  );
                }}
                onVisitStation={() => {}}
                onAction={() => {}}
              />
            ) : state.survival.activeChallenge &&
              !state.survival.taughtChallenges.includes(state.survival.activeChallenge) ? (
              <SurvivalScenarioLesson
                challengeId={state.survival.activeChallenge}
                state={state}
                onStartActivity={() => {
                  const ch = state.survival.activeChallenge;
                  if (!ch) return;
                  audioEngine.playMissionAlert();
                  const info = PHASE4_CHALLENGES.find((c) => c.id === ch);
                  if (info) {
                    audioEngine.speak(info.astroAlert, 'urgent');
                  }
                  updateState(
                    (p) => ({
                      ...p,
                      survival: {
                        ...p.survival,
                        taughtChallenges: Array.from(new Set([...p.survival.taughtChallenges, ch])),
                        stationVisited: false,
                      },
                    }),
                    true
                  );
                }}
              />
            ) : (
              <SurvivalChallengeModal
                state={state}
                panelExpanded={phase4PanelExpanded}
                onTogglePanelExpanded={setPhase4PanelExpanded}
                onStartSimulation={() => {}}
                onReplayLesson={(chId) => {
                  audioEngine.stopSpeech();
                  audioEngine.playClick();
                  updateState((p) => ({
                    ...p,
                    survival: {
                      ...p.survival,
                      taughtChallenges: p.survival.taughtChallenges.filter((id) => id !== chId),
                    },
                  }));
                }}
                onVisitStation={(targetType: StructureType) => {
                  markProgress();
                  const cur = stateRef.current;
                  const placed = cur.structures.find((s) => s.type === targetType);
                  const fallback = getRecommendedOutpostSlots(cur.selectedOutpostSite).find(
                    (sl) => sl.type === targetType
                  );
                  const tx = placed?.x ?? fallback?.x ?? 20;
                  const tz = placed?.z ?? fallback?.z ?? 16;
                  controllerRef.current?.focusStationPoint(tx, tz);
                  audioEngine.playRoverChirp();
                  updateState((p) => ({
                    ...p,
                    survival: { ...p.survival, stationVisited: true },
                    contextualNotice: {
                      id: `visited_${targetType}`,
                      tone: 'complete',
                      title: `${STRUCTURES[targetType].name} Inspected!`,
                      message: 'Controls unlocked—fix the station below!',
                    },
                  }));
                }}
                onAction={(act) => {
                  markProgress();
                  if (act === 'p1_non_essential_off') {
                    audioEngine.playClick();
                    updateState((p) => ({ ...p, survival: { ...p.survival, nonEssentialOff: true } }));
                  } else if (act === 'p1_backup_battery') {
                    audioEngine.playDiscovery();
                    updateState(
                      (p) => ({
                        ...p,
                        survival: {
                          ...p.survival,
                          backupBatteryActive: true,
                          batteryDrainPct: 90,
                          powerMode: 'life_support_priority',
                          stationVisited: false,
                          lastResolvedChallenge: 'low_sunlight',
                          resolvedChallenges: [...p.survival.resolvedChallenges, 'low_sunlight'],
                          activeChallenge: 'extreme_temperature',
                        },
                      }),
                      true
                    );
                  } else if (act === 'p2_close_radiator') {
                    audioEngine.playClick();
                    updateState((p) => ({
                      ...p,
                      survival: { ...p.survival, radiatorClosed: true, habitatTempC: Math.max(14, p.survival.habitatTempC) },
                    }));
                  } else if (act === 'p2_boost_heaters') {
                    audioEngine.playDiscovery();
                    updateState(
                      (p) => ({
                        ...p,
                        survival: {
                          ...p.survival,
                          heaterBoosted: true,
                          habitatTempC: 21,
                          stationVisited: false,
                          lastResolvedChallenge: 'extreme_temperature',
                          resolvedChallenges: [...p.survival.resolvedChallenges, 'extreme_temperature'],
                          activeChallenge: 'water_shortage',
                        },
                      }),
                      true
                    );
                  } else if (act === 'p3_tighten_valve') {
                    audioEngine.playBuild();
                    updateState((p) => ({
                      ...p,
                      survival: { ...p.survival, waterValveFixed: true, waterTankPct: Math.max(58, p.survival.waterTankPct) },
                    }));
                  } else if (act === 'p3_open_reserve') {
                    audioEngine.playDiscovery();
                    updateState(
                      (p) => ({
                        ...p,
                        survival: {
                          ...p.survival,
                          waterReserveUsed: true,
                          waterTankPct: p.butterfly.processedExtraWater ? 96 : 82,
                          stationVisited: false,
                          lastResolvedChallenge: 'water_shortage',
                          resolvedChallenges: [...p.survival.resolvedChallenges, 'water_shortage'],
                          activeChallenge: 'life_support',
                        },
                      }),
                      true
                    );
                  } else if (act === 'p4_scrubber_step') {
                    audioEngine.playClick();
                    updateState((p) => {
                      if (p.survival.lifeSupportStep < 2) {
                        return {
                          ...p,
                          survival: { ...p.survival, lifeSupportStep: p.survival.lifeSupportStep + 1 },
                        };
                      }
                      audioEngine.playDiscovery();
                      return {
                        ...p,
                        survival: {
                          ...p.survival,
                          lifeSupportStep: 3,
                          co2LevelPct: 0.4,
                          oxygenLevelPct: 20.8,
                          stationVisited: false,
                          lastResolvedChallenge: 'life_support',
                          resolvedChallenges: [...p.survival.resolvedChallenges, 'life_support'],
                          activeChallenge: 'solar_particle_event',
                        },
                      };
                    }, true);
                  } else if (act === 'p5_check_weather') {
                    audioEngine.playClick();
                    updateState((p) => ({
                      ...p,
                      survival: { ...p.survival, spaceWeatherChecked: true },
                    }));
                  } else if (act === 'p5_shelter_crew') {
                    audioEngine.playClick();
                    updateState((p) => ({
                      ...p,
                      survival: { ...p.survival, crewSheltered: true },
                    }));
                  } else if (act === 'p5_close_shutters') {
                    audioEngine.playPhaseComplete();
                    updateState(
                      (p) => ({
                        ...p,
                        survival: {
                          ...p.survival,
                          shieldShutterClosed: true,
                          radiationLevel: 12,
                          stationVisited: false,
                          lastResolvedChallenge: 'solar_particle_event',
                          outpostSafetyPct: p.butterfly.installedRegolithShielding
                            ? p.survival.outpostSafetyPct
                            : Math.max(78, p.survival.outpostSafetyPct - 6),
                          resolvedChallenges: [...p.survival.resolvedChallenges, 'solar_particle_event'],
                          activeChallenge: null,
                        },
                      }),
                      true
                    );
                  }
                }}
              />
            )}
          </>
        )}

      {/* Phase 1-4 Interactive Guide Modal */}
      {phaseGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={PHASE_TUTORIALS[state.phase].title}
            className="max-w-lg w-full rounded-3xl bg-[#081020] border-2 border-sky-400 p-5 sm:p-6 shadow-2xl space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                Interactive Phase Guide
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioEngine.speak(PHASE_TUTORIALS[state.phase].astroBrief, 'warm')}
                  className="btn-space btn-space-xs btn-space-slate gap-1 text-sky-200"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Hear ASTRO
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseGuideOpen(false)}
                  aria-label="Close phase guide"
                  className="btn-space btn-space-icon btn-space-slate"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="font-hero text-2xl text-white">
              {PHASE_TUTORIALS[state.phase].title}
            </h2>
            <p className="text-sm text-sky-100 bg-sky-500/15 border border-sky-400/40 rounded-2xl px-3.5 py-2.5">
              <strong className="text-amber-300 mr-1">{state.roverName}:</strong>
              “{PHASE_TUTORIALS[state.phase].astroBrief}”
            </p>

            <ul className="space-y-1.5 text-sm text-slate-100 bg-slate-900 rounded-2xl p-3.5 border border-slate-800">
              {PHASE_TUTORIALS[state.phase].steps.map((st, idx) => (
                <li key={st} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{st}</span>
                </li>
              ))}
            </ul>

            {phaseHintLevel > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-xs text-amber-100">
                <strong className="text-amber-300 mr-1">Hint {phaseHintLevel}/3:</strong>
                {PHASE_TUTORIALS[state.phase].progressiveHints[Math.min(2, phaseHintLevel - 1)]}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextLvl = phaseHintLevel >= 3 ? 1 : phaseHintLevel + 1;
                  setPhaseHintLevel(nextLvl);
                  audioEngine.speak(
                    PHASE_TUTORIALS[state.phase].progressiveHints[nextLvl - 1],
                    'encouraging'
                  );
                }}
                className="btn-space btn-space-sm btn-space-amber-soft flex-1 gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                {phaseHintLevel === 0 ? 'Need Help?' : `Next Hint (${phaseHintLevel}/3)`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhaseGuideOpen(false);
                  const { steps } = getPhaseMissionSteps(state);
                  const active = steps.find((s) => !s.completed);
                  setArrowGuide({
                    targetKey: active?.guideTarget ?? PHASE_TUTORIALS[state.phase].guideTarget,
                    label: 'Tap Here!',
                  });
                }}
                className="btn-space btn-space-sm btn-space-emerald flex-1 font-bold"
              >
                Show Visual Arrow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {state.activePopup && (
        <TaskPopupModal
          popup={state.activePopup}
          roverName={state.roverName}
          nasaItem={
            state.activePopup.id.startsWith('discover_')
              ? (() => {
                  const tid = state.activePopup.id.replace('discover_', '');
                  const found = ROCK_TARGETS.find((r) => r.id === tid);
                  return found ? getNasaMediaForTargetKind(found.kind) : null;
                })()
              : null
          }
          onClose={() => {
            markProgress();
            audioEngine.stopSpeech();
            audioEngine.playClick();
            const closedId = state.activePopup?.id;
            updateState((p) => {
              if (closedId === 'phase_2_intro' && !p.seenTaskPopups.includes('task_find_water_ice')) {
                return {
                  ...p,
                  seenTaskPopups: [...p.seenTaskPopups, 'task_find_water_ice'],
                  activePopup: TASK_POPUPS.task_find_water_ice,
                };
              }
              return { ...p, activePopup: null };
            });
          }}
          onReplayVoice={() => audioEngine.replaySpeech()}
        />
      )}

      {showOutpostPicker && (
        <OutpostSiteModal
          roverName={state.roverName}
          defaultShowTutorial={!sitePickerTutorialSeen}
          onInspectSite={(siteId) => {
            setSitePickerTutorialSeen(true);
            setShowOutpostPicker(false);
            const s = OUTPOST_SITES.find((o) => o.id === siteId);
            if (s) {
              controllerRef.current?.focusCandidateSite(s.x, s.z);
              audioEngine.playRoverChirp();
            }
            updateState((p) => ({
              ...p,
              contextualNotice: {
                id: `inspect_${siteId}`,
                tone: 'science',
                title: s?.name ?? 'Candidate Site',
                message: 'Orbit in 3D to check sunlight & terrain, then tap Choose Outpost Site!',
              },
            }));
          }}
          onSelectSite={(siteId) => {
            setSitePickerTutorialSeen(true);
            audioEngine.playDiscovery();
            setShowOutpostPicker(false);
            updateState(
              (p) => ({
                ...p,
                selectedOutpostSite: siteId,
                butterfly: { ...p.butterfly, chosenOutpostSite: siteId },
                contextualNotice: {
                  id: 'site_chosen',
                  tone: 'complete',
                  title: 'Outpost Site Chosen!',
                  message:
                    siteId === 'ridge_haven'
                      ? 'Sunlit Peak Ridge chosen—strong sunlight awaits your solar arrays!'
                      : 'Shadow Rim Terrace chosen—super close to freezing crater probes!',
                },
              }),
              true
            );
          }}
          onClose={() => {
            setSitePickerTutorialSeen(true);
            setShowOutpostPicker(false);
          }}
        />
      )}

      {showMap && (
        <MissionMapModal
          state={state}
          onClose={() => setShowMap(false)}
          onInspectFeature={() => {
            markProgress();
            updateState((p) => ({
              ...p,
              tutorial:
                p.screen === 'tutorial' && p.tutorial.step === 'learn_map'
                  ? { ...p.tutorial, inspectedMapTarget: true }
                  : p.tutorial,
            }));
          }}
          onDrawPathPoints={handleDrawFromMap}
          onStartRoute={handleStartRoute}
          onClearRoute={() =>
            updateState((p) => ({
              ...p,
              routePlanning: { ...p.routePlanning, rawPoints: [], validation: null },
            }))
          }
        />
      )}

      {showJournal && (
        <ScienceJournalModal
          unlockedIds={state.scienceJournalIds}
          onClose={() => setShowJournal(false)}
        />
      )}

      {showRoverStatus && (
        <RoverStatusModal
          state={state}
          onRepairDust={() => {
            audioEngine.playRoverChirp();
            updateState((p) => ({
              ...p,
              rover: {
                ...p.rover,
                dustLevel: 0,
                repairKits: Math.max(0, p.rover.repairKits - 1),
                lastIssue: null,
              },
              butterfly: { ...p.butterfly, cleanedDustySensors: true },
              contextualNotice: {
                id: 'lens_cleaned',
                tone: 'complete',
                title: 'Sensors Sparkling Clean!',
                message: 'Cameras and solar panels are crystal clear again!',
              },
            }), true);
          }}
          onRechargeBattery={() => {
            audioEngine.playDiscovery();
            updateState((p) => ({
              ...p,
              rover: {
                ...p.rover,
                battery: 100,
                lastIssue: p.rover.lastIssue?.id === 'low_battery' ? null : p.rover.lastIssue,
              },
              contextualNotice: {
                id: 'recharged',
                tone: 'complete',
                title: 'Battery Recharged!',
                message: 'Solar panels topped up battery to 100%!',
              },
            }), true);
          }}
          onRepairWheels={() => {
            audioEngine.playBuild();
            updateState((p) => ({
              ...p,
              rover: {
                ...p.rover,
                health: 100,
                repairKits: Math.max(0, p.rover.repairKits - 1),
                lastIssue: null,
              },
              contextualNotice: {
                id: 'wheels_repaired',
                tone: 'complete',
                title: 'Wheels Aligned!',
                message: 'Rocker-bogie suspension is sturdy and ready for rocky trails!',
              },
            }), true);
          }}
          onClose={() => setShowRoverStatus(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          state={state}
          onUpdateAudio={(patch) =>
            updateState((p) => ({ ...p, audio: { ...p.audio, ...patch } }))
          }
          onReplayIntro={() => {
            setShowSettings(false);
            audioEngine.resetPlayedKeys();
            updateState((p) => ({ ...p, screen: 'intro', introScene: 0 }));
          }}
          onResetGame={() => {
            setShowSettings(false);
            handleStartFresh();
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Pause Modal */}
      {state.screen === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mission Paused"
            className="max-w-sm w-full rounded-3xl bg-[#081020] border-2 border-sky-400 p-6 shadow-2xl space-y-3 text-center"
          >
            <h2 className="font-hero font-bold text-2xl text-white tracking-wide">Mission Paused</h2>
            <p className="text-sm text-slate-300">
              {state.roverName} is standing by safely on the Moon.
            </p>
            <button
              type="button"
              onClick={() =>
                updateState((p) => ({
                  ...p,
                  screen: p.tutorialCompleted ? 'playing' : 'tutorial',
                }))
              }
              className="btn-space btn-space-emerald btn-space-md w-full font-display font-bold text-base"
            >
              Resume Mission
            </button>
            <button
              type="button"
              onClick={() => {
                const saved = saveGameState(state);
                setSavedSnapshot(saved);
                updateState((p) => ({ ...p, screen: 'title' }));
              }}
              className="btn-space btn-space-slate btn-space-md w-full text-sm"
            >
              Save & Return to Title
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="btn-space btn-space-slate btn-space-md w-full text-sm"
            >
              Audio & Accessibility
            </button>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {state.screen === 'victory' && (
        <VictoryModal state={state} onPlayAgain={handleStartFresh} />
      )}

      {/* Centralized Non-Obstructive ASTRO Voice Overlay */}
      <VoiceOverlay
        screen={state.screen}
        phase={state.phase}
        roverName={state.roverName}
        captionsEnabled={state.audio.captionsEnabled}
        hasBlockingModal={Boolean(
          state.activePopup ||
            showMap ||
            showJournal ||
            showSettings ||
            showRoverStatus ||
            showOutpostPicker ||
            activityMode ||
            holdScanTarget ||
            phaseGuideOpen ||
            explainModuleType ||
            (state.screen === 'playing' && state.phase === 3 && !state.phase3IntroSeen) ||
            (state.screen === 'playing' &&
              state.phase === 4 &&
              (!state.phase4IntroSeen || !state.survival.overviewSeen))
        )}
        onToggleMute={() =>
          updateState((p) => ({ ...p, audio: { ...p.audio, muted: !p.audio.muted } }))
        }
      />

      {/* On-Demand Visual Arrow Guide */}
      <VisualArrowGuide
        targetKey={
          state.screen === 'tutorial' || state.screen === 'playing'
            ? arrowGuide?.targetKey ?? null
            : null
        }
        label={arrowGuide?.label}
      />
    </div>
  );
}
