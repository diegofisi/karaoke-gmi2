import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSongStatus } from "../utils/api";

const STATUS_LABELS: Record<string, string> = {
  pending: "En cola...",
  downloading: "Descargando audio de YouTube...",
  separating: "Separando vocales con IA...",
  transcribing: "Generando lyrics con Whisper...",
  converting_romaji: "Convirtiendo a romaji...",
  detecting_speakers: "Detectando múltiples cantantes...",
  extracting_pitch: "Extrayendo pitch de referencia...",
  ready: "¡Listo!",
  error: "Error",
};

export default function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const data = await getSongStatus(jobId);
        setStatus(data.status);
        setProgress(data.progress);
        if (data.title) setTitle(data.title);
        if (data.error) setError(data.error);

        if (data.status === "ready") {
          clearInterval(interval);
          setTimeout(() => navigate(`/karaoke/${jobId}`), 1000);
        }
        if (data.status === "error") {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
        setError("Error de conexión con el servidor");
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.spinner}>
          {status === "error" ? "❌" : status === "ready" ? "✅" : "🎵"}
        </div>

        <h2 style={styles.title}>
          {status === "error" ? "Error" : status === "ready" ? "¡Listo!" : "Procesando..."}
        </h2>

        {title && <p style={styles.songTitle}>{title}</p>}

        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>

        <p style={styles.statusText}>
          {STATUS_LABELS[status] || status}
        </p>

        <p style={styles.progressText}>{progress}%</p>

        {error && (
          <div style={styles.errorBox}>
            <p>{error}</p>
            <button style={styles.retryBtn} onClick={() => navigate("/")}>
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    background: "#12122a",
    borderRadius: 20,
    padding: "50px 40px",
    textAlign: "center",
    maxWidth: 500,
    width: "100%",
    border: "1px solid #1e1e3a",
  },
  spinner: {
    fontSize: 60,
    marginBottom: 20,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
  },
  songTitle: {
    color: "#4a4ae8",
    fontSize: 14,
    marginBottom: 24,
  },
  progressContainer: {
    width: "100%",
    height: 8,
    background: "#1e1e3a",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #4a4ae8, #e84aad)",
    borderRadius: 4,
    transition: "width 0.5s ease",
  },
  statusText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 4,
  },
  progressText: {
    color: "#4a4ae8",
    fontSize: 20,
    fontWeight: 700,
  },
  errorBox: {
    marginTop: 20,
    padding: 16,
    background: "rgba(232,74,74,0.1)",
    borderRadius: 12,
    border: "1px solid rgba(232,74,74,0.3)",
  },
  retryBtn: {
    marginTop: 12,
    padding: "10px 24px",
    borderRadius: 8,
    background: "#4a4ae8",
    color: "#fff",
    fontWeight: 600,
  },
};
