import json
import shutil
from backend.config import LIBRARY_FILE, SEPARATED_DIR, TRANSCRIPTIONS_DIR, PITCH_DIR, DOWNLOADS_DIR
from pathlib import Path


def _load_library() -> list[dict]:
    if not LIBRARY_FILE.exists():
        return []
    try:
        return json.loads(LIBRARY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save_library(entries: list[dict]):
    LIBRARY_FILE.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def get_library() -> list[dict]:
    """Return all saved songs (metadata only, no lyrics/pitch)."""
    entries = _load_library()
    # Only return songs whose audio files still exist
    valid = []
    for entry in entries:
        vocal_path = Path(entry.get("vocals_path", ""))
        instr_path = Path(entry.get("instrumental_path", ""))
        if vocal_path.exists() and instr_path.exists():
            valid.append({
                "video_id": entry["video_id"],
                "title": entry["title"],
                "language": entry.get("language", "en"),
                "duration": entry.get("duration", 0),
                "speakers_count": entry.get("speakers_count", 1),
            })
    return valid


def save_to_library(job: dict):
    """Save a completed job to the library."""
    entries = _load_library()

    video_id = job.get("video_id", "")

    # Update existing entry or add new
    entry = {
        "video_id": video_id,
        "title": job.get("title", ""),
        "language": job.get("language", "en"),
        "duration": job.get("duration", 0),
        "speakers_count": job.get("speakers_count", 1),
        "vocals_path": job.get("vocals_path", ""),
        "instrumental_path": job.get("instrumental_path", ""),
    }

    # Replace if same video_id exists
    entries = [e for e in entries if e.get("video_id") != video_id]
    entries.insert(0, entry)

    _save_library(entries)


def delete_from_library(video_id: str) -> bool:
    """Delete a song and all its cached data from disk."""
    entries = _load_library()
    entry = next((e for e in entries if e["video_id"] == video_id), None)
    if not entry:
        return False

    # Remove cached files
    transcription_file = TRANSCRIPTIONS_DIR / f"{video_id}.json"
    if transcription_file.exists():
        transcription_file.unlink()

    pitch_file = PITCH_DIR / f"{video_id}.json"
    if pitch_file.exists():
        pitch_file.unlink()

    # Remove separated audio folder
    separated_dir = SEPARATED_DIR / video_id
    if separated_dir.exists():
        shutil.rmtree(separated_dir)

    # Remove downloaded audio
    for f in DOWNLOADS_DIR.glob(f"{video_id}.*"):
        f.unlink()

    # Remove from library index
    entries = [e for e in entries if e["video_id"] != video_id]
    _save_library(entries)
    return True


def cleanup_orphans():
    """Delete data folders/files not referenced in the library."""
    entries = _load_library()
    known_ids = {e["video_id"] for e in entries}

    if SEPARATED_DIR.exists():
        for sep_dir in SEPARATED_DIR.iterdir():
            if sep_dir.is_dir() and sep_dir.name not in known_ids:
                shutil.rmtree(sep_dir)

    if TRANSCRIPTIONS_DIR.exists():
        for f in TRANSCRIPTIONS_DIR.glob("*.json"):
            if f.stem not in known_ids:
                f.unlink()

    if PITCH_DIR.exists():
        for f in PITCH_DIR.glob("*.json"):
            if f.stem not in known_ids:
                f.unlink()

    if DOWNLOADS_DIR.exists():
        for f in DOWNLOADS_DIR.iterdir():
            if f.stem not in known_ids:
                f.unlink()


def load_song_data(video_id: str) -> dict | None:
    """Load full song data from disk for a library entry."""
    entries = _load_library()
    entry = next((e for e in entries if e["video_id"] == video_id), None)
    if not entry:
        return None

    vocals_path = Path(entry["vocals_path"])
    instrumental_path = Path(entry["instrumental_path"])
    if not vocals_path.exists() or not instrumental_path.exists():
        return None

    # Load transcription
    transcription_file = TRANSCRIPTIONS_DIR / f"{video_id}.json"
    if not transcription_file.exists():
        return None
    transcription = json.loads(transcription_file.read_text(encoding="utf-8"))

    # Load pitch data
    pitch_file = PITCH_DIR / f"{video_id}.json"
    pitch_data = {}
    if pitch_file.exists():
        pitch_data = json.loads(pitch_file.read_text(encoding="utf-8"))

    return {
        "video_id": video_id,
        "title": entry["title"],
        "duration": entry.get("duration", 0),
        "language": transcription.get("language", "en"),
        "vocals_path": str(vocals_path),
        "instrumental_path": str(instrumental_path),
        "lyrics": transcription.get("segments", []),
        "pitch_data": pitch_data,
        "speakers_count": entry.get("speakers_count", 1),
    }
