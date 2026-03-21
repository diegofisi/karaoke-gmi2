/**
 * YIN pitch detection with hold/smoothing for singing voice.
 * Handles consonant articulation gaps by holding the last detected pitch.
 */

const DEFAULT_THRESHOLD = 0.3; // More permissive (was 0.15)
const MIN_FREQ = 80;
const MAX_FREQ = 800;

// Hold state: keeps last pitch alive during brief gaps (consonants, breaths)
let lastDetectedPitch: number | null = null;
let holdCounter = 0;
const HOLD_FRAMES = 8; // Hold pitch for ~8 frames (~160ms at 50fps)

// Smoothing: average recent pitches to avoid jitter
const pitchHistory: number[] = [];
const SMOOTH_SIZE = 3;

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  threshold = DEFAULT_THRESHOLD
): number | null {
  const rawPitch = detectPitchRaw(buffer, sampleRate, threshold);

  if (rawPitch !== null) {
    // Got a valid pitch
    holdCounter = HOLD_FRAMES;
    lastDetectedPitch = rawPitch;

    // Smooth: add to history and average
    pitchHistory.push(rawPitch);
    if (pitchHistory.length > SMOOTH_SIZE) pitchHistory.shift();

    const avg = pitchHistory.reduce((a, b) => a + b, 0) / pitchHistory.length;
    return avg;
  }

  // No pitch detected — use hold if recent pitch exists
  if (holdCounter > 0 && lastDetectedPitch !== null) {
    holdCounter--;
    return lastDetectedPitch;
  }

  // Truly silent — clear history
  pitchHistory.length = 0;
  lastDetectedPitch = null;
  return null;
}

export function resetPitchDetector(): void {
  lastDetectedPitch = null;
  holdCounter = 0;
  pitchHistory.length = 0;
}

function detectPitchRaw(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number
): number | null {
  const minPeriod = Math.floor(sampleRate / MAX_FREQ);
  const maxPeriod = Math.floor(sampleRate / MIN_FREQ);
  const halfLen = Math.floor(buffer.length / 2);

  if (maxPeriod >= halfLen) return null;

  // Step 1: Difference function
  const diff = new Float32Array(maxPeriod + 1);
  for (let tau = 1; tau <= maxPeriod; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const d = buffer[i] - buffer[i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference
  const cmndf = new Float32Array(maxPeriod + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxPeriod; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] / (runningSum / tau);
  }

  // Step 3: Absolute threshold — try progressively more permissive thresholds
  let bestTau = -1;
  for (const t of [threshold, threshold + 0.1, threshold + 0.2]) {
    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
      if (cmndf[tau] < t) {
        // Find the local minimum
        while (tau + 1 <= maxPeriod && cmndf[tau + 1] < cmndf[tau]) {
          tau++;
        }
        bestTau = tau;
        break;
      }
    }
    if (bestTau !== -1) break;
  }

  if (bestTau === -1) return null;

  // Step 4: Parabolic interpolation for better precision
  let betterTau = bestTau;
  if (bestTau > 0 && bestTau < maxPeriod) {
    const s0 = cmndf[bestTau - 1];
    const s1 = cmndf[bestTau];
    const s2 = cmndf[bestTau + 1];
    const denom = 2 * (s0 - 2 * s1 + s2);
    if (Math.abs(denom) > 1e-10) {
      betterTau = bestTau + (s0 - s2) / denom;
    }
  }

  const frequency = sampleRate / betterTau;

  if (frequency < MIN_FREQ || frequency > MAX_FREQ) return null;

  return frequency;
}

export function hzToMidi(hz: number): number {
  return 12 * Math.log2(hz / 440) + 69;
}

export function midiToNoteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const note = Math.round(midi);
  const name = names[((note % 12) + 12) % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}
