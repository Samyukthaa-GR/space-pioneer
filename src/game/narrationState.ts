import { AstroMood } from './types';

export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused';
export type NarrationProvider = 'webspeech' | 'silent';

export const DEFAULT_STORYTELLER_VOICE_ID = 'browser-en-us-female';

export interface NarrationSnapshot {
  status: NarrationStatus;
  text: string;
  lastText: string;
  mood: AstroMood;
  lastMood: AstroMood;
  activeKey: string | null;
  muted: boolean;
  voiceEnabled: boolean;
  autoplayBlocked: boolean;
  provider: NarrationProvider;
  voiceId: string;
  error: string | null;
  /** Monotonically increasing count of finished/started utterances for clean UI timers */
  sequence: number;
}

export interface VoiceCandidate {
  name: string;
  lang: string;
  default?: boolean;
}

const PREFERRED_US_FEMALE_PATTERNS = [
  /microsoft\s+aria/i,
  /microsoft\s+jenny/i,
  /microsoft\s+ava/i,
  /\bava\b/i,
  /\bsamantha\b/i,
  /\ballison\b/i,
  /\bvictoria\b/i,
  /google\s+us\s+english/i,
  /microsoft\s+zira/i,
  /\bkathy\b/i,
  /\bnicky\b/i,
  /\bshelley\b/i,
  /\bkaren\b/i,
  /\btessa\b/i,
  /\bfemale/i,
  /\bnatural/i,
];

const MALE_VOICE_EXCLUSION = /\b(david|mark|guy|daniel|alex|fred|aaron|arthur|thomas|george|ryan|eric|ralph|albert|bruce|junior|male)\b/i;

/**
 * Selects a consistent female American English storytelling voice descriptor.
 * Designed as pure logic so voice selection stays deterministic and unit-tested.
 */
export function selectConsistentFemaleUsVoice<T extends VoiceCandidate>(voices: readonly T[]): T | null {
  if (!voices || voices.length === 0) return null;

  const isUs = (v: T) => !v.lang || v.lang.toLowerCase().startsWith('en-us') || v.lang.toLowerCase() === 'en_us';
  const isEnglish = (v: T) => Boolean(v.lang && v.lang.toLowerCase().startsWith('en'));

  for (const pattern of PREFERRED_US_FEMALE_PATTERNS) {
    const match = voices.find(
      (v) => isUs(v) && pattern.test(v.name) && !MALE_VOICE_EXCLUSION.test(v.name)
    );
    if (match) return match;
  }

  const anyNonMaleUs = voices.find((v) => isUs(v) && !MALE_VOICE_EXCLUSION.test(v.name));
  if (anyNonMaleUs) return anyNonMaleUs;

  const anyUs = voices.find((v) => isUs(v));
  if (anyUs) return anyUs;

  const anyNonMaleEn = voices.find((v) => isEnglish(v) && !MALE_VOICE_EXCLUSION.test(v.name));
  if (anyNonMaleEn) return anyNonMaleEn;

  return voices.find((v) => isEnglish(v)) ?? voices[0];
}

export function getVoiceDescriptorKey(voice: VoiceCandidate): string {
  return `${voice.name}::${voice.lang || ''}`;
}

/**
 * Resolves a single consistent voice across the session: if a previously locked voice
 * is still available, keeps using it so ASTRO never switches voices mid-game.
 */
export function resolveConsistentSpeechVoice<T extends VoiceCandidate>(
  voices: readonly T[],
  lockedVoiceKey: string | null
): { voice: T | null; voiceKey: string | null } {
  if (!voices || voices.length === 0) {
    return { voice: null, voiceKey: lockedVoiceKey };
  }
  if (lockedVoiceKey) {
    const existing = voices.find((v) => getVoiceDescriptorKey(v) === lockedVoiceKey);
    if (existing) {
      return { voice: existing, voiceKey: lockedVoiceKey };
    }
  }
  const selected = selectConsistentFemaleUsVoice(voices);
  return {
    voice: selected,
    voiceKey: selected ? getVoiceDescriptorKey(selected) : lockedVoiceKey,
  };
}

/**
 * Keeps ASTRO's warm, gentle, child-friendly female storytelling delivery consistent across moods.
 */
export function getConsistentProsody(mood: AstroMood): { rate: number; pitch: number } {
  switch (mood) {
    case 'excited':
      return { rate: 0.95, pitch: 0.94 };
    case 'celebrating':
      return { rate: 0.94, pitch: 0.94 };
    case 'urgent':
      return { rate: 0.96, pitch: 0.90 };
    case 'encouraging':
      return { rate: 0.91, pitch: 0.91 };
    case 'warm':
    default:
      return { rate: 0.92, pitch: 0.92 };
  }
}

export function normalizeNarrationText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function prepareNativeSpeechText(text: string): string {
  return normalizeNarrationText(text)
    .replace(/CO₂|CO2/g, 'carbon dioxide')
    .replace(/O₂|O2/g, 'oxygen')
    .replace(/\s*—\s*/g, ', ');
}

export function buildNarrationCacheKey(
  voiceId: string | null,
  mood: AstroMood,
  text: string
): string {
  return `${voiceId || DEFAULT_STORYTELLER_VOICE_ID}::${mood}::${normalizeNarrationText(text)}`;
}

/**
 * Browser-native Web Speech API is now the primary narration engine.
 */
export function shouldAllowBrowserSpeechFallback(): boolean {
  return true;
}

/**
 * Prevents duplicate / restarted speech when React rerenders or overlapping
 * triggers fire for the exact same sentence while it is already loading or playing.
 */
export function shouldDeduplicateNarration(
  current: Pick<NarrationSnapshot, 'status' | 'text'>,
  nextText: string
): boolean {
  if (current.status !== 'loading' && current.status !== 'playing') return false;
  return normalizeNarrationText(current.text) === normalizeNarrationText(nextText);
}

export function estimateSpeechDurationMs(text: string): number {
  const normalized = normalizeNarrationText(text);
  if (!normalized) return 0;
  const words = Math.max(4, normalized.split(/\s+/).length);
  return Math.min(16000, Math.max(2800, words * 390));
}

export function createInitialNarrationSnapshot(): NarrationSnapshot {
  return {
    status: 'idle',
    text: '',
    lastText: '',
    mood: 'warm',
    lastMood: 'warm',
    activeKey: null,
    muted: false,
    voiceEnabled: true,
    autoplayBlocked: false,
    provider: 'silent',
    voiceId: DEFAULT_STORYTELLER_VOICE_ID,
    error: null,
    sequence: 0,
  };
}
