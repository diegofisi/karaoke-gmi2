import json
import numpy as np
import librosa
from pathlib import Path
from backend.config import PITCH_DIR


def extract_pitch(vocals_path: Path, video_id: str) -> dict:
    output_path = PITCH_DIR / f"{video_id}.json"

    if output_path.exists():
        return json.loads(output_path.read_text(encoding="utf-8"))

    y, sr = librosa.load(str(vocals_path), sr=44100, mono=True)

    # Extract pitch using pyin (probabilistic YIN)
    f0, voiced_flag, voiced_probs = librosa.pyin(
        y, fmin=80, fmax=800, sr=sr,
        frame_length=2048, hop_length=512,
    )

    # Time array
    times = librosa.times_like(f0, sr=sr, hop_length=512)

    # Convert Hz to MIDI note numbers
    midi_notes = []
    for freq in f0:
        if freq is not None and not np.isnan(freq) and freq > 0:
            midi = 12 * np.log2(freq / 440.0) + 69
            midi_notes.append(round(float(midi), 2))
        else:
            midi_notes.append(None)

    pitch_data = {
        "timestamps": [round(float(t), 4) for t in times],
        "pitches_hz": [round(float(f), 2) if f is not None and not np.isnan(f) else None for f in f0],
        "pitches_midi": midi_notes,
        "voiced": [bool(v) for v in voiced_flag],
        "sample_rate": sr,
        "hop_length": 512,
    }

    output_path.write_text(
        json.dumps(pitch_data, ensure_ascii=False),
        encoding="utf-8",
    )

    return pitch_data
