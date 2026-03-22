import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { submitSong, getLibrary, deleteLibrarySong } from "../utils/api";
import type { LibrarySong } from "../types";

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[\w-]+/;

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [library, setLibrary] = useState<LibrarySong[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getLibrary().then(setLibrary);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!YOUTUBE_REGEX.test(url)) {
      setError("Por favor ingresa un enlace válido de YouTube");
      return;
    }

    setLoading(true);
    try {
      const result = await submitSong(url, language || undefined);
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
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={styles.langSelect}
          disabled={loading}
        >
          <option value="">Idioma (auto)</option>
          <option value="ja">日本語</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="ko">한국어</option>
          <option value="zh">中文</option>
          <option value="fr">Français</option>
          <option value="pt">Português</option>
        </select>
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

      {/* Library section */}
      {library.length > 0 && (
        <div style={styles.librarySection}>
          <h3 style={styles.libraryTitle}>Canciones procesadas</h3>
          <div style={styles.libraryGrid}>
            {library.map((song) => (
              <div key={song.video_id} style={styles.libraryRow}>
                <button
                  style={styles.libraryCard}
                  onClick={() => navigate(`/karaoke/${song.video_id}`)}
                >
                  <span style={styles.libraryCardTitle}>{song.title}</span>
                  <div style={styles.libraryCardMeta}>
                    <span style={styles.libraryLang}>{song.language.toUpperCase()}</span>
                    <span style={styles.libraryDuration}>
                      {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, "0")}
                    </span>
                    {song.speakers_count > 1 && (
                      <span style={styles.librarySpeakers}>{song.speakers_count} voces</span>
                    )}
                  </div>
                </button>
                <button
                  style={styles.deleteBtn}
                  title="Borrar y re-procesar"
                  onClick={async () => {
                    await deleteLibrarySong(song.video_id);
                    setLibrary((prev) => prev.filter((s) => s.video_id !== song.video_id));
                  }}
                >
                  X
                </button>
              </div>
            ))}
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
  langSelect: {
    padding: "14px 10px",
    borderRadius: 12,
    border: "2px solid #2a2a4a",
    background: "#12122a",
    color: "#fff",
    fontSize: 14,
    cursor: "pointer",
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
  librarySection: {
    width: "100%",
    maxWidth: 700,
    marginTop: 48,
  },
  libraryTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#aaa",
    marginBottom: 16,
    textAlign: "center",
  },
  libraryGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  libraryRow: {
    display: "flex",
    gap: 6,
    alignItems: "stretch",
  },
  libraryCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "#12122a",
    border: "1px solid #1e1e3a",
    borderRadius: 10,
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    textAlign: "left",
    color: "#ddd",
    width: "100%",
  },
  libraryCardTitle: {
    fontSize: 14,
    fontWeight: 600,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginRight: 12,
  },
  libraryCardMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  libraryLang: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#1e1e3a",
    color: "#4a4ae8",
    fontWeight: 700,
  },
  libraryDuration: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  librarySpeakers: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    background: "#1e1e3a",
    color: "#e84aad",
  },
  deleteBtn: {
    padding: "0 12px",
    borderRadius: 10,
    background: "transparent",
    border: "1px solid #e84a4a33",
    color: "#e84a4a",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    flexShrink: 0,
  },
};
