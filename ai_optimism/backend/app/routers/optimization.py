from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.optimization import OptimizationProblem, OptimizationConfig, OptimizationRunDB
from ..services.optimization_service import OptimizationService
from sqlmodel import Session, select, col
from ..database import engine

router = APIRouter(tags=["optimization"])
optimization_service = OptimizationService()

@router.post("/problems/")
async def create_optimization_problem(
    problem: OptimizationProblem,
    session_id: Optional[str] = Query(None, description="Optional session ID to link problem to session")
):
    try:
        return optimization_service.create_problem(problem, session_id=session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/problems/")
async def list_optimization_problems():
    return optimization_service.list_problems()

@router.post("/execute/")
async def execute_optimization(config: OptimizationConfig):
    try:
        return optimization_service.run_optimization(config)
    except Exception as e:
        import traceback
        print(f"Optimization error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))
    
@router.delete("/problems/clear/")
async def clear_optimization_problems():
    return optimization_service.clear_problems()

@router.get("/runs/")
async def list_optimization_runs(
    session_id: Optional[str] = Query(None, description="Filter by session ID")
):
    """List optimization runs, optionally filtered by session"""
    from sqlmodel import col
    with Session(engine) as db:
        if session_id:
            statement = select(OptimizationRunDB).where(
                OptimizationRunDB.session_id == session_id
            ).order_by(col(OptimizationRunDB.started_at).desc())
        else:
            statement = select(OptimizationRunDB).order_by(
                col(OptimizationRunDB.started_at).desc()
            )
        
        runs = db.exec(statement).all()
        return [{
            "id": run.id,
            "problem_id": run.problem_id,
            "session_id": run.session_id,
            "config": run.config,
            "heuristic_weights": run.heuristic_weights,
            "results": run.results,
            "heuristic_map": run.heuristic_map,
            "status": run.status,
            "started_at": run.started_at,
            "completed_at": run.completed_at,
            "error_message": run.error_message,
        } for run in runs]

@router.get("/runs/{run_id}")
async def get_optimization_run(run_id: str):
    """Get a specific optimization run by ID"""
    with Session(engine) as db:
        run = db.get(OptimizationRunDB, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Optimization run not found")
        
        return {
            "id": run.id,
            "problem_id": run.problem_id,
            "session_id": run.session_id,
            "config": run.config,
            "heuristic_weights": run.heuristic_weights,
            "results": run.results,
            "heuristic_map": run.heuristic_map,
            "status": run.status,
            "started_at": run.started_at,
            "completed_at": run.completed_at,
            "error_message": run.error_message,
        }