import { AstroMood } from './types';
import {
  DEFAULT_STORYTELLER_VOICE_ID,
  NarrationSnapshot,
  createInitialNarrationSnapshot,
  estimateSpeechDurationMs,
  getConsistentProsody,
  normalizeNarrationText,
  prepareNativeSpeechText,
  resolveConsistentSpeechVoice,
  shouldDeduplicateNarration,
} from './narrationState';

type MusicMode = 'none' | 'intro' | 'explore' | 'alert';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private narrationGain: GainNode | null = null;

  private muted = false;
  private volume = 0.8;
  private narrationVolume = 0.9;
  private musicVolume = 0.45;
  private sfxVolume = 0.75;
  private voiceEnabled = true;

  private lastSpokenText = '';
  private lastSpokenMood: AstroMood = 'warm';
  private lastActiveKey: string | null = null;
  private speechToken = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private cancelPollTimer: number | null = null;
  private activeWatchdog: number | null = null;
  private activeFinishCb: (() => void) | null = null;
  private watchdogRemainingMs = 0;
  private watchdogStartedAtMs = 0;
  private paused = false;
  private narrationPaused = false;
  private playedKeys = new Set<string>();
  private voiceId = DEFAULT_STORYTELLER_VOICE_ID;
  private lockedVoiceKey: string | null = null;
  private speechQueue: Array<{
    text: string;
    mood: AstroMood;
    onFinished?: () => void;
    activeKey?: string | null;
  }> = [];
  private lastDriveSfxTime = 0;

  // Ambient space music scheduler
  private musicMode: MusicMode = 'none';
  private musicTimer: number | null = null;
  private musicStep = 0;

  // Continuous hold-action sound handles (strict single-instance guards)
  private scanLoopTimer: number | null = null;
  private drillLoopTimer: number | null = null;
  private scoopLoopTimer: number | null = null;
  private drillHumOsc: OscillatorNode | null = null;
  private drillHumGain: GainNode | null = null;

  // Reactive narration state + autoplay block tracking
  private autoplayBlocked = false;
  private autoplayListeners = new Set<(blocked: boolean) => void>();
  private narrationState: NarrationSnapshot = createInitialNarrationSnapshot();
  private narrationListeners = new Set<(snap: NarrationSnapshot) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshLockedVoice();
      try {
        window.speechSynthesis.addEventListener?.('voiceschanged', () => {
          this.refreshLockedVoice();
        });
      } catch {
        // Ignore older browsers without addEventListener on speechSynthesis
      }
    }
  }

  private refreshLockedVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    try {
      const voices = window.speechSynthesis.getVoices();
      const { voice, voiceKey } = resolveConsistentSpeechVoice(voices, this.lockedVoiceKey);
      if (voice && voiceKey) {
        this.lockedVoiceKey = voiceKey;
        this.voiceId = voice.name;
      }
      return voice;
    } catch {
      return null;
    }
  }

  public syncProviderHealth(): Promise<void> {
    this.refreshLockedVoice();
    return Promise.resolve();
  }

  private emitNarration(patch: Partial<NarrationSnapshot>) {
    this.narrationState = {
      ...this.narrationState,
      ...patch,
      muted: this.muted,
      voiceEnabled: this.voiceEnabled,
      autoplayBlocked: this.autoplayBlocked,
      voiceId: this.voiceId,
    };
    const snapshot = this.narrationState;
    for (const cb of this.narrationListeners) {
      cb(snapshot);
    }
  }

  public getNarrationSnapshot(): NarrationSnapshot {
    return this.narrationState;
  }

  public subscribeNarration(cb: (snap: NarrationSnapshot) => void): () => void {
    this.narrationListeners.add(cb);
    cb(this.narrationState);
    return () => {
      this.narrationListeners.delete(cb);
    };
  }

  private setAutoplayBlocked(blocked: boolean) {
    if (this.autoplayBlocked === blocked) return;
    this.autoplayBlocked = blocked;
    for (const cb of this.autoplayListeners) {
      cb(blocked);
    }
    this.emitNarration({ autoplayBlocked: blocked });
  }

  public isAutoplayBlocked(): boolean {
    return this.autoplayBlocked;
  }

  public onAutoplayBlockedChange(cb: (blocked: boolean) => void): () => void {
    this.autoplayListeners.add(cb);
    cb(this.autoplayBlocked);
    return () => {
      this.autoplayListeners.delete(cb);
    };
  }

  public async unlockUserGesture(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore
      }
    }
    this.setAutoplayBlocked(false);
    if (this.lastSpokenText && !this.muted && this.voiceEnabled) {
      this.replaySpeech();
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.narrationGain = this.ctx.createGain();

      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);
      this.narrationGain.connect(this.ctx.destination);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        this.setAutoplayBlocked(true);
      });
    }
    return this.ctx;
  }

  private applyGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const master = this.muted ? 0 : this.volume;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(master * this.sfxVolume, now, 0.04);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(master * this.musicVolume * 0.28, now, 0.12);
    }
    if (this.narrationGain) {
      this.narrationGain.gain.setTargetAtTime(master * this.narrationVolume, now, 0.04);
    }
  }

  public setSettings(opts: {
    muted: boolean;
    volume: number;
    narrationVolume?: number;
    musicVolume?: number;
    sfxVolume?: number;
    voiceEnabled: boolean;
  }) {
    this.muted = opts.muted;
    this.volume = Math.max(0, Math.min(1, opts.volume));
    if (typeof opts.narrationVolume === 'number') {
      this.narrationVolume = Math.max(0, Math.min(1, opts.narrationVolume));
    }
    if (typeof opts.musicVolume === 'number') {
      this.musicVolume = Math.max(0, Math.min(1, opts.musicVolume));
    }
    if (typeof opts.sfxVolume === 'number') {
      this.sfxVolume = Math.max(0, Math.min(1, opts.sfxVolume));
    }
    this.voiceEnabled = opts.voiceEnabled;
    this.applyGains();
    if (this.muted) {
      this.stopScanSound();
      this.stopDrillSound();
      this.stopScoopSound();
    }
    if (this.muted || !this.voiceEnabled) {
      this.stopSpeech();
    } else {
      this.emitNarration({});
    }
  }

  public setMusicMode(mode: MusicMode) {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (mode === 'none' || typeof window === 'undefined') return;

    this.musicStep = 0;
    const intervalMs = mode === 'intro' ? 2400 : mode === 'alert' ? 1600 : 2000;
    this.musicTimer = window.setInterval(() => {
      if (this.paused || this.muted || this.musicVolume < 0.02 || !this.ctx || this.ctx.state !== 'running') {
        return;
      }
      this.playMusicPhrase(mode);
    }, intervalMs);
  }

  private playMusicPhrase(mode: MusicMode) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;

    const introChords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0], // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 392.0], // G6
    ];
    const exploreNotes = [392.0, 440.0, 523.25, 659.25, 587.33, 493.88];
    const alertNotes = [220.0, 261.63, 246.94, 293.66];

    const now = ctx.currentTime;
    if (mode === 'intro') {
      const chord = introChords[this.musicStep % introChords.length];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);
        osc.connect(g);
        g.connect(this.musicGain!);
        osc.start(now);
        osc.stop(now + 2.35);
      });
    } else if (mode === 'explore') {
      const n1 = exploreNotes[this.musicStep % exploreNotes.length];
      const n2 = exploreNotes[(this.musicStep + 2) % exploreNotes.length];
      [n1, n2].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const t0 = now + idx * 0.45;
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.055, t0 + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.35);
        osc.connect(g);
        g.connect(this.musicGain!);
        osc.start(t0);
        osc.stop(t0 + 1.4);
      });
    } else if (mode === 'alert') {
      const freq = alertNotes[this.musicStep % alertNotes.length];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 0.5, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.07, now + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
      osc.connect(g);
      g.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + 1.5);
    }

    this.musicStep++;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    slideToFreq?: number,
    delaySec = 0
  ) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideToFreq), now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, gainPeak), now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + durationSec + 0.03);
  }

  public playClick() {
    this.playTone(540, 0.06, 'triangle', 0.09, 680);
  }

  public playRoverChirp() {
    this.playTone(560, 0.07, 'sine', 0.1, 820, 0);
    this.playTone(820, 0.1, 'sine', 0.1, 1060, 0.07);
  }

  public playRoverDrivePulse(speedFactor: number, looseDust: boolean) {
    if (this.muted || speedFactor < 0.2) return;
    const now = performance.now();
    if (now - this.lastDriveSfxTime < 220) return;
    this.lastDriveSfxTime = now;
    // Gentle electric wheel servo hum (no wind!)
    this.playTone(95 + speedFactor * 42, 0.12, 'triangle', 0.035, 115 + speedFactor * 35);
    if (looseDust) {
      this.playTone(170, 0.06, 'sine', 0.025, 120, 0.04);
    }
  }

  public playHeadlightsToggle(on: boolean) {
    if (on) {
      this.playTone(440, 0.06, 'square', 0.05, 880, 0);
      this.playTone(880, 0.1, 'sine', 0.08, 1100, 0.04);
    } else {
      this.playTone(620, 0.08, 'sine', 0.07, 340, 0);
    }
  }

  public playArmMove() {
    this.playTone(190, 0.18, 'sawtooth', 0.045, 290, 0);
    this.playTone(420, 0.09, 'triangle', 0.06, 480, 0.12);
  }

  /** Continuous non-overlapping Hold-to-Scoop robotic arm servo loop */
  public startScoopSound() {
    if (this.muted || this.paused || this.scoopLoopTimer !== null || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    let step = 0;
    const fire = () => {
      if (this.muted || this.paused) return;
      const base = 180 + (step % 4) * 32;
      this.playTone(base, 0.14, 'triangle', 0.055, base * 1.18, 0);
      this.playTone(340 + (step % 3) * 40, 0.09, 'sine', 0.04, 380, 0.06);
      step++;
    };
    fire();
    this.scoopLoopTimer = window.setInterval(fire, 210);
  }

  public stopScoopSound() {
    if (this.scoopLoopTimer !== null) {
      window.clearInterval(this.scoopLoopTimer);
      this.scoopLoopTimer = null;
    }
  }

  public playDrillPulse() {
    this.playTone(135, 0.12, 'sawtooth', 0.07, 110, 0);
    this.playTone(165, 0.12, 'sawtooth', 0.07, 140, 0.12);
    this.playTone(520, 0.14, 'sine', 0.08, 760, 0.24);
  }

  /** Continuous non-overlapping Hold-to-Scan loop */
  public startScanSound() {
    if (this.muted || this.paused || this.scanLoopTimer !== null || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    let step = 0;
    const fire = () => {
      if (this.muted || this.paused) return;
      const base = 420 + (step % 5) * 85;
      this.playTone(base, 0.19, 'sine', 0.085, base * 1.25, 0);
      this.playTone(base * 1.5, 0.14, 'triangle', 0.045, base * 1.75, 0.05);
      step++;
    };
    fire();
    this.scanLoopTimer = window.setInterval(fire, 240);
  }

  public stopScanSound() {
    if (this.scanLoopTimer !== null) {
      window.clearInterval(this.scanLoopTimer);
      this.scanLoopTimer = null;
    }
  }

  /** Continuous non-overlapping Hold-to-Drill motor + crater grind loop */
  public startDrillSound() {
    if (this.muted || this.paused || this.drillLoopTimer !== null || typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    this.stopDrillSound();
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(92, ctx.currentTime);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.06);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start();
      this.drillHumOsc = osc;
      this.drillHumGain = g;
    } catch {
      // Ignore audio hardware quirk
    }

    let step = 0;
    this.drillLoopTimer = window.setInterval(() => {
      if (this.muted || this.paused) return;
      const f = step % 2 === 0 ? 128 : 146;
      this.playTone(f, 0.11, 'triangle', 0.055, f * 0.85, 0);
      step++;
    }, 145);
  }

  public stopDrillSound() {
    if (this.drillLoopTimer !== null) {
      window.clearInterval(this.drillLoopTimer);
      this.drillLoopTimer = null;
    }
    if (this.drillHumOsc && this.drillHumGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        this.drillHumGain.gain.setTargetAtTime(0.0001, t, 0.03);
        this.drillHumOsc.stop(t + 0.08);
      } catch {
        // Ignore
      }
    }
    this.drillHumOsc = null;
    this.drillHumGain = null;
  }

  public playInventoryCollect() {
    this.playTone(587.33, 0.08, 'sine', 0.11, 783.99, 0);
    this.playTone(880, 0.14, 'triangle', 0.11, 1174.66, 0.07);
  }

  public playResourceProcess() {
    this.playTone(280, 0.18, 'triangle', 0.09, 440, 0);
    this.playTone(523.25, 0.12, 'sine', 0.11, undefined, 0.18);
    this.playTone(783.99, 0.24, 'sine', 0.12, undefined, 0.28);
  }

  public playLabProcessStep(station: 'soil' | 'water' | 'solar', stepIndex: number) {
    if (this.muted || this.paused) return;
    if (station === 'soil') {
      const f = 165 + stepIndex * 55;
      this.playTone(f, 0.16, 'triangle', 0.06, f * 1.12, 0);
    } else if (station === 'water') {
      const f = 380 + stepIndex * 110;
      this.playTone(f, 0.14, 'sine', 0.055, f * 1.25, 0);
    } else {
      const f = 460 + stepIndex * 130;
      this.playTone(f, 0.13, 'sine', 0.055, f * 1.18, 0);
    }
  }

  public playScanSweep() {
    this.playTone(340, 0.34, 'sine', 0.11, 920, 0);
    this.playTone(680, 0.26, 'triangle', 0.08, 1280, 0.12);
  }

  public playDiscovery() {
    this.playTone(523.25, 0.13, 'triangle', 0.12, undefined, 0);
    this.playTone(659.25, 0.13, 'triangle', 0.12, undefined, 0.1);
    this.playTone(783.99, 0.15, 'triangle', 0.13, undefined, 0.2);
    this.playTone(1046.5, 0.3, 'sine', 0.14, undefined, 0.31);
  }

  public playGentleWarning() {
    this.playTone(392, 0.16, 'sine', 0.1, 330, 0);
    this.playTone(330, 0.22, 'sine', 0.09, 294, 0.16);
  }

  public playMissionAlert() {
    this.playTone(587.33, 0.14, 'triangle', 0.11, 440, 0);
    this.playTone(587.33, 0.16, 'triangle', 0.11, 440, 0.2);
  }

  public playBump() {
    this.playTone(150, 0.16, 'triangle', 0.14, 70);
  }

  public playBuild() {
    this.playTone(210, 0.11, 'triangle', 0.11, 320, 0);
    this.playTone(440, 0.14, 'sine', 0.11, 660, 0.08);
    this.playTone(659.25, 0.2, 'sine', 0.1, undefined, 0.18);
  }

  public playCableConnect() {
    this.playTone(480, 0.08, 'triangle', 0.1, 960, 0);
    this.playTone(740, 0.16, 'sine', 0.11, 1080, 0.07);
  }

  public playPhaseComplete() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, 'triangle', 0.12, undefined, idx * 0.09);
    });
  }

  private clearSpeechTimers() {
    if (this.cancelPollTimer !== null) {
      window.clearTimeout(this.cancelPollTimer);
      this.cancelPollTimer = null;
    }
    if (this.activeWatchdog !== null) {
      window.clearTimeout(this.activeWatchdog);
      this.activeWatchdog = null;
    }
    this.activeFinishCb = null;
    this.watchdogRemainingMs = 0;
    if (this.activeUtterance) {
      try {
        this.activeUtterance.onstart = null;
        this.activeUtterance.onend = null;
        this.activeUtterance.onerror = null;
        this.activeUtterance.onpause = null;
        this.activeUtterance.onresume = null;
      } catch {
        // Ignore
      }
      this.activeUtterance = null;
    }
  }

  private armWatchdog(ms: number, finish: () => void) {
    if (this.activeWatchdog !== null) {
      window.clearTimeout(this.activeWatchdog);
      this.activeWatchdog = null;
    }
    this.activeFinishCb = finish;
    this.watchdogRemainingMs = Math.max(200, ms);
    this.watchdogStartedAtMs = performance.now();
    if (!this.paused && !this.narrationPaused) {
      this.activeWatchdog = window.setTimeout(finish, this.watchdogRemainingMs);
    }
  }

  private duckMusic(ducked: boolean) {
    if (!this.ctx || !this.musicGain) return;
    const master = this.muted ? 0 : this.volume;
    const target = master * this.musicVolume * (ducked ? 0.12 : 0.28);
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }

  private waitForSynthIdle(token: number, cancelledActive: boolean, onReady: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onReady();
      return;
    }
    const synth = window.speechSynthesis;
    if (!cancelledActive && !synth.speaking && !synth.pending) {
      onReady();
      return;
    }
    const minSettleAt = performance.now() + (cancelledActive ? 50 : 0);
    const deadline = performance.now() + 240;
    const check = () => {
      if (this.speechToken !== token) return;
      const ready = !synth.speaking && !synth.pending && performance.now() >= minSettleAt;
      if (ready || performance.now() >= deadline) {
        if (synth.speaking || synth.pending) {
          try {
            synth.cancel();
          } catch {
            // Ignore
          }
        }
        this.cancelPollTimer = null;
        onReady();
        return;
      }
      this.cancelPollTimer = window.setTimeout(check, 20);
    };
    this.cancelPollTimer = window.setTimeout(check, cancelledActive ? 50 : 20);
  }

  /**
   * Authoritative ASTRO speech entrypoint using browser-native Web Speech API.
   * Guarantees strictly one active utterance at a time, cancels outdated speech
   * and waits for synth idle before speaking, locks a consistent female English voice,
   * and supports optional sequential queueing with zero overlap.
   */
  public speak(
    text: string,
    mood: AstroMood = 'warm',
    onFinished?: () => void,
    options?: { forceReplay?: boolean; activeKey?: string | null; queue?: boolean }
  ) {
    const cleanText = normalizeNarrationText(text);
    if (!cleanText) {
      onFinished?.();
      return;
    }

    if (!options?.forceReplay && shouldDeduplicateNarration(this.narrationState, cleanText)) {
      return;
    }

    if (options?.queue && (this.isSpeaking() || this.narrationState.status === 'paused')) {
      const lastQueued = this.speechQueue[this.speechQueue.length - 1];
      if (!lastQueued || normalizeNarrationText(lastQueued.text) !== cleanText) {
        this.speechQueue.push({
          text: cleanText,
          mood,
          onFinished,
          activeKey: options?.activeKey ?? null,
        });
      }
      return;
    }

    // New authoritative speech cancels any outdated queued lines from previous scenes/triggers
    this.speechQueue = [];
    this.startUtterance(cleanText, mood, onFinished, options?.activeKey);
  }

  public speakQueued(
    text: string,
    mood: AstroMood = 'warm',
    onFinished?: () => void,
    activeKey?: string | null
  ) {
    this.speak(text, mood, onFinished, { queue: true, activeKey });
  }

  private startUtterance(
    cleanText: string,
    mood: AstroMood,
    onFinished?: () => void,
    activeKey?: string | null
  ) {
    this.lastSpokenText = cleanText;
    this.lastSpokenMood = mood;
    if (activeKey !== undefined) {
      this.lastActiveKey = activeKey;
    }
    const hadActiveSpeech =
      this.activeUtterance !== null ||
      this.narrationState.status === 'loading' ||
      this.narrationState.status === 'playing' ||
      this.narrationState.status === 'paused' ||
      (typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        (window.speechSynthesis.speaking || window.speechSynthesis.pending));

    this.narrationPaused = false;
    const token = ++this.speechToken;
    this.stopSpeech(false);

    const estMs = estimateSpeechDurationMs(cleanText);

    const finish = () => {
      if (this.speechToken !== token) return;
      this.clearSpeechTimers();
      this.narrationPaused = false;

      const nextQueued = this.speechQueue.shift();
      if (nextQueued) {
        onFinished?.();
        this.startUtterance(nextQueued.text, nextQueued.mood, nextQueued.onFinished, nextQueued.activeKey);
        return;
      }

      this.duckMusic(false);
      this.emitNarration({
        status: 'idle',
        text: '',
        activeKey: null,
        error: null,
      });
      onFinished?.();
    };

    // Reading-time caption timing if muted, voice disabled, or speechSynthesis unsupported
    const synthSupported =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';

    if (this.muted || !this.voiceEnabled || !synthSupported) {
      this.emitNarration({
        status: this.paused || this.narrationPaused ? 'paused' : 'playing',
        text: cleanText,
        lastText: cleanText,
        mood,
        lastMood: mood,
        activeKey: activeKey ?? null,
        provider: 'silent',
        error: null,
        sequence: this.narrationState.sequence + 1,
      });
      this.armWatchdog(estMs, finish);
      return;
    }

    this.duckMusic(true);

    this.emitNarration({
      status: 'loading',
      text: cleanText,
      lastText: cleanText,
      mood,
      lastMood: mood,
      activeKey: activeKey ?? null,
      provider: 'webspeech',
      error: null,
      sequence: this.narrationState.sequence + 1,
    });

    this.waitForSynthIdle(token, hadActiveSpeech, () => {
      if (this.speechToken !== token) return;
      if (this.muted || !this.voiceEnabled) {
        finish();
        return;
      }

      const synth = window.speechSynthesis;
      const spokenText = prepareNativeSpeechText(cleanText);
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const voice = this.refreshLockedVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      const prosody = getConsistentProsody(mood);
      utterance.rate = prosody.rate;
      utterance.pitch = prosody.pitch;
      utterance.volume = Math.max(0, Math.min(1, (this.muted ? 0 : this.volume) * this.narrationVolume));

      utterance.onstart = () => {
        if (this.speechToken !== token || this.activeUtterance !== utterance) return;
        this.setAutoplayBlocked(false);
        this.emitNarration({
          status: this.paused || this.narrationPaused ? 'paused' : 'playing',
          provider: 'webspeech',
          error: null,
        });
      };

      utterance.onend = () => {
        if (this.speechToken !== token || this.activeUtterance !== utterance) return;
        finish();
      };

      utterance.onerror = (event) => {
        if (this.speechToken !== token || this.activeUtterance !== utterance) return;
        const errCode = (event as SpeechSynthesisErrorEvent | undefined)?.error;
        if (errCode === 'canceled' || errCode === 'interrupted') {
          return;
        }
        if (errCode === 'not-allowed') {
          this.narrationPaused = true;
          if (this.activeWatchdog !== null) {
            window.clearTimeout(this.activeWatchdog);
            this.activeWatchdog = null;
          }
          this.setAutoplayBlocked(true);
          this.emitNarration({ status: 'paused', error: null });
          return;
        }
        // Gracefully keep reading-time caption cadence if host lacks an OS speech voice
        this.activeUtterance = null;
        this.emitNarration({
          status: this.paused || this.narrationPaused ? 'paused' : 'playing',
          provider: 'silent',
          error: null,
        });
        this.armWatchdog(estMs, finish);
      };

      this.activeUtterance = utterance;
      this.emitNarration({
        status: this.paused || this.narrationPaused ? 'paused' : 'playing',
        provider: 'webspeech',
        error: null,
      });
      this.armWatchdog(Math.max(estMs + 8000, 15000), finish);

      try {
        synth.speak(utterance);
        if (this.paused || this.narrationPaused) {
          synth.pause();
        }
      } catch {
        this.activeUtterance = null;
        this.emitNarration({ provider: 'silent', error: null });
        this.armWatchdog(estMs, finish);
      }
    });
  }

  public isSpeaking(): boolean {
    if (
      this.narrationState.status === 'loading' ||
      this.narrationState.status === 'playing' ||
      this.activeUtterance !== null
    ) {
      return true;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        return window.speechSynthesis.speaking;
      } catch {
        return false;
      }
    }
    return false;
  }

  /** Speak only if ASTRO isn't currently mid-sentence on another critical prompt */
  public speakIfIdle(text: string, mood: AstroMood = 'warm', onFinished?: () => void): boolean {
    if (this.isSpeaking() || this.narrationState.status === 'paused') return false;
    this.speak(text, mood, onFinished);
    return true;
  }

  public hasPlayedKey(key: string): boolean {
    return this.playedKeys.has(key);
  }

  public resetPlayedKeys(): void {
    this.playedKeys.clear();
  }

  public markKeyPlayed(key: string): void {
    this.playedKeys.add(key);
  }

  public speakOnce(
    key: string,
    text: string,
    mood: AstroMood = 'warm',
    onFinished?: () => void
  ): boolean {
    const cleanText = normalizeNarrationText(text);
    if (this.playedKeys.has(key)) {
      this.lastSpokenText = cleanText;
      this.lastSpokenMood = mood;
      this.lastActiveKey = key;
      this.emitNarration({
        lastText: cleanText,
        lastMood: mood,
      });
      onFinished?.();
      return false;
    }
    this.playedKeys.add(key);
    this.speak(cleanText, mood, onFinished, { activeKey: key });
    return true;
  }

  public pauseNarration() {
    if (
      this.narrationPaused ||
      (this.narrationState.status !== 'playing' && this.narrationState.status !== 'loading')
    ) {
      return;
    }
    this.narrationPaused = true;
    if (this.activeWatchdog !== null) {
      window.clearTimeout(this.activeWatchdog);
      this.activeWatchdog = null;
      const elapsed = performance.now() - this.watchdogStartedAtMs;
      this.watchdogRemainingMs = Math.max(250, this.watchdogRemainingMs - elapsed);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
    this.emitNarration({ status: 'paused' });
  }

  public resumeNarration() {
    if (!this.narrationPaused || this.narrationState.status !== 'paused') return;
    this.narrationPaused = false;
    if (this.paused) return;
    if (this.activeFinishCb && this.watchdogRemainingMs > 0) {
      this.watchdogStartedAtMs = performance.now();
      this.activeWatchdog = window.setTimeout(this.activeFinishCb, this.watchdogRemainingMs);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
        this.setAutoplayBlocked(false);
      } catch {
        // Ignore
      }
    }
    if (this.narrationState.text) {
      this.emitNarration({ status: 'playing' });
    }
  }

  public toggleNarrationPause() {
    if (this.narrationState.status === 'paused' || this.narrationPaused) {
      this.resumeNarration();
    } else if (this.narrationState.status === 'playing' || this.narrationState.status === 'loading') {
      this.pauseNarration();
    }
  }

  public pauseAll() {
    if (this.paused) return;
    this.paused = true;
    this.stopScanSound();
    this.stopDrillSound();
    this.stopScoopSound();
    if (this.activeWatchdog !== null) {
      window.clearTimeout(this.activeWatchdog);
      this.activeWatchdog = null;
      const elapsed = performance.now() - this.watchdogStartedAtMs;
      this.watchdogRemainingMs = Math.max(250, this.watchdogRemainingMs - elapsed);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {
        // Ignore
      }
    }
    if (this.narrationState.status === 'playing' || this.narrationState.status === 'loading') {
      this.emitNarration({ status: 'paused' });
    }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAll() {
    if (!this.paused) return;
    this.paused = false;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.narrationPaused) {
      if (this.activeFinishCb && this.watchdogRemainingMs > 0) {
        this.watchdogStartedAtMs = performance.now();
        this.activeWatchdog = window.setTimeout(this.activeFinishCb, this.watchdogRemainingMs);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
        } catch {
          // Ignore
        }
      }
      if (this.narrationState.status === 'paused' && this.narrationState.text) {
        this.emitNarration({ status: 'playing' });
      }
    }
  }

  public replaySpeech(onFinished?: () => void) {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, this.lastSpokenMood, onFinished, {
        forceReplay: true,
        activeKey: this.lastActiveKey,
      });
    }
  }

  public retrySpeech(onFinished?: () => void) {
    this.replaySpeech(onFinished);
  }

  public stopSpeech(incrementToken = true) {
    if (incrementToken) {
      this.speechToken++;
      this.speechQueue = [];
    }
    this.narrationPaused = false;
    this.clearSpeechTimers();
    this.duckMusic(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (incrementToken && this.narrationState.status !== 'idle') {
      this.emitNarration({
        status: 'idle',
        text: '',
        activeKey: null,
        error: null,
      });
    }
  }
}

export const audioEngine = new AudioEngine();
