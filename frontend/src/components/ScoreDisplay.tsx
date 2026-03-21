import type { ScoreState } from "../audio/scorer";
import { getScore, getGrade, getPitchScore, getLyricsScore } from "../audio/scorer";

interface Props {
  scoreState: ScoreState;
  isFinished: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd700",
  A: "#4ae89a",
  B: "#4a4ae8",
  C: "#e8c84a",
  D: "#e84a4a",
};

export default function ScoreDisplay({ scoreState, isFinished }: Props) {
  const score = getScore(scoreState);
  const grade = getGrade(score);
  const pitchPct = getPitchScore(scoreState);
  const lyricsPct = getLyricsScore(scoreState);

  if (isFinished) {
    return (
      <div style={styles.finalContainer}>
        <div
          style={{
            ...styles.grade,
            color: GRADE_COLORS[grade],
            textShadow: `0 0 40px ${GRADE_COLORS[grade]}`,
          }}
        >
          {grade}
        </div>
        <div style={styles.finalScore}>{score} pts</div>

        {/* Score breakdown */}
        <div style={styles.breakdown}>
          <div style={styles.breakdownItem}>
            <div style={styles.breakdownBar}>
              <div style={{ ...styles.breakdownFill, width: `${pitchPct}%`, background: "#4a4ae8" }} />
            </div>
            <span style={styles.breakdownLabel}>Entonacion {pitchPct}%</span>
          </div>
          <div style={styles.breakdownItem}>
            <div style={styles.breakdownBar}>
              <div style={{ ...styles.breakdownFill, width: `${lyricsPct}%`, background: "#4ae89a" }} />
            </div>
            <span style={styles.breakdownLabel}>Letra {lyricsPct}%</span>
          </div>
        </div>

        <div style={styles.stats}>
          <div>
            <span style={styles.statLabel}>Notas bien</span>
            <span style={styles.statValue}>{scoreState.pitchHits}</span>
          </div>
          <div>
            <span style={styles.statLabel}>Notas mal</span>
            <span style={styles.statValue}>{scoreState.pitchMisses}</span>
          </div>
          <div>
            <span style={styles.statLabel}>Palabras</span>
            <span style={styles.statValue}>
              {scoreState.lyricsWordsHit}/{scoreState.lyricsWordsHit + scoreState.lyricsWordsMissed}
            </span>
          </div>
          <div>
            <span style={styles.statLabel}>Mejor racha</span>
            <span style={styles.statValue}>{scoreState.bestStreak}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.liveContainer}>
      <div style={styles.liveScore}>{score}</div>
      <div style={styles.liveLabel}>PTS</div>
      <div style={styles.liveBreakdown}>
        <span style={{ color: "#4a4ae8", fontSize: 10 }}>♪{pitchPct}</span>
        <span style={{ color: "#4ae89a", fontSize: 10 }}>A{lyricsPct}</span>
      </div>
      {scoreState.currentStreak >= 5 && (
        <div style={styles.streak}>x{scoreState.currentStreak}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  liveContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "10px 16px",
    background: "rgba(18, 18, 42, 0.9)",
    borderRadius: 16,
    border: "1px solid #1e1e3a",
    minWidth: 70,
  },
  liveScore: {
    fontSize: 28,
    fontWeight: 900,
    color: "#4a4ae8",
  },
  liveLabel: {
    fontSize: 9,
    color: "#666",
    letterSpacing: 2,
  },
  liveBreakdown: {
    display: "flex",
    gap: 8,
    marginTop: 2,
  },
  streak: {
    fontSize: 12,
    fontWeight: 700,
    color: "#e8c84a",
    marginTop: 2,
  },
  finalContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 40,
    background: "rgba(18, 18, 42, 0.95)",
    borderRadius: 24,
    border: "1px solid #2a2a5a",
  },
  grade: {
    fontSize: 100,
    fontWeight: 900,
  },
  finalScore: {
    fontSize: 36,
    fontWeight: 700,
    color: "#fff",
  },
  breakdown: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
    maxWidth: 280,
  },
  breakdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    background: "#1e1e3a",
    borderRadius: 4,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.3s",
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#888",
    minWidth: 110,
  },
  stats: {
    display: "flex",
    gap: 24,
    marginTop: 12,
  },
  statLabel: {
    display: "block",
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  statValue: {
    display: "block",
    fontSize: 18,
    fontWeight: 700,
    color: "#fff",
    textAlign: "center",
  },
};
