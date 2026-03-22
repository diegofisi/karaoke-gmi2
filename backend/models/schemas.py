from pydantic import BaseModel, field_validator
from typing import Optional
import re


class SongRequest(BaseModel):
    url: str
    language: Optional[str] = None  # "ja", "en", "es", etc. None = auto-detect

    @field_validator("url")
    @classmethod
    def validate_youtube_url(cls, v: str) -> str:
        pattern = r"^(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)[\w-]+"
        if not re.match(pattern, v):
            raise ValueError("URL de YouTube no válida")
        return v


class SongStatus(BaseModel):
    id: str
    status: str  # pending, downloading, separating, transcribing, extracting_pitch, ready, error
    progress: int  # 0-100
    title: Optional[str] = None
    error: Optional[str] = None


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    romaji: Optional[str] = None
    speaker: int = 0


class LyricSegment(BaseModel):
    text: str
    start: float
    end: float
    words: list[WordTimestamp]
    speaker: int = 0
    romaji: Optional[str] = None


class SongData(BaseModel):
    id: str
    title: str
    duration: float
    language: str
    instrumental_url: str
    vocals_url: str
    lyrics: list[LyricSegment]
    pitch_data: dict
    speakers_count: int = 1
