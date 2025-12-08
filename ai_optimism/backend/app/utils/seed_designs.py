"""Seed design generation utilities for optimization"""
from typing import List, Tuple, Callable
import random
from ..models.optimization import OptimizationProblem
from ..utils.evaluation import safe_eval


def generate_seed_designs(
    problem: OptimizationProblem,
    population_size: int,
    build_evaluation_context_func: Callable,
    max_attempts: int = 1000
) -> List[Tuple]:
    """
    Generate constraint-aware seed designs for optimization.
    
    Args:
        problem: The optimization problem
        population_size: Target population size
        build_evaluation_context_func: Function to build evaluation context
        max_attempts: Maximum attempts to find valid design
    
    Returns:
        List of seed designs (as tuples for hashability)
    """
    seed_designs = []
    
    print(f"Generating seed designs with {len(problem.constraints or [])} constraints...")
    
    for seed_idx in range(min(10, population_size)):
        # Try to generate a valid design
        for attempt in range(max_attempts):
            design = {}
            for var in problem.variables:
                if var.type == 'categorical' and var.categories:
                    design[var.name] = random.randint(0, len(var.categories) - 1)
                else:
                    min_val = var.min if var.min is not None else 0
                    max_val = var.max if var.max is not None else 100
                    design[var.name] = random.uniform(min_val, max_val)
            
            # Check if design satisfies all constraints
            all_constraints_satisfied = True
            for constraint in (problem.constraints or []):
                try:
                    # Build complete evaluation context with variables, attributes, and properties
                    eval_dict = build_evaluation_context_func(design)
                    if not safe_eval(constraint.expression, eval_dict):
                        all_constraints_satisfied = False
                        break
                except Exception as e:
                    # If evaluation fails, treat as constraint violation
                    all_constraints_satisfied = False
                    break
            
            if all_constraints_satisfied:
                # Convert to tuple for hashability
                seed_designs.append(tuple(sorted(design.items())))
                print(f"  Seed {seed_idx + 1}: Valid design found on attempt {attempt + 1}")
                break
        else:
            # If we couldn't find a valid design, use a simple heuristic
            print(f"  Seed {seed_idx + 1}: Using heuristic design (couldn't find valid random)")
            design = {}
            for var in problem.variables:
                if var.type == 'categorical' and var.categories:
                    design[var.name] = 0  # Use first category
                else:
                    # Use middle of range
                    min_val = var.min if var.min is not None else 0
                    max_val = var.max if var.max is not None else 100
                    design[var.name] = (min_val + max_val) / 2
            seed_designs.append(tuple(sorted(design.items())))
    
    print(f"Generated {len(seed_designs)} seed designs")
    
    # Fallback if no valid seeds found
    if len(seed_designs) == 0:
        print("Warning: Could not generate valid seed designs. Proceeding with random invalid seeds.")
        for _ in range(min(10, population_size)):
            design = {}
            for var in problem.variables:
                if var.type == 'categorical' and var.categories:
                    design[var.name] = 0
                else:
                    min_val = var.min if var.min is not None else 0
                    max_val = var.max if var.max is not None else 100
                    design[var.name] = random.uniform(min_val, max_val)
            seed_designs.append(tuple(sorted(design.items())))
    
    return seed_designs

