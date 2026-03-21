import type { LyricSegment } from "../types";

const SPEAKER_COLORS = ["#4a4ae8", "#e84aad", "#4ae89a", "#e8c84a"];

interface Props {
  lyrics: LyricSegment[];
  currentSegmentIndex: number;
  currentWordIndex: number;
  language: string;
  isPlaying?: boolean;
  currentTime?: number;
}

export default function LyricsDisplay({
  lyrics,
  currentSegmentIndex,
  currentWordIndex,
  language,
  isPlaying = false,
  currentTime = 0,
}: Props) {
  // When no segment is active, find the next upcoming segment
  const isInGap = currentSegmentIndex === -1 && lyrics.length > 0;

  let nextSegment: LyricSegment | null = null;
  let timeUntilNext = 0;
  if (isInGap && isPlaying) {
    for (const seg of lyrics) {
      if (seg.start > currentTime) {
        nextSegment = seg;
        timeUntilNext = Math.ceil(seg.start - currentTime);
        break;
      }
    }
  }

  // Show 2 lines before, current, and 2 after
  const start = Math.max(0, currentSegmentIndex - 2);
  const end = Math.min(lyrics.length, currentSegmentIndex + 4);
  const visibleLyrics = currentSegmentIndex >= 0 ? lyrics.slice(start, end) : [];

  return (
    <div style={styles.container}>
      {/* Show waiting indicator when between vocal sections */}
      {isInGap && isPlaying && (
        <div style={styles.waitingContainer}>
          {nextSegment ? (
            <>
              <div style={styles.waitingDots}>
                <span style={styles.dot1}>.</span>
                <span style={styles.dot2}>.</span>
                <span style={styles.dot3}>.</span>
              </div>
              <p style={styles.waitingText}>
                {timeUntilNext > 3
                  ? `Siguiente en ${timeUntilNext}s...`
                  : "Preparate..."}
              </p>
              <p style={styles.nextPreview}>{nextSegment.text}</p>
            </>
          ) : (
            <p style={styles.waitingText}>Instrumental...</p>
          )}
        </div>
      )}

      {!isPlaying && currentSegmentIndex === -1 && lyrics.length > 0 && (
        <div style={styles.waitingContainer}>
          <p style={styles.waitingText}>Presiona Cantar para empezar</p>
        </div>
      )}

      {visibleLyrics.map((seg, i) => {
        const realIndex = start + i;
        const isCurrent = realIndex === currentSegmentIndex;
        const isPast = realIndex < currentSegmentIndex;
        const speakerColor =
          SPEAKER_COLORS[seg.speaker % SPEAKER_COLORS.length];

        return (
          <div
            key={realIndex}
            style={{
              ...styles.line,
              opacity: isPast ? 0.3 : isCurrent ? 1 : 0.5,
              transform: isCurrent ? "scale(1.05)" : "scale(1)",
              transition: "all 0.3s ease",
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
                            ? "#555"
                            : "#999",
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
  waitingDots: {
    fontSize: 40,
    color: "#4a4ae8",
    letterSpacing: 8,
  },
  dot1: {
    animation: "none",
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
  waitingText: {
    color: "#555",
    fontSize: 16,
    fontWeight: 600,
  },
  nextPreview: {
    color: "#333",
    fontSize: 20,
    fontWeight: 700,
    fontStyle: "italic",
    marginTop: 8,
  },
};
