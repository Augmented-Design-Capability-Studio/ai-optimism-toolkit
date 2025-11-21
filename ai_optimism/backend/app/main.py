from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import optimization, evaluate, sessions

app = FastAPI(title="AI Optimism Toolkit API")

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