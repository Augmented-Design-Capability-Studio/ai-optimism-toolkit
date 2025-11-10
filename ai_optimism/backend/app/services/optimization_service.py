from typing import List, Dict
from ..models.optimization import OptimizationProblem, OptimizationConfig

class OptimizationService:
    def __init__(self):
        self.problems: Dict[str, OptimizationProblem] = {}
    
    def create_problem(self, problem: OptimizationProblem) -> Dict:
        problem_id = str(len(self.problems) + 1)
        self.problems[problem_id] = problem
        return {"id": problem_id, "problem": problem}
    
    def list_problems(self) -> List[Dict]:
        return [{"id": k, "problem": v} for k, v in self.problems.items()]
    
    def run_optimization(self, config: OptimizationConfig) -> Dict:
        if config.problem_id not in self.problems:
            raise ValueError("Problem not found")
            
        problem = self.problems[config.problem_id]
        
        # For now, just return the configuration and problem details
        return {
            "status": "success",
            "message": "Placeholder: Optimization received",
            "config": {
                "problem_id": config.problem_id,
                "population_size": config.population_size,
                "max_iterations": config.max_iterations,
                "convergence_threshold": config.convergence_threshold
            },
            "problem": {
                "name": problem.name,
                "variables": problem.variables,
                "constraints": problem.constraints
            }
        }

    def clear_problems(self) -> Dict:
        self.problems.clear()
        return {
            "status": "success", 
            "message": "All problems cleared"
        }