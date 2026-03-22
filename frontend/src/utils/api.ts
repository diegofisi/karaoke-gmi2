import type { SongStatus, SongData, LibrarySong } from "../types";

const BASE = "/api/songs";

export async function submitSong(url: string, language?: string): Promise<SongStatus> {
  const res = await fetch(BASE + "/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, language: language || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error de red" }));
    throw new Error(err.detail || "Error enviando la canción");
  }
  return res.json();
}

export async function getSongStatus(jobId: string): Promise<SongStatus> {
  const res = await fetch(`${BASE}/${jobId}/status`);
  if (!res.ok) throw new Error("Error obteniendo estado");
  return res.json();
}

export async function getSongData(jobId: string): Promise<SongData> {
  const res = await fetch(`${BASE}/${jobId}/data`);
  if (!res.ok) throw new Error("Error obteniendo datos");
  return res.json();
}

export function getAudioUrl(jobId: string, track: "instrumental" | "vocals"): string {
  return `${BASE}/${jobId}/audio/${track}`;
}

export async function getLibrary(): Promise<LibrarySong[]> {
  const res = await fetch(`${BASE}/library/list`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteLibrarySong(videoId: string): Promise<void> {
  await fetch(`${BASE}/library/${videoId}`, { method: "DELETE" });
}
