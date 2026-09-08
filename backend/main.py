"""
Main FastAPI application.
Initializes the server, JWT handler, and routes.
"""

import os
import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.config import Config
from starlette.middleware.sessions import SessionMiddleware

from auth import init_jwt_handler
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from services.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration
config = Config(str(Path(__file__).resolve().parents[1] / '.env'))

# Initialize FastAPI app
app = FastAPI(
    title="Commix API",
    description="Backend API for Commix application",
    version="1.0.0"
)

init_db()
logger.info("SQLite database initialized at %s", os.getenv("DATABASE_PATH", "backend/commix.db"))

# Configure CORS from a comma-separated deployment setting.
cors_origins = [
    origin.strip()
    for origin in config("CORS_ORIGINS", default="http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize JWT handler
jwt_secret = config('JWT_SECRET_KEY', default='your-secret-key-change-in-production')
init_jwt_handler(
    secret_key=jwt_secret,
    access_token_expire_minutes=30,
    refresh_token_expire_days=30
)
logger.info("JWT handler initialized")
app.add_middleware(SessionMiddleware, secret_key=jwt_secret, same_site="lax", https_only=False)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(chat_router, tags=["chat"])

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "commix-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
