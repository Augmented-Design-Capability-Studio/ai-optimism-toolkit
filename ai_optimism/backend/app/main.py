from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import optimization

app = FastAPI(title="AI Optimism Toolkit API")

# Include routers
app.include_router(optimization.router)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI Optimism Toolkit API"}