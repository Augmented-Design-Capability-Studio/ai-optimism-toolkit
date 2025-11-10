from fastapi import APIRouter, HTTPException
from typing import List
from ..models.optimization import OptimizationProblem, OptimizationConfig
from ..services.optimization_service import OptimizationService

router = APIRouter(prefix="/optimization", tags=["optimization"])
optimization_service = OptimizationService()

@router.post("/problems/")
async def create_optimization_problem(problem: OptimizationProblem):
    try:
        return optimization_service.create_problem(problem)
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
        raise HTTPException(status_code=400, detail=str(e))
    
@router.delete("/problems/clear/")
async def clear_optimization_problems():
    return optimization_service.clear_problems()