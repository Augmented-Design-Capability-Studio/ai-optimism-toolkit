"""Progress tracking optimizer wrapper"""
from typing import Optional, Callable, Dict, TYPE_CHECKING, Any
import threading
import time

if TYPE_CHECKING:
    from optimism_toolkit.optimizer.Optimizer import Optimizer
    from optimism_toolkit.optimizer.Design_Population import Design_Population


class ProgressTrackingOptimizer:
    """
    Optimizer wrapper that tracks progress and reports it via callback.
    """
    
    def __init__(self, *args, progress_callback: Optional[Callable] = None, **kwargs):
        # Import here after path setup
        from optimism_toolkit.optimizer.Optimizer import Optimizer
        self._optimizer = Optimizer(*args, **kwargs)
        self.progress_callback = progress_callback
        self._population = None
        
    def _select_design(self, population):
        return self._optimizer._select_design(population)
    
    def _select_modifier(self, design_iteration, heuristic_map):
        return self._optimizer._select_modifier(design_iteration, heuristic_map)
    
    def _is_stop(self, design_iteration, design_population):
        return self._optimizer._is_stop(design_iteration, design_population)
        
    def optimize(
        self,
        objective_function,
        heuristic_map,
        seed_designs,
        max_iterations: int = 10000,
        population_cap: int = 1000
    ) -> Any:  # Design_Population but imported lazily
        """Override optimize to track progress"""
        from optimism_toolkit.optimizer.Design_Population import Design_Population
        population = Design_Population(objective_function, population_cap)
        self._population = population  # Store reference for progress tracking
        
        # Start progress reporting thread
        progress_thread = None
        stop_event = threading.Event()
        
        if self.progress_callback:
            def report_progress():
                while not stop_event.is_set():
                    try:
                        iteration = population.iteration_count
                        # Get best score from top iteration
                        best_score = None
                        if len(population) > 0:
                            top_iterations = population.top_N_iterations(1)
                            if top_iterations:
                                best_score = top_iterations[0].score
                        
                        if self.progress_callback:
                            self.progress_callback({
                                'iteration': iteration,
                                'max_iterations': max_iterations,
                                'best_score': best_score,
                                'status': 'running'
                            })
                        
                        # Check if optimization is complete
                        if iteration >= max_iterations:
                            break
                    except Exception as e:
                        print(f"Error reporting progress: {e}")
                    
                    stop_event.wait(0.5)  # Check every 0.5 seconds
            
            progress_thread = threading.Thread(target=report_progress, daemon=True)
            progress_thread.start()
        
        try:
            # Run the actual optimization loop (copied from Optimizer.optimize)
            # add starting designs to population
            for design in seed_designs:
                seed_iteration, new_seed = population.add_to_population(design)
                stop = self._is_stop(design_iteration=seed_iteration, design_population=population)
                if stop:
                    print(f"Reached Stopping Criteria in Seed Values {seed_iteration}")
                    return population

            assert len(population) > 0, f"No Seed Designs available"
            steps = 0
            while steps < max_iterations:
                prior_iteration = self._select_design(population)
                modifier = self._select_modifier(prior_iteration, heuristic_map)
                next_design = modifier(prior_iteration.design)
                next_iteration, new_iteration = population.add_to_population(next_design, prior_iteration, modifier)
                stop = self._is_stop(design_iteration=next_iteration, design_population=population)
                if stop:
                    print(f"Reached Stopping Criteria at {population.iteration_count} iterations")
                    return population
                else:
                    if new_iteration:
                        print(f"Found new design {next_iteration} by modifier: {modifier}")
                    else:
                        print(f"Revisited iteration{next_iteration.iteration} by modifier: {modifier}")
                steps += 1

            print(f"Warning: Optimizer did not converge before reaching {population.iteration_count} limit")
            
            # Send final progress update
            if self.progress_callback:
                best_score = None
                if len(population) > 0:
                    top_iterations = population.top_N_iterations(1)
                    if top_iterations:
                        best_score = top_iterations[0].score
                self.progress_callback({
                    'iteration': population.iteration_count,
                    'max_iterations': max_iterations,
                    'best_score': best_score,
                    'status': 'running'  # Will be updated to 'completed' by the router
                })
            
            return population
        finally:
            if progress_thread:
                stop_event.set()
                progress_thread.join(timeout=1.0)

