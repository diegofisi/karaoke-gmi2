import traceback
from pathlib import Path
from backend.services.downloader import download_audio
from backend.services.separator import separate_vocals
from backend.services.transcriber import transcribe_vocals
from backend.services.romaji import add_romaji_to_transcription
from backend.services.pitch_extractor import extract_pitch
from backend.services.speaker_detector import detect_speakers

# In-memory job store
jobs: dict[str, dict] = {}


def update_job(job_id: str, **kwargs):
    if job_id in jobs:
        jobs[job_id].update(kwargs)


def process_song(job_id: str, url: str):
    """Full processing pipeline for a YouTube URL."""
    try:
        # Step 1: Download
        update_job(job_id, status="downloading", progress=5)
        audio_path, info = download_audio(url)
        video_id = info["video_id"]
        update_job(job_id, progress=15, title=info["title"], video_id=video_id,
                   duration=info["duration"])

        # Step 2: Separate vocals
        update_job(job_id, status="separating", progress=20)
        vocals_path, instrumental_path = separate_vocals(audio_path, video_id)
        update_job(job_id, progress=50,
                   vocals_path=str(vocals_path),
                   instrumental_path=str(instrumental_path))

        # Step 3: Transcribe lyrics
        update_job(job_id, status="transcribing", progress=55)
        transcription = transcribe_vocals(vocals_path, video_id)
        update_job(job_id, progress=75)

        # Step 4: Romaji conversion (if Japanese)
        update_job(job_id, status="converting_romaji", progress=76)
        transcription = add_romaji_to_transcription(transcription)
        update_job(job_id, progress=80)

        # Step 5: Speaker detection
        update_job(job_id, status="detecting_speakers", progress=82)
        segments, speakers_count = detect_speakers(
            vocals_path, transcription["segments"]
        )
        transcription["segments"] = segments
        update_job(job_id, progress=90, speakers_count=speakers_count)

        # Step 6: Pitch extraction
        update_job(job_id, status="extracting_pitch", progress=92)
        pitch_data = extract_pitch(vocals_path, video_id)
        update_job(job_id, progress=100)

        # Done
        update_job(
            job_id,
            status="ready",
            progress=100,
            language=transcription.get("language", "en"),
            lyrics=transcription["segments"],
            pitch_data=pitch_data,
        )

    except Exception as e:
        traceback.print_exc()
        update_job(job_id, status="error", error=str(e))
