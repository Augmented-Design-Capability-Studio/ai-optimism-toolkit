from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import optimization, evaluate, sessions
from .database import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="AI Optimism Toolkit API", lifespan=lifespan)

# Configure CORS for frontend integration - MUST be before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(optimization.router, prefix="/api")

app.include_router(evaluate.router, prefix="/api/evaluate", tags=["evaluate"])

app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI Optimism Toolkit API"}