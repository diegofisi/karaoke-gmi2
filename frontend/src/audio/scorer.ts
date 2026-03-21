import type { PitchData } from "../types";

export interface ScoreState {
  // Pitch scoring
  pitchPoints: number;
  pitchMaxPoints: number;
  pitchHits: number;
  pitchMisses: number;
  // Lyrics scoring
  lyricsPoints: number;
  lyricsMaxPoints: number;
  lyricsWordsHit: number;
  lyricsWordsMissed: number;
  // General
  currentStreak: number;
  bestStreak: number;
  lastRating: "perfect" | "great" | "good" | "miss" | null;
}

export function createScoreState(): ScoreState {
  return {
    pitchPoints: 0,
    pitchMaxPoints: 0,
    pitchHits: 0,
    pitchMisses: 0,
    lyricsPoints: 0,
    lyricsMaxPoints: 0,
    lyricsWordsHit: 0,
    lyricsWordsMissed: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastRating: null,
  };
}

function getReferencePitch(
  pitchData: PitchData,
  time: number
): number | null {
  const { timestamps, pitches_midi, voiced } = pitchData;
  if (!timestamps.length) return null;

  let lo = 0;
  let hi = timestamps.length - 1;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timestamps[mid] < time) lo = mid + 1;
    else hi = mid;
  }

  if (!voiced[lo] || pitches_midi[lo] === null) return null;

  return pitches_midi[lo];
}

/**
 * Score pitch: octave-invariant comparison.
 * A man singing C3 and woman singing C4 both get "perfect" if reference is C.
 */
export function scorePitch(
  state: ScoreState,
  userMidi: number | null,
  time: number,
  pitchData: PitchData
): ScoreState {
  const refMidi = getReferencePitch(pitchData, time);

  if (refMidi === null) return state;

  state.pitchMaxPoints += 100;

  if (userMidi === null) {
    state.pitchMisses++;
    state.currentStreak = 0;
    state.lastRating = "miss";
    return state;
  }

  // Octave-invariant: compare note class only (ignoring octave)
  let diff = Math.abs(userMidi - refMidi) % 12;
  if (diff > 6) diff = 12 - diff;

  if (diff <= 1.0) {
    state.pitchPoints += 100;
    state.pitchHits++;
    state.currentStreak++;
    state.lastRating = "perfect";
  } else if (diff <= 1.5) {
    state.pitchPoints += 80;
    state.pitchHits++;
    state.currentStreak++;
    state.lastRating = "great";
  } else if (diff <= 2.5) {
    state.pitchPoints += 50;
    state.pitchHits++;
    state.currentStreak++;
    state.lastRating = "good";
  } else {
    state.pitchMisses++;
    state.currentStreak = 0;
    state.lastRating = "miss";
  }

  if (state.currentStreak > state.bestStreak) {
    state.bestStreak = state.currentStreak;
  }

  return state;
}

/**
 * Score lyrics: compare what the user said vs expected words.
 * Uses normalized word similarity (case-insensitive, accent-stripped).
 */
export function scoreLyrics(
  state: ScoreState,
  userText: string,
  expectedWords: string[]
): ScoreState {
  if (expectedWords.length === 0) return state;

  const userWords = normalizeText(userText).split(/\s+/).filter(Boolean);
  const expected = expectedWords.map((w) => normalizeText(w));

  // For each expected word, check if the user said something similar
  for (const exp of expected) {
    if (!exp) continue;
    state.lyricsMaxPoints += 100;

    let bestMatch = 0;
    for (const uw of userWords) {
      const sim = wordSimilarity(uw, exp);
      if (sim > bestMatch) bestMatch = sim;
    }

    if (bestMatch >= 0.8) {
      state.lyricsPoints += 100;
      state.lyricsWordsHit++;
    } else if (bestMatch >= 0.5) {
      state.lyricsPoints += 60;
      state.lyricsWordsHit++;
    } else {
      state.lyricsWordsMissed++;
    }
  }

  return state;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function wordSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Levenshtein distance-based similarity
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return dp[m][n];
}

/** Combined score: 50% pitch + 50% lyrics */
export function getScore(state: ScoreState): number {
  const pitchScore =
    state.pitchMaxPoints > 0
      ? (state.pitchPoints / state.pitchMaxPoints) * 100
      : 0;
  const lyricsScore =
    state.lyricsMaxPoints > 0
      ? (state.lyricsPoints / state.lyricsMaxPoints) * 100
      : 0;

  // If no lyrics scored yet, use pitch only
  if (state.lyricsMaxPoints === 0) return Math.round(pitchScore);
  // If no pitch scored yet, use lyrics only
  if (state.pitchMaxPoints === 0) return Math.round(lyricsScore);

  return Math.round(pitchScore * 0.5 + lyricsScore * 0.5);
}

export function getPitchScore(state: ScoreState): number {
  if (state.pitchMaxPoints === 0) return 0;
  return Math.round((state.pitchPoints / state.pitchMaxPoints) * 100);
}

export function getLyricsScore(state: ScoreState): number {
  if (state.lyricsMaxPoints === 0) return 0;
  return Math.round((state.lyricsPoints / state.lyricsMaxPoints) * 100);
}

export function getGrade(score: number): string {
  if (score >= 95) return "S";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 65) return "C";
  return "D";
}
