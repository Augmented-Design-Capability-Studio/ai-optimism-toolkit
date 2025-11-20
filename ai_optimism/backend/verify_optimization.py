import sys
import os
from typing import List, Optional

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from app.services.optimization_service import OptimizationService
from app.models.optimization import OptimizationProblem, OptimizationConfig, Variable, Objective, Constraint

def test_optimization():
    print("Initializing OptimizationService...")
    service = OptimizationService()

    # Create a simple problem: Minimize x^2 where -10 <= x <= 10
    print("Creating optimization problem...")
    problem = OptimizationProblem(
        name="Test Problem",
        description="Minimize x^2",
        variables=[
            Variable(
                name="x", 
                type="continuous", 
                min=-10, 
                max=10, 
                default=5, 
                description="Variable x",
                modifierStrategy={"type": "gaussian", "sigma": 1.0}
            )
        ],
        objectives=[
            Objective(
                name="minimize_x_squared",
                expression="x**2",
                goal="minimize",
                description="Minimize square of x"
            )
        ],
        constraints=[],
        properties=[]
    )

    # Register problem
    print("Registering problem...")
    result = service.create_problem(problem)
    problem_id = result["id"]
    print(f"Problem ID: {problem_id}")

    # Configure run
    config = OptimizationConfig(
        problem_id=problem_id,
        population_size=20,
        max_iterations=1000,
        convergence_threshold=0.001
    )

    # Run optimization
    print("Running optimization...")
    try:
        run_result = service.run_optimization(config)
        print("Optimization completed successfully!")
        print("Best Design:", run_result["best_design"])
        print("Results count:", len(run_result["results"]))
    except Exception as e:
        print(f"Optimization failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_optimization()
