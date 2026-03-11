import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.api import auth, servers, console, players, scheduler, activity, dashboard, chat, commands, users
from app.database import engine
from app.rcon.manager import rcon_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    await scheduler.load_scheduled_jobs()
    logger.info("Garrison backend started")
    yield
    if scheduler.scheduler.running:
        scheduler.scheduler.shutdown(wait=False)
    await rcon_manager.close_all()
    await engine.dispose()
    logger.info("Garrison backend stopped")


app = FastAPI(title="Garrison", version="0.1.0", lifespan=lifespan)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(servers.router)
app.include_router(console.router)
app.include_router(players.router)
app.include_router(scheduler.router)
app.include_router(activity.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(commands.router)
app.include_router(users.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
