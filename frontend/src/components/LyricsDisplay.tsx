import { useRef, useEffect } from "react";
import type { LyricSegment } from "../types";

const SPEAKER_COLORS = ["#4a4ae8", "#e84aad", "#4ae89a", "#e8c84a"];

interface Props {
  lyrics: LyricSegment[];
  currentSegmentIndex: number;
  currentWordIndex: number;
  displaySegmentIndex: number;
  isInGap: boolean;
  language: string;
  isPlaying?: boolean;
  currentTime?: number;
}

export default function LyricsDisplay({
  lyrics,
  currentSegmentIndex,
  currentWordIndex,
  displaySegmentIndex,
  isInGap,
  language,
  isPlaying = false,
  currentTime = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to the active line
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [displaySegmentIndex]);

  // The anchor index for visible lyrics: use active segment, or display segment during gaps
  const anchorIndex = currentSegmentIndex >= 0 ? currentSegmentIndex : displaySegmentIndex;

  // Show a window of lines around the anchor
  const WINDOW_BEFORE = 2;
  const WINDOW_AFTER = 4;
  const start = Math.max(0, anchorIndex - WINDOW_BEFORE);
  const end = Math.min(lyrics.length, anchorIndex + WINDOW_AFTER);
  const visibleLyrics = lyrics.length > 0 ? lyrics.slice(start, end) : [];

  // Small countdown for gaps
  let countdownText = "";
  if (isInGap && isPlaying && lyrics.length > 0 && displaySegmentIndex < lyrics.length) {
    const nextSeg = lyrics[displaySegmentIndex];
    if (nextSeg && nextSeg.start > currentTime) {
      const secs = Math.ceil(nextSeg.start - currentTime);
      if (secs <= 5) {
        countdownText = `${secs}`;
      }
    }
  }

  return (
    <div ref={containerRef} style={styles.container}>
      {/* Countdown dot during short gaps */}
      {countdownText && (
        <div style={styles.countdown}>{countdownText}</div>
      )}

      {!isPlaying && currentSegmentIndex === -1 && lyrics.length > 0 && visibleLyrics.length === 0 && (
        <div style={styles.waitingContainer}>
          <p style={styles.waitingText}>Presiona Cantar para empezar</p>
        </div>
      )}

      {visibleLyrics.map((seg, i) => {
        const realIndex = start + i;
        const isCurrent = realIndex === currentSegmentIndex;
        const isPast = realIndex < anchorIndex;
        const isNext = isInGap && realIndex === displaySegmentIndex;
        const speakerColor =
          SPEAKER_COLORS[seg.speaker % SPEAKER_COLORS.length];

        return (
          <div
            key={realIndex}
            ref={isCurrent || isNext ? activeLineRef : undefined}
            style={{
              ...styles.line,
              opacity: isPast ? 0.25 : isCurrent ? 1 : isNext ? 0.7 : 0.45,
              transform: isCurrent ? "scale(1.05)" : "scale(1)",
              transition: "all 0.4s ease",
            }}
          >
            {/* Romaji line above for Japanese */}
            {language === "ja" && seg.romaji && (
              <div style={styles.romajiLine}>{seg.romaji}</div>
            )}

            <div style={styles.wordsRow}>
              {seg.words.map((word, wIdx) => {
                const isActiveWord =
                  isCurrent && wIdx === currentWordIndex;
                const isWordPast =
                  isCurrent && wIdx < currentWordIndex;

                return (
                  <span
                    key={wIdx}
                    style={{
                      ...styles.word,
                      color: isActiveWord
                        ? "#fff"
                        : isWordPast
                          ? speakerColor
                          : isPast
                            ? "#444"
                            : isNext
                              ? "#aaa"
                              : "#888",
                      textShadow: isActiveWord
                        ? `0 0 20px ${speakerColor}, 0 0 40px ${speakerColor}`
                        : "none",
                      transform: isActiveWord ? "scale(1.15)" : "scale(1)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {word.word}{" "}
                    {/* Show romaji under each Japanese word */}
                    {language === "ja" && word.romaji && isCurrent && (
                      <span style={styles.wordRomaji}>{word.romaji}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      {lyrics.length === 0 && (
        <p style={styles.placeholder}>Esperando lyrics...</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    padding: "40px 20px",
    minHeight: 300,
    position: "relative",
  },
  line: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.6,
  },
  romajiLine: {
    fontSize: 14,
    color: "#888",
    fontWeight: 400,
    marginBottom: 4,
    letterSpacing: 1,
  },
  wordsRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  word: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  wordRomaji: {
    fontSize: 10,
    color: "#666",
    position: "absolute",
    bottom: -14,
    whiteSpace: "nowrap",
  },
  placeholder: {
    color: "#444",
    fontSize: 18,
  },
  waitingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  waitingText: {
    color: "#555",
    fontSize: 16,
    fontWeight: 600,
  },
  countdown: {
    position: "absolute",
    top: 8,
    right: 20,
    fontSize: 14,
    color: "#4a4ae8",
    fontWeight: 700,
    opacity: 0.7,
  },
};
