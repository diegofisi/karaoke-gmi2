import sys
import subprocess
import torch
import numpy as np
import soundfile as sf
from pathlib import Path
from backend.config import SEPARATED_DIR, DEMUCS_MODEL

PYTHON = sys.executable


def separate_vocals(audio_path: Path, video_id: str) -> tuple[Path, Path]:
    output_dir = SEPARATED_DIR / video_id

    vocals_path = output_dir / "vocals.wav"
    instrumental_path = output_dir / "no_vocals.wav"

    if vocals_path.exists() and instrumental_path.exists():
        return vocals_path, instrumental_path

    output_dir.mkdir(parents=True, exist_ok=True)

    # Use demucs as a Python library to avoid torchaudio.save/torchcodec issues
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    from demucs.audio import AudioFile

    model = get_model(DEMUCS_MODEL)
    model.eval()

    # Load audio
    wav = AudioFile(audio_path).read(
        streams=0, samplerate=model.samplerate, channels=model.audio_channels
    )

    ref = wav.mean(0)
    wav = (wav - ref.mean()) / ref.std()

    # Apply model
    with torch.no_grad():
        sources = apply_model(model, wav[None], progress=True)[0]

    # Undo normalization
    sources = sources * ref.std() + ref.mean()

    # Find vocal and non-vocal indices
    source_names = model.sources
    vocals_idx = source_names.index("vocals")

    # Extract vocals and instrumental (sum of all non-vocal sources)
    vocals_audio = sources[vocals_idx].cpu().numpy()
    instrumental_audio = np.sum(
        [sources[i].cpu().numpy() for i in range(len(source_names)) if i != vocals_idx],
        axis=0,
    )

    # Save using soundfile (no torchcodec needed)
    # Transpose from (channels, samples) to (samples, channels) for soundfile
    sf.write(str(vocals_path), vocals_audio.T, model.samplerate)
    sf.write(str(instrumental_path), instrumental_audio.T, model.samplerate)

    # Convert to mono 44100 Hz with ffmpeg
    for path in [vocals_path, instrumental_path]:
        tmp = path.with_suffix(".tmp.wav")
        path.rename(tmp)
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(tmp), "-ar", "44100", "-ac", "1", str(path)],
            capture_output=True, timeout=120, check=True,
        )
        tmp.unlink()

    return vocals_path, instrumental_path
