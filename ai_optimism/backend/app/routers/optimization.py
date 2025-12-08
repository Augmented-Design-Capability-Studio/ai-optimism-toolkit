from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
from ..models.optimization import OptimizationProblem, OptimizationConfig, OptimizationRunDB
from ..services.optimization_service import OptimizationService
from sqlmodel import Session, select, col
from ..database import engine
from ..utils.common import generate_id
import json
import asyncio
import threading
from collections import defaultdict

router = APIRouter(tags=["optimization"])
optimization_service = OptimizationService()

# Store progress for active optimizations (in-memory, keyed by run_id)
# In production, consider using Redis for distributed systems
optimization_progress: Dict[str, Dict] = defaultdict(dict)
optimization_lock = threading.Lock()

# Track active optimizations for capacity management
MAX_CONCURRENT_OPTIMIZATIONS = 4  # Match Raspberry Pi 4 cores

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
async def execute_optimization(config: OptimizationConfig, background_tasks: BackgroundTasks):
    """Start optimization in background and return run_id immediately"""
    # Check if we're at capacity
    with optimization_lock:
        active_count = sum(
            1 for v in optimization_progress.values() 
            if v.get('status') == 'running'
        )
        
        if active_count >= MAX_CONCURRENT_OPTIMIZATIONS:
            raise HTTPException(
                status_code=503,
                detail=f"Server at capacity ({active_count}/{MAX_CONCURRENT_OPTIMIZATIONS} optimizations running). Please try again later."
            )
    
    # Generate run_id
    run_id = generate_id()
    
    # Initialize progress tracking
    with optimization_lock:
        optimization_progress[run_id] = {
            'run_id': run_id,
            'iteration': 0,
            'max_iterations': config.max_iterations,
            'best_score': None,
            'status': 'starting',
            'error': None
        }
    
    # Start optimization in background
    background_tasks.add_task(
        run_optimization_with_progress,
        config,
        run_id
    )
    
    return {
        "run_id": run_id,
        "status": "started",
        "message": "Optimization started. Use /execute/stream/{run_id} to get progress updates."
    }

def run_optimization_with_progress(config: OptimizationConfig, run_id: str):
    """Run optimization with progress tracking"""
    try:
        # Update status to running
        with optimization_lock:
            optimization_progress[run_id]['status'] = 'running'
        
        # Define progress callback
        def progress_callback(progress_data: Dict):
            with optimization_lock:
                optimization_progress[run_id].update({
                    'iteration': progress_data.get('iteration', 0),
                    'max_iterations': progress_data.get('max_iterations', config.max_iterations),
                    'best_score': progress_data.get('best_score'),
                    'status': progress_data.get('status', 'running')
                })
        
        # Run optimization with progress callback
        result = optimization_service.run_optimization(
            config,
            progress_callback=progress_callback,
            run_id=run_id
        )
        
        # Update with final results
        with optimization_lock:
            optimization_progress[run_id].update({
                'status': 'completed',
                'iteration': config.max_iterations,
                'best_score': result.get('best_design', {}).get('score') if result.get('best_design') else None,
                'results': result.get('results', []),
                'run_id': result.get('run_id', run_id),
                'heuristic_map': result.get('heuristic_map'),
                'objective_bounds': result.get('objective_bounds', {})  # Include bounds for normalization
            })
    
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Optimization error for run {run_id}: {error_msg}")
        print(traceback.format_exc())
        
        with optimization_lock:
            optimization_progress[run_id].update({
                'status': 'error',
                'error': error_msg
            })
    
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

@router.get("/execute/stream/{run_id}")
async def stream_optimization_progress(run_id: str):
    """Stream optimization progress via Server-Sent Events (SSE)"""
    async def event_generator():
        last_iteration = -1
        last_status = None
        
        while True:
            # Get current progress
            with optimization_lock:
                progress = optimization_progress.get(run_id, {}).copy()
            
            if not progress:
                # Run not found
                yield f"data: {json.dumps({'error': 'Optimization run not found', 'run_id': run_id})}\n\n"
                break
            
            current_status = progress.get('status')
            current_iteration = progress.get('iteration', 0)
            
            # Only send update if something changed
            if current_iteration > last_iteration or current_status != last_status:
                last_iteration = current_iteration
                last_status = current_status
                
                # Send progress update
                yield f"data: {json.dumps(progress)}\n\n"
            
            # Close stream when done
            if current_status in ['completed', 'error']:
                # Send final update and close
                yield f"data: {json.dumps(progress)}\n\n"
                break
            
            # Wait before next check (reduces CPU usage)
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.get("/execute/status/{run_id}")
async def get_optimization_status(run_id: str):
    """Get current status of an optimization run"""
    with optimization_lock:
        progress = optimization_progress.get(run_id)
    
    if not progress:
        raise HTTPException(status_code=404, detail="Optimization run not found")
    
    return progress

@router.get("/execute/status/")
async def get_server_status():
    """Get current server load and capacity"""
    with optimization_lock:
        active = sum(
            1 for v in optimization_progress.values() 
            if v.get('status') == 'running'
        )
        total = len(optimization_progress)
    
    return {
        "active_optimizations": active,
        "max_concurrent": MAX_CONCURRENT_OPTIMIZATIONS,
        "available_slots": MAX_CONCURRENT_OPTIMIZATIONS - active,
        "total_runs": total
    }