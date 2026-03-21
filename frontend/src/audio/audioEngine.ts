/**
 * Audio engine: manages instrumental playback and microphone capture.
 */

export interface AudioEngineState {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  micStream: MediaStream | null;
  audioElement: HTMLAudioElement;
  isPlaying: boolean;
}

export async function createAudioEngine(
  instrumentalUrl: string
): Promise<AudioEngineState> {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;

  const audioElement = new Audio();
  audioElement.crossOrigin = "anonymous";
  audioElement.src = instrumentalUrl;
  audioElement.preload = "auto";

  // Connect instrumental to speakers
  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(audioContext.destination);

  return {
    audioContext,
    analyser,
    micStream: null,
    audioElement,
    isPlaying: false,
  };
}

export async function connectMicrophone(
  engine: AudioEngineState
): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    engine.micStream = stream;
    const micSource = engine.audioContext.createMediaStreamSource(stream);
    micSource.connect(engine.analyser);
    // Analyser only — mic audio does NOT go to speakers (no feedback)
  } catch (err) {
    console.warn("Micrófono no disponible:", err);
  }
}

export function play(engine: AudioEngineState): void {
  if (engine.audioContext.state === "suspended") {
    engine.audioContext.resume();
  }
  engine.audioElement.play();
  engine.isPlaying = true;
}

export function pause(engine: AudioEngineState): void {
  engine.audioElement.pause();
  engine.isPlaying = false;
}

export function seekTo(engine: AudioEngineState, time: number): void {
  engine.audioElement.currentTime = time;
}

export function getCurrentTime(engine: AudioEngineState): number {
  return engine.audioElement.currentTime;
}

export function getTimeDomainData(engine: AudioEngineState): Float32Array {
  const buffer = new Float32Array(engine.analyser.fftSize);
  engine.analyser.getFloatTimeDomainData(buffer);
  return buffer;
}

export function getVolume(engine: AudioEngineState): number {
  const data = getTimeDomainData(engine);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

export function cleanup(engine: AudioEngineState): void {
  engine.audioElement.pause();
  engine.audioElement.src = "";
  if (engine.micStream) {
    engine.micStream.getTracks().forEach((t) => t.stop());
  }
  engine.audioContext.close();
}
