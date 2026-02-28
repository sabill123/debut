import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.routers import session, blueprint, image, music, teaser

# Configure logging for all src.* modules
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(
    title="Debut API",
    version="1.0.0",
    description="Virtual Idol Debut Simulator — Gemini 3 Seoul Hackathon",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router, prefix="/api/session", tags=["session"])
app.include_router(blueprint.router, prefix="/api/blueprint", tags=["blueprint"])
app.include_router(image.router, prefix="/api/image", tags=["image"])
app.include_router(music.router, prefix="/api/music", tags=["music"])
app.include_router(teaser.router, prefix="/api/teaser", tags=["teaser"])


# Serve generated assets (images, videos, audio) as static files
ASSETS_DIR = Path(__file__).parent.parent / "assets"
ASSETS_DIR.mkdir(exist_ok=True)
app.mount("/api/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "Debut", "version": "1.0.0"}
