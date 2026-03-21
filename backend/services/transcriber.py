import whisper
import json
from pathlib import Path
from backend.config import TRANSCRIPTIONS_DIR, WHISPER_MODEL


_model = None


def get_model():
    global _model
    if _model is None:
        _model = whisper.load_model(WHISPER_MODEL)
    return _model


def transcribe_vocals(vocals_path: Path, video_id: str) -> dict:
    output_path = TRANSCRIPTIONS_DIR / f"{video_id}.json"

    if output_path.exists():
        return json.loads(output_path.read_text(encoding="utf-8"))

    model = get_model()

    result = model.transcribe(
        str(vocals_path),
        word_timestamps=True,
        verbose=False,
    )

    language = result.get("language", "en")

    segments = []
    for seg in result.get("segments", []):
        words = []
        for w in seg.get("words", []):
            words.append({
                "word": w["word"].strip(),
                "start": round(w["start"], 3),
                "end": round(w["end"], 3),
            })

        segments.append({
            "text": seg["text"].strip(),
            "start": round(seg["start"], 3),
            "end": round(seg["end"], 3),
            "words": words,
        })

    transcription = {
        "language": language,
        "segments": segments,
    }

    output_path.write_text(
        json.dumps(transcription, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return transcription
