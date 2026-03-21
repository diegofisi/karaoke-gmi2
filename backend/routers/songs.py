import uuid
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from backend.models.schemas import SongRequest, SongStatus, SongData
from backend.services.pipeline import jobs, update_job
from backend.tasks.processor import run_processing
from backend.config import SEPARATED_DIR

router = APIRouter(prefix="/api/songs", tags=["songs"])


@router.post("/", response_model=SongStatus)
async def create_song(request: SongRequest):
    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "id": job_id,
        "status": "pending",
        "progress": 0,
        "title": None,
        "error": None,
    }

    asyncio.create_task(run_processing(job_id, request.url))

    return SongStatus(id=job_id, status="pending", progress=0)


@router.get("/{job_id}/status", response_model=SongStatus)
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    job = jobs[job_id]
    return SongStatus(
        id=job_id,
        status=job.get("status", "pending"),
        progress=job.get("progress", 0),
        title=job.get("title"),
        error=job.get("error"),
    )


@router.get("/{job_id}/data")
async def get_data(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    job = jobs[job_id]

    if job.get("status") != "ready":
        raise HTTPException(status_code=400, detail=f"Estado actual: {job.get('status')}")

    return {
        "id": job_id,
        "title": job.get("title", ""),
        "duration": job.get("duration", 0),
        "language": job.get("language", "en"),
        "instrumental_url": f"/api/songs/{job_id}/audio/instrumental",
        "vocals_url": f"/api/songs/{job_id}/audio/vocals",
        "lyrics": job.get("lyrics", []),
        "pitch_data": job.get("pitch_data", {}),
        "speakers_count": job.get("speakers_count", 1),
    }


@router.get("/{job_id}/audio/{track}")
async def get_audio(job_id: str, track: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job no encontrado")

    job = jobs[job_id]

    if track == "instrumental":
        path = job.get("instrumental_path")
    elif track == "vocals":
        path = job.get("vocals_path")
    else:
        raise HTTPException(status_code=400, detail="Track debe ser 'instrumental' o 'vocals'")

    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Archivo de audio no encontrado")

    return FileResponse(path, media_type="audio/wav")
