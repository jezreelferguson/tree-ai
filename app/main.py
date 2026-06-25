from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.routes.chat import router

app = FastAPI(
    title="Tree AI — Health Consultant",
    description="An AI-powered health consultant, advisor, and assistant backed by WHO World Health Statistics.",
    version="1.0.0",
)

# ── CORS (allow frontend on any port during development) ─────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ───────────────────────────────────────────────────────
app.include_router(router, prefix="/api")

# ── Serve the frontend ──────────────────────────────────────────────
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "message": "Tree AI Health Advisor — API is running",
            "docs": "/docs",
        }