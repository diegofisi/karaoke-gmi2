from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.songs import router as songs_router
from backend.services.library import cleanup_orphans

app = FastAPI(title="Karaoke App", version="1.0.0")

# Clean up orphaned data files on startup
cleanup_orphans()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(songs_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
