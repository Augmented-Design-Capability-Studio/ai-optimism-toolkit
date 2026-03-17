# Repo reference (memory doc)

This is a **single-file snapshot** of the repo’s structure and “what runs where”, intended as a quick reference when you spin up a new-but-similar project.

## What this repo contains (high level)

- **`optimism_toolkit/`**: the underlying Python “OPTIMISM” toolkit (objectives/modifiers/heuristics, etc.). The root `README.md` describes the original toolkit concept and usage.
- **`ai_optimism/`**: a full web app built on top of the toolkit:
  - **`ai_optimism/backend/`**: FastAPI backend + SQLite/SQLModel persistence + optimization execution/progress tracking.
  - **`ai_optimism/frontend/`**: Next.js (App Router) + React + MUI UI with multiple client “versions” and a researcher/admin portal.

## Key entrypoints

### Backend (FastAPI)

- **App**: `ai_optimism/backend/app/main.py` creates the FastAPI app and mounts routers under `/api/*`.
- **Dev runner**: `ai_optimism/backend/run.py`
  - Loads `ai_optimism/backend/.env` and optional `.env.local`
  - Optionally starts a **Cloudflare Tunnel** (if `CLOUDFLARE_TUNNEL_NAME` is set)
  - Starts Uvicorn serving `app.main:app` on `0.0.0.0:8000` with reload
- **Health**: `GET /health`

Primary route groups (mounted in `app/main.py`):

- **Sessions**: `/api/sessions/*` (CRUD + messages + AI config)
- **Optimization**: `/api/optimization/*` (create problems, execute, stream progress, list runs)
- **Evaluate**: `/api/evaluate/*` (evaluation endpoints; see `ai_optimism/backend/app/routers/evaluate.py`)

### Frontend (Next.js)

- **Root UI hub**: `ai_optimism/frontend/app/page.tsx`
  - Routes to multiple client UIs: `/client/v1`, `/client/v2`, `/client/v3`
  - Routes to researcher portal: `/researcher`
- **Client v1 page**: `ai_optimism/frontend/app/client/v1/page.tsx`
  - 4-panel layout: Chat, Controls, Visualization, Optimization
  - Uses `useSessionManager()` to talk to backend session endpoints
- **Researcher portal**: `ai_optimism/frontend/app/researcher/page.tsx`
  - Session monitoring + messaging + admin actions

Edge runtime API routes (server-side Next “API” endpoints):

- `POST /api/chat` → `ai_optimism/frontend/app/api/chat/route.ts`
  - Fetches session AI config from backend (`/api/sessions/{id}/ai-config/key`)
  - Streams chat completion via `ai` + Google provider
- `POST /api/generate` → `ai_optimism/frontend/app/api/generate/route.ts`
  - Generates/validates “controls” schema (variables/objectives/constraints) with `zod`
  - Marked as **deprecated** in-file (controls now aggregated client-side)

## Important config / environment knobs

### Backend env (Cloudflare tunnel)

Template: `ai_optimism/backend/env.template`

- `CLOUDFLARE_TUNNEL_NAME`: enables tunnel startup in `run.py`
- `CLOUDFLARE_TUNNEL_DOMAIN` (optional): enables tunnel health checks via `https://<domain>/health`

### Frontend env (backend URL)

Used in API routes:

- `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:8000`)

## How to run (typical dev)

### Backend

- Install Python deps: `pip install -r requirements.txt`
- Run backend: `python ai_optimism/backend/run.py`
  - Uvicorn should listen on `http://localhost:8000`

### Frontend

In `ai_optimism/frontend/`:

- Install: `npm install`
- Dev: `npm run dev`

Frontend scripts live in `ai_optimism/frontend/package.json` (`dev`, `build`, `start`, `lint`).

## Folder map (annotated)

- `optimism_toolkit/`
  - Core toolkit modules (heuristics, selector functions, stopping criteria, etc.)
- `examples/`
  - Small python examples (e.g. `guess_the_number.py`)
- `ai_optimism/`
  - `backend/`
    - `run.py` (dev runner + optional Cloudflare tunnel)
    - `app/`
      - `main.py` (FastAPI app + router mounting)
      - `routers/` (sessions, optimization, evaluate, AI config, message endpoints)
      - `models/` (SQLModel models for sessions + optimization runs)
      - `services/` (optimization service, progress tracking, etc.)
      - `utils/` (encryption, session helpers, formatting, etc.)
    - `env.template`
  - `frontend/`
    - `app/` (Next.js App Router pages + API routes)
    - `src/`
      - `core/` (shared UI + services like `sessionManager`)
      - `clients/` (versioned UIs: v1/v2/v3 components, prompts)
      - `researcher/` (researcher dashboard components/hooks)
    - `next.config.mjs`
    - `package.json`

## “If I were starting a new repo variant…”

Common seams where you’ll likely change things:

- **Backend API surface**: `ai_optimism/backend/app/routers/*`
- **Session & persistence model**: `ai_optimism/backend/app/models/session.py` and `database.py`
- **Optimization execution flow**: `ai_optimism/backend/app/services/*` and `routers/optimization.py`
- **Frontend UX**: versioned clients under `ai_optimism/frontend/src/clients/*` and top-level pages under `ai_optimism/frontend/app/*`
- **Prompting / system instructions**: `ai_optimism/frontend/src/clients/prompts/*` and researcher UI

