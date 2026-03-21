from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DOWNLOADS_DIR = DATA_DIR / "downloads"
SEPARATED_DIR = DATA_DIR / "separated"
TRANSCRIPTIONS_DIR = DATA_DIR / "transcriptions"
PITCH_DIR = DATA_DIR / "pitch"

MAX_DURATION_SECONDS = 900  # 15 minutes
WHISPER_MODEL = "medium"
DEMUCS_MODEL = "htdemucs"

for d in [DOWNLOADS_DIR, SEPARATED_DIR, TRANSCRIPTIONS_DIR, PITCH_DIR]:
    d.mkdir(parents=True, exist_ok=True)
