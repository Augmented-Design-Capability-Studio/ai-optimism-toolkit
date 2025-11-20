from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import optimization, evaluate

app = FastAPI(title="AI Optimism Toolkit API")

# Configure CORS for frontend integration - MUST be before routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default
        "http://localhost:5173",  # Vite default
        "http://localhost:5174",  # Vite alternate
        "https://*.vercel.app",   # Vercel preview deployments
        # Add your production domain here after deployment:
        # "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(optimization.router, prefix="/api")

app.include_router(evaluate.router, prefix="/api/evaluate", tags=["evaluate"])

@app.get("/")
async def root():
    return {"message": "Welcome to AI Optimism Toolkit API"}