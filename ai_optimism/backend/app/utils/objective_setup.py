"""Objective function setup and bounds estimation utilities"""
from typing import Dict, Optional, Tuple, Callable
import random
from ..models.optimization import OptimizationProblem, Objective
from ..utils.evaluation import safe_eval


def estimate_bounds(
    expr: str,
    variables: list,
    build_evaluation_context_func: Callable,
    samples: int = 500
) -> Tuple[Optional[float], Optional[float]]:
    """
    Estimate min/max bounds for an objective expression using sampling.
    
    Args:
        expr: The objective expression
        variables: List of variable definitions
        build_evaluation_context_func: Function to build evaluation context
        samples: Number of samples to use
    
    Returns:
        Tuple of (min, max) or (None, None) if estimation fails
    """
    lo = float('inf')
    hi = float('-inf')
    
    for _ in range(samples):
        sample = {}
        for v in variables:
            if v.type == 'categorical' and v.categories:
                # Use category index - will be converted by build_evaluation_context
                sample[v.name] = random.randint(0, len(v.categories) - 1)
            else:
                min_val = v.min if v.min is not None else 0
                max_val = v.max if v.max is not None else 100
                sample[v.name] = random.uniform(min_val, max_val)
        
        try:
            # Build complete evaluation context with variables, attributes, and properties
            eval_dict = build_evaluation_context_func(sample)
            val = float(safe_eval(expr, eval_dict))
            lo = min(lo, val)
            hi = max(hi, val)
        except Exception:
            continue
    
    if lo == float('inf') or hi == float('-inf'):
        return None, None
    return lo, hi


def create_objective_function(
    expr: str,
    goal: str,
    init_min: Optional[float],
    init_max: Optional[float],
    build_evaluation_context: Callable
) -> Callable:
    """
    Create an objective function evaluator with running min/max normalization.
    
    Args:
        expr: The objective expression
        goal: 'minimize' or 'maximize'
        init_min: Initial minimum value for normalization
        init_max: Initial maximum value for normalization
        build_evaluation_context_func: Function to build evaluation context
    
    Returns:
        Objective function that evaluates designs and returns normalized scores (0-1)
    """
    obs_min = init_min if init_min not in (None, float('inf')) else 0.0
    obs_max = init_max if init_max not in (None, float('-inf')) else 1.0

    def evaluate(design):
        design_dict = dict(design) if isinstance(design, tuple) else design
        
        # Build complete evaluation context with variables, attributes, and properties
        eval_dict = build_evaluation_context(design_dict)
        
        try:
            raw_val = float(safe_eval(expr, eval_dict))
        except Exception:
            return 0.0

        nonlocal obs_min, obs_max
        # Expand-only running min/max to avoid rapid rescaling
        if raw_val < obs_min:
            obs_min = raw_val
        if raw_val > obs_max:
            obs_max = raw_val

        # Min-max normalize to 0-1, avoid divide-by-zero
        if obs_max > obs_min:
            normalized = (raw_val - obs_min) / (obs_max - obs_min)
        else:
            normalized = 0.5

        # If this is a minimize objective, invert so smaller is better
        if goal == 'minimize':
            normalized = 1.0 - normalized

        # Clamp
        normalized = max(0.0, min(1.0, normalized))
        return normalized

    return evaluate

