from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import optimization, ai_provider

app = FastAPI(title="AI Optimism Toolkit API")

# Include routers
app.include_router(optimization.router)
app.include_router(ai_provider.router)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI Optimism Toolkit API"}