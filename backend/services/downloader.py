import subprocess
import sys
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from backend.config import DOWNLOADS_DIR, MAX_DURATION_SECONDS

# Use the same Python interpreter to call yt-dlp as a module
PYTHON = sys.executable


def clean_youtube_url(url: str) -> str:
    """Remove playlist and tracking parameters, keep only the video."""
    parsed = urlparse(url)

    # Handle youtu.be short URLs
    if "youtu.be" in parsed.netloc:
        video_id = parsed.path.strip("/").split("/")[0]
        return f"https://www.youtube.com/watch?v={video_id}"

    # Handle youtube.com URLs — strip list, index, etc.
    params = parse_qs(parsed.query)
    clean_params = {}
    if "v" in params:
        clean_params["v"] = params["v"][0]

    return urlunparse((
        parsed.scheme, parsed.netloc, parsed.path,
        "", urlencode(clean_params), ""
    ))


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:v=|youtu\.be/|shorts/)([\w-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("No se pudo extraer el ID del video")


def get_video_info(url: str) -> dict:
    url = clean_youtube_url(url)
    result = subprocess.run(
        [PYTHON, "-m", "yt_dlp", "--dump-json", "--no-download", "--no-playlist", url],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        raise RuntimeError(f"Error obteniendo info del video: {result.stderr}")
    return json.loads(result.stdout)


def download_audio(url: str) -> tuple[Path, dict]:
    url = clean_youtube_url(url)
    info = get_video_info(url)
    duration = info.get("duration", 0)

    if duration > MAX_DURATION_SECONDS:
        raise ValueError(
            f"El video dura {duration}s, máximo permitido es {MAX_DURATION_SECONDS}s (15 min)"
        )

    video_id = extract_video_id(url)
    title = info.get("title", video_id)
    output_path = DOWNLOADS_DIR / f"{video_id}.wav"

    if not output_path.exists():
        subprocess.run(
            [
                PYTHON, "-m", "yt_dlp",
                "--no-playlist",
                "-x", "--audio-format", "wav",
                "--audio-quality", "0",
                "--postprocessor-args", "ffmpeg:-ar 44100 -ac 1",
                "-o", str(DOWNLOADS_DIR / f"{video_id}.%(ext)s"),
                url,
            ],
            capture_output=True, text=True, timeout=300,
            check=True,
        )

    return output_path, {"title": title, "duration": duration, "video_id": video_id}
