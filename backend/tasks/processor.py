import asyncio
from concurrent.futures import ThreadPoolExecutor
from backend.services.pipeline import process_song

_executor = ThreadPoolExecutor(max_workers=2)


async def run_processing(job_id: str, url: str):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, process_song, job_id, url)
