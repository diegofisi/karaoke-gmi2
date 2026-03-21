/**
 * Native JavaScript pitch meter — runs outside React's render cycle.
 * Uses its own requestAnimationFrame loop for maximum responsiveness.
 * Reads pitch data from shared refs to avoid prop-driven re-renders.
 */

const RATING_COLORS: Record<string, string> = {
  perfect: "#4ae89a",
  great: "#4a4ae8",
  good: "#e8c84a",
  miss: "#e84a4a",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const HISTORY_SIZE = 120;
const MIN_MIDI = 48; // C3
const MAX_MIDI = 84; // C6
const RANGE = MAX_MIDI - MIN_MIDI;

interface PitchEntry {
  user: number | null;
  ref: number | null;
}

export interface PitchMeterState {
  userPitch: number | null;
  refPitch: number | null;
  rating: "perfect" | "great" | "good" | "miss" | null;
}

export interface NativePitchMeterHandle {
  destroy: () => void;
  state: PitchMeterState;
}

function midiToNote(midi: number): string {
  const note = Math.round(midi);
  const name = NOTE_NAMES[((note % 12) + 12) % 12];
  const octave = Math.floor(note / 12) - 1;
  return `${name}${octave}`;
}

export function createNativePitchMeter(container: HTMLElement): NativePitchMeterHandle {
  // Create DOM elements
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px;";

  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 150;
  canvas.style.cssText =
    "border-radius:12px;border:1px solid #1e1e3a;width:100%;max-width:600px;height:150px;";

  const infoDiv = document.createElement("div");
  infoDiv.style.cssText = "display:flex;gap:12px;align-items:center;height:24px;";

  const noteSpan = document.createElement("span");
  noteSpan.style.cssText = "font-size:14px;color:#888;font-family:monospace;";

  const ratingSpan = document.createElement("span");
  ratingSpan.style.cssText = "font-size:16px;font-weight:900;text-transform:uppercase;";

  infoDiv.appendChild(noteSpan);
  infoDiv.appendChild(ratingSpan);
  wrapper.appendChild(canvas);
  wrapper.appendChild(infoDiv);
  container.appendChild(wrapper);

  const ctx = canvas.getContext("2d")!;
  const history: PitchEntry[] = [];

  // Shared mutable state — written from outside, read by the draw loop
  const state: PitchMeterState = {
    userPitch: null,
    refPitch: null,
    rating: null,
  };

  let lastUserPitch: number | null = null;
  let lastRefPitch: number | null = null;
  let animId = 0;
  let destroyed = false;

  function draw() {
    if (destroyed) return;

    const { userPitch, refPitch, rating } = state;

    // Only push to history when data actually changes (or periodically)
    // Push every frame for smooth scrolling
    history.push({ user: userPitch, ref: refPitch });
    if (history.length > HISTORY_SIZE) history.shift();

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "rgba(10, 10, 26, 0.85)";
    ctx.fillRect(0, 0, w, h);

    // Grid lines (every octave)
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let note = MIN_MIDI; note <= MAX_MIDI; note += 12) {
      const y = h - ((note - MIN_MIDI) / RANGE) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Semi-tone grid (lighter)
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    for (let note = MIN_MIDI; note <= MAX_MIDI; note += 1) {
      const y = h - ((note - MIN_MIDI) / RANGE) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const step = w / HISTORY_SIZE;
    const len = history.length;

    // --- Draw reference pitch (thick blue line with glow) ---
    ctx.save();
    ctx.shadowColor = "rgba(74, 74, 232, 0.5)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "rgba(74, 74, 232, 0.5)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < len; i++) {
      const p = history[i].ref;
      if (p === null) {
        started = false;
        continue;
      }
      const x = i * step;
      const y = h - ((p - MIN_MIDI) / RANGE) * h;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // --- Draw user pitch line (thinner, colored by rating, with glow) ---
    const userColor = rating && rating !== "miss" ? RATING_COLORS[rating] : "#ffffff";
    ctx.save();
    ctx.shadowColor = userColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = userColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    started = false;
    for (let i = 0; i < len; i++) {
      const p = history[i].user;
      if (p === null) {
        started = false;
        continue;
      }
      const x = i * step;
      const y = h - ((p - MIN_MIDI) / RANGE) * h;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();

    // --- Draw dots for user pitch trail (last 5 frames) ---
    for (let i = Math.max(0, len - 5); i < len; i++) {
      const p = history[i].user;
      if (p === null) continue;
      const x = i * step;
      const y = h - ((p - MIN_MIDI) / RANGE) * h;
      const alpha = 0.3 + 0.7 * ((i - (len - 5)) / 5);
      const radius = 2 + 3 * ((i - (len - 5)) / 5);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = userColor;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- Current user pitch dot (big, glowing) ---
    if (userPitch !== null) {
      const x = (len - 1) * step;
      const y = h - ((userPitch - MIN_MIDI) / RANGE) * h;

      ctx.save();
      ctx.shadowColor = userColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = userColor;
      ctx.fill();
      ctx.restore();
    }

    // --- Update info text ---
    if (userPitch !== null) {
      noteSpan.textContent = midiToNote(userPitch);
      noteSpan.style.display = "";
    } else {
      noteSpan.style.display = "none";
    }

    if (rating && rating !== "miss") {
      ratingSpan.textContent = rating.toUpperCase() + "!";
      ratingSpan.style.color = RATING_COLORS[rating];
      ratingSpan.style.display = "";
    } else {
      ratingSpan.style.display = "none";
    }

    animId = requestAnimationFrame(draw);
  }

  // Start the loop
  animId = requestAnimationFrame(draw);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(animId);
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    },
    state,
  };
}
