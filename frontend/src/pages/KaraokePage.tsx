import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSongData, getAudioUrl } from "../utils/api";
import {
  createAudioEngine,
  connectMicrophone,
  play,
  pause,
  seekTo,
  getCurrentTime,
  getTimeDomainData,
  getVolume,
  cleanup,
  type AudioEngineState,
} from "../audio/audioEngine";
import { detectPitch, hzToMidi, resetPitchDetector } from "../audio/pitchDetector";
import {
  createScoreState,
  scorePitch,
  scoreLyrics,
  type ScoreState,
} from "../audio/scorer";
import { useLyricsSync } from "../hooks/useLyricsSync";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import LyricsDisplay from "../components/LyricsDisplay";
import PitchMeter from "../components/PitchMeter";
import ScoreDisplay from "../components/ScoreDisplay";
import type { SongData, PitchData } from "../types";

type Mode = "free" | "scoring";

export default function KaraokePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [songData, setSongData] = useState<SongData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [userPitch, setUserPitch] = useState<number | null>(null);
  const [refPitch, setRefPitch] = useState<number | null>(null);
  const [scoreState, setScoreState] = useState<ScoreState>(createScoreState());
  const [volume, setVolume] = useState(0.8);
  const [sensitivity, setSensitivity] = useState(0.002);
  const [mode, setMode] = useState<Mode>("free");
  const [currentTime, setCurrentTime] = useState(0);

  const [userTranscript, setUserTranscript] = useState("");

  const engineRef = useRef<AudioEngineState | null>(null);
  const scoreRef = useRef<ScoreState>(createScoreState());
  const animFrameRef = useRef<number>(0);
  const sensitivityRef = useRef(sensitivity);
  const modeRef = useRef(mode);
  const lastScoredSegmentRef = useRef(-1);

  // Keep refs in sync
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const lyrics = songData?.lyrics ?? [];

  // Speech recognition
  const speechLang = songData?.language ?? "en";
  const speech = useSpeechRecognition(speechLang, isPlaying);

  // Update displayed transcript
  useEffect(() => {
    setUserTranscript(speech.currentTranscript || speech.finalTranscript.split(" ").slice(-8).join(" "));
  }, [speech.currentTranscript, speech.finalTranscript]);

  const { currentSegmentIndex, currentWordIndex, displaySegmentIndex, isInGap, update: updateLyrics } =
    useLyricsSync(lyrics);

  // Load song data
  useEffect(() => {
    if (!jobId) return;
    getSongData(jobId).then(setSongData).catch(() => navigate("/"));
  }, [jobId, navigate]);

  // Initialize audio engine
  useEffect(() => {
    if (!songData || !jobId) return;

    let mounted = true;
    const initAudio = async () => {
      const url = getAudioUrl(jobId, "instrumental");
      const engine = await createAudioEngine(url);
      if (!mounted) {
        cleanup(engine);
        return;
      }
      engineRef.current = engine;

      await connectMicrophone(engine);
      if (mounted) setMicReady(!!engine.micStream);

      engine.audioElement.addEventListener("ended", () => {
        setIsPlaying(false);
        if (modeRef.current === "scoring") {
          setIsFinished(true);
        }
      });
    };

    initAudio();

    return () => {
      mounted = false;
      if (engineRef.current) cleanup(engineRef.current);
    };
  }, [songData, jobId]);

  // Volume control
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.audioElement.volume = volume;
    }
  }, [volume]);

  // Main render loop
  const gameLoop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !songData) return;

    const time = getCurrentTime(engine);
    setCurrentTime(time);
    updateLyrics(time);

    // Pitch detection from mic
    if (engine.micStream) {
      const buffer = getTimeDomainData(engine);
      const vol = getVolume(engine);

      let detectedMidi: number | null = null;
      if (vol > sensitivityRef.current) {
        const hz = detectPitch(buffer, engine.audioContext.sampleRate);
        if (hz) {
          detectedMidi = hzToMidi(hz);
        }
      }
      setUserPitch(detectedMidi);

      // Get reference pitch at current time
      const pitchData = songData.pitch_data;
      let ref: number | null = null;
      if (pitchData.timestamps.length > 0) {
        let idx = 0;
        for (let i = 0; i < pitchData.timestamps.length; i++) {
          if (pitchData.timestamps[i] <= time) idx = i;
          else break;
        }
        if (pitchData.voiced[idx] && pitchData.pitches_midi[idx] !== null) {
          ref = pitchData.pitches_midi[idx];
        }
      }
      setRefPitch(ref);

      // Only score in scoring mode
      if (modeRef.current === "scoring") {
        scoreRef.current = scorePitch(
          { ...scoreRef.current },
          detectedMidi,
          time,
          songData.pitch_data as PitchData
        );

        // Score lyrics when a segment just ended
        const prevSeg = lastScoredSegmentRef.current;
        for (let si = (prevSeg + 1); si < songData.lyrics.length; si++) {
          const seg = songData.lyrics[si];
          if (seg.end < time && si > prevSeg) {
            // This segment just passed — score the user's words against it
            const expectedWords = seg.words.map(w => w.word);
            scoreRef.current = scoreLyrics(
              { ...scoreRef.current },
              speech.fullText,
              expectedWords
            );
            lastScoredSegmentRef.current = si;
          } else {
            break;
          }
        }

        setScoreState({ ...scoreRef.current });
      }
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [songData, updateLyrics]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, gameLoop]);

  const handlePlayPause = () => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isPlaying) {
      pause(engine);
      speech.stop();
      setIsPlaying(false);
    } else {
      if (isFinished) {
        engine.audioElement.currentTime = 0;
        scoreRef.current = createScoreState();
        setScoreState(createScoreState());
        lastScoredSegmentRef.current = -1;
        setIsFinished(false);
      }
      play(engine);
      speech.reset();
      speech.start();
      setIsPlaying(true);
    }
  };

  const handleSeek = (delta: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const newTime = Math.max(0, getCurrentTime(engine) + delta);
    seekTo(engine, newTime);
    setCurrentTime(newTime);
    updateLyrics(newTime);
  };

  const handleRestart = () => {
    const engine = engineRef.current;
    if (!engine) return;
    pause(engine);
    seekTo(engine, 0);
    scoreRef.current = createScoreState();
    setScoreState(createScoreState());
    resetPitchDetector();
    speech.stop();
    speech.reset();
    lastScoredSegmentRef.current = -1;
    setIsPlaying(false);
    setIsFinished(false);
    setCurrentTime(0);
    updateLyrics(0);
  };

  const handleFinish = () => {
    const engine = engineRef.current;
    if (!engine) return;
    pause(engine);
    setIsPlaying(false);
    if (mode === "scoring") {
      setIsFinished(true);
    }
  };

  const handleSwitchMode = (newMode: Mode) => {
    setMode(newMode);
    scoreRef.current = createScoreState();
    setScoreState(createScoreState());
    if (newMode === "free") {
      setIsFinished(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!songData) {
    return (
      <div style={styles.loading}>
        <p>Cargando cancion...</p>
      </div>
    );
  }

  const duration = songData.duration;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate("/")}>
          ← Inicio
        </button>
        <div style={styles.titleSection}>
          <h2 style={styles.songTitle}>{songData.title}</h2>
          <span style={styles.langBadge}>
            {songData.language.toUpperCase()}
          </span>
          {songData.speakers_count > 1 && (
            <span style={styles.speakerBadge}>
              {songData.speakers_count} cantantes
            </span>
          )}
        </div>

        {/* Mode toggle */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeBtn,
              ...(mode === "free" ? styles.modeBtnActive : {}),
            }}
            onClick={() => handleSwitchMode("free")}
          >
            Libre
          </button>
          <button
            style={{
              ...styles.modeBtn,
              ...(mode === "scoring" ? styles.modeBtnActive : {}),
            }}
            onClick={() => handleSwitchMode("scoring")}
          >
            Puntuacion
          </button>
        </div>

        {/* Score display - only in scoring mode */}
        {mode === "scoring" && (
          <ScoreDisplay scoreState={scoreState} isFinished={false} />
        )}
      </div>

      {/* Progress bar */}
      <div
        style={styles.progressBarContainer}
        onClick={(e) => {
          if (mode !== "free") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          const newTime = pct * duration;
          const engine = engineRef.current;
          if (engine) {
            seekTo(engine, newTime);
            setCurrentTime(newTime);
            updateLyrics(newTime);
          }
        }}
      >
        <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
        <span style={styles.timeDisplay}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Lyrics */}
      <div style={styles.lyricsSection}>
        <LyricsDisplay
          lyrics={lyrics}
          currentSegmentIndex={currentSegmentIndex}
          currentWordIndex={currentWordIndex}
          displaySegmentIndex={displaySegmentIndex}
          isInGap={isInGap}
          language={songData.language}
          isPlaying={isPlaying}
          currentTime={currentTime}
        />
      </div>

      {/* User transcript - what they're singing */}
      {isPlaying && speech.supported && (
        <div style={styles.transcriptSection}>
          <span style={styles.transcriptLabel}>Tu voz:</span>
          <span style={styles.transcriptText}>
            {userTranscript || "..."}
          </span>
        </div>
      )}

      {/* Pitch Meter */}
      <div style={styles.pitchSection}>
        <PitchMeter
          userPitch={userPitch}
          refPitch={refPitch}
          rating={mode === "scoring" ? scoreState.lastRating : null}
        />
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {/* Left group: seek controls (free mode) */}
        <div style={styles.controlGroup}>
          {mode === "free" && (
            <>
              <button style={styles.seekBtn} onClick={() => handleSeek(-10)}>
                -10s
              </button>
              <button style={styles.seekBtn} onClick={() => handleSeek(-5)}>
                -5s
              </button>
            </>
          )}
        </div>

        {/* Center: main controls */}
        <div style={styles.controlGroup}>
          <button style={styles.restartBtn} onClick={handleRestart}>
            Reiniciar
          </button>
          <button style={styles.playBtn} onClick={handlePlayPause}>
            {isPlaying ? "⏸ Pausar" : "▶ Cantar"}
          </button>
          <button style={styles.finishBtn} onClick={handleFinish}>
            Terminar
          </button>
        </div>

        {/* Right group: seek controls (free mode) */}
        <div style={styles.controlGroup}>
          {mode === "free" && (
            <>
              <button style={styles.seekBtn} onClick={() => handleSeek(5)}>
                +5s
              </button>
              <button style={styles.seekBtn} onClick={() => handleSeek(10)}>
                +10s
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bottom bar: volume + sensitivity */}
      <div style={styles.bottomBar}>
        <div style={styles.sliderGroup}>
          <span style={styles.sliderLabel}>Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>

        <div style={styles.sliderGroup}>
          <span style={styles.sliderLabel}>Sens. Mic</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round((1 - (sensitivity - 0.0005) / 0.05) * 100)}
            onChange={(e) => {
              const pct = parseInt(e.target.value);
              const val = 0.0005 + (1 - pct / 100) * 0.05;
              setSensitivity(val);
            }}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>
            {sensitivity <= 0.003 ? "Alta" : sensitivity <= 0.01 ? "Media" : "Baja"}
          </span>
        </div>

        <div style={styles.micStatus}>
          {micReady ? "Microfono listo" : "Sin microfono"}
        </div>
      </div>

      {/* Final Score Modal - only in scoring mode */}
      {isFinished && mode === "scoring" && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Cancion terminada!</h2>
            <ScoreDisplay scoreState={scoreState} isFinished={true} />
            <div style={styles.modalButtons}>
              <button style={styles.retryModalBtn} onClick={() => {
                handleRestart();
                setTimeout(() => {
                  const engine = engineRef.current;
                  if (engine) { play(engine); setIsPlaying(true); }
                }, 100);
              }}>
                Cantar de nuevo
              </button>
              <button style={styles.freeModalBtn} onClick={() => {
                handleSwitchMode("free");
                handleRestart();
              }}>
                Modo libre
              </button>
              <button style={styles.homeModalBtn} onClick={() => navigate("/")}>
                Nueva cancion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0a0a1a 0%, #12122a 50%, #0a0a1a 100%)",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    color: "#888",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid #1e1e3a",
    background: "rgba(10,10,26,0.9)",
    backdropFilter: "blur(10px)",
    gap: 12,
  },
  backBtn: {
    background: "transparent",
    color: "#888",
    fontSize: 14,
    padding: "8px 12px",
    borderRadius: 8,
  },
  titleSection: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 15,
    fontWeight: 700,
    maxWidth: 250,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  langBadge: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#1e1e3a",
    color: "#4a4ae8",
    fontWeight: 700,
  },
  speakerBadge: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#1e1e3a",
    color: "#e84aad",
  },
  modeToggle: {
    display: "flex",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #2a2a4a",
  },
  modeBtn: {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    background: "transparent",
    color: "#666",
    transition: "all 0.2s",
  },
  modeBtnActive: {
    background: "#4a4ae8",
    color: "#fff",
  },
  progressBarContainer: {
    position: "relative",
    width: "100%",
    height: 20,
    background: "#1a1a2e",
    cursor: "pointer",
  },
  progressBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4a4ae8, #e84aad)",
    transition: "width 0.1s linear",
  },
  timeDisplay: {
    position: "absolute",
    right: 8,
    top: 2,
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "monospace",
  },
  lyricsSection: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pitchSection: {
    display: "flex",
    justifyContent: "center",
    padding: "8px 0",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderTop: "1px solid #1e1e3a",
    background: "rgba(10,10,26,0.9)",
    backdropFilter: "blur(10px)",
  },
  controlGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    minWidth: 120,
    justifyContent: "center",
  },
  playBtn: {
    padding: "10px 28px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #4a4ae8, #6a3adb)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
  },
  restartBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "transparent",
    border: "1px solid #2a2a4a",
    color: "#888",
    fontSize: 13,
    fontWeight: 600,
  },
  finishBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "transparent",
    border: "1px solid #e84a4a55",
    color: "#e84a4a",
    fontSize: 13,
    fontWeight: 600,
  },
  seekBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    background: "#1e1e3a",
    color: "#aaa",
    fontSize: 12,
    fontWeight: 600,
  },
  bottomBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    padding: "8px 24px",
    background: "#0a0a1a",
    borderTop: "1px solid #1a1a2a",
  },
  sliderGroup: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  sliderLabel: {
    fontSize: 11,
    color: "#666",
    minWidth: 55,
  },
  slider: {
    width: 80,
    accentColor: "#4a4ae8",
  },
  sliderValue: {
    fontSize: 11,
    color: "#4a4ae8",
    minWidth: 35,
    fontWeight: 600,
  },
  micStatus: {
    fontSize: 12,
    color: "#555",
  },
  transcriptSection: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "6px 20px",
    background: "rgba(74, 232, 154, 0.05)",
    borderTop: "1px solid rgba(74, 232, 154, 0.1)",
  },
  transcriptLabel: {
    fontSize: 11,
    color: "#4ae89a",
    fontWeight: 700,
    minWidth: 50,
  },
  transcriptText: {
    fontSize: 14,
    color: "#aaa",
    fontStyle: "italic",
    maxWidth: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  modal: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(10px)",
    zIndex: 100,
  },
  modalContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 900,
  },
  modalButtons: {
    display: "flex",
    gap: 12,
    marginTop: 12,
  },
  retryModalBtn: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "#4a4ae8",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
  },
  freeModalBtn: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "transparent",
    border: "2px solid #4ae89a",
    color: "#4ae89a",
    fontSize: 14,
    fontWeight: 700,
  },
  homeModalBtn: {
    padding: "12px 24px",
    borderRadius: 12,
    background: "transparent",
    border: "2px solid #4a4ae8",
    color: "#4a4ae8",
    fontSize: 14,
    fontWeight: 700,
  },
};
