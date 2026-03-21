import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { submitSong } from "../utils/api";

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!YOUTUBE_REGEX.test(url)) {
      setError("Por favor ingresa un enlace válido de YouTube");
      return;
    }

    setLoading(true);
    try {
      const result = await submitSong(url);
      navigate(`/processing/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glow} />
      <h1 style={styles.title}>
        <span style={styles.emoji}>🎤</span> Karaoke App
      </h1>
      <p style={styles.subtitle}>
        Pega un enlace de YouTube y canta con letras sincronizadas.
        <br />
        Español, English, 日本語 — con puntuación en tiempo real.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={styles.input}
          disabled={loading}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Procesando..." : "¡Cantar!"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.features}>
        {[
          { icon: "🎵", title: "Separación de vocales", desc: "IA remueve las voces del audio original" },
          { icon: "📝", title: "Lyrics automáticos", desc: "Genera letras sincronizadas con timestamps" },
          { icon: "🇯🇵", title: "Romaji", desc: "Convierte letras japonesas a romaji" },
          { icon: "👥", title: "Multi-cantante", desc: "Detecta múltiples voces en la canción" },
          { icon: "🎯", title: "Puntuación", desc: "Puntúa tu afinación y ritmo en tiempo real" },
          { icon: "⏱️", title: "Max 15 min", desc: "Videos de hasta 15 minutos de duración" },
        ].map((f) => (
          <div key={f.title} style={styles.featureCard}>
            <span style={styles.featureIcon}>{f.icon}</span>
            <strong>{f.title}</strong>
            <span style={styles.featureDesc}>{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: 600,
    height: 600,
    background: "radial-gradient(circle, rgba(74,74,232,0.15) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  title: {
    fontSize: 48,
    fontWeight: 900,
    marginBottom: 12,
    background: "linear-gradient(135deg, #4a4ae8, #e84aad)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  emoji: { WebkitTextFillColor: "initial" },
  subtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    lineHeight: 1.6,
    marginBottom: 40,
  },
  form: {
    display: "flex",
    gap: 12,
    width: "100%",
    maxWidth: 600,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    padding: "14px 20px",
    borderRadius: 12,
    border: "2px solid #2a2a4a",
    background: "#12122a",
    color: "#fff",
    fontSize: 15,
    transition: "border-color 0.2s",
  },
  button: {
    padding: "14px 32px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #4a4ae8, #6a3adb)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    transition: "transform 0.1s, opacity 0.2s",
  },
  error: {
    color: "#e84a4a",
    fontSize: 14,
    marginBottom: 20,
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    maxWidth: 700,
    width: "100%",
    marginTop: 40,
  },
  featureCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "20px 12px",
    background: "#12122a",
    borderRadius: 12,
    border: "1px solid #1e1e3a",
    textAlign: "center",
    fontSize: 13,
  },
  featureIcon: { fontSize: 28, marginBottom: 4 },
  featureDesc: { color: "#666", fontSize: 12 },
};
