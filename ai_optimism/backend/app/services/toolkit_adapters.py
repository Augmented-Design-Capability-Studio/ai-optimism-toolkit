import random
import math
from typing import Any, Dict, List, Optional
from optimism_toolkit.heuristics.heuristic_functions import Modifier
from optimism_toolkit.selector_functions.selector_functions import Design_Selector, Modifier_Selector
from optimism_toolkit.optimizer.Design_Population import Design_Population
from optimism_toolkit.optimizer.Design_Iteration import Design_Iteration
from optimism_toolkit.heuristics.Heuristic_Map import Heuristic_Map

class ConfigurableModifier:
    """
    A modifier that applies a specific strategy to a single variable in the design.
    """
    def __init__(self, variable_name: str, strategy: Dict[str, Any], variable_config: Dict[str, Any], direction: str = 'random'):
        self.variable_name = variable_name
        self.strategy = strategy
        self.variable_config = variable_config
        self.type = strategy.get('type', 'gaussian')
        self.direction = direction
        
    def __call__(self, design: Any) -> Any:
        # Design is a tuple of (key, value) pairs - convert to dict
        design_dict = dict(design) if isinstance(design, tuple) else design
        
        # Create a copy of the design to modify
        new_design = design_dict.copy()
        current_value = new_design.get(self.variable_name)
        
        if current_value is None:
            return tuple(sorted(new_design.items()))
            
        # Apply modification based on strategy type
        if self.type == 'gaussian':
            sigma = self.strategy.get('sigma', 1.0)
            delta = abs(random.gauss(0, sigma))
            
            if self.direction == 'increase':
                new_value = current_value + delta
            elif self.direction == 'decrease':
                new_value = current_value - delta
            else: # random direction
                new_value = current_value + random.gauss(0, sigma)
            
        elif self.type == 'uniform':
            step = self.strategy.get('stepSize', 1.0)
            delta = abs(random.uniform(0, step))
            
            if self.direction == 'increase':
                new_value = current_value + delta
            elif self.direction == 'decrease':
                new_value = current_value - delta
            else: # random direction
                new_value = current_value + random.uniform(-step, step)
            
        elif self.type == 'random_reset':
            # For categorical or discrete, pick a random valid value
            if self.variable_config.get('type') == 'categorical':
                categories = self.variable_config.get('categories', [])
                if categories:
                    # Store index for categorical
                    new_value = random.randint(0, len(categories) - 1)
                else:
                    new_value = current_value
            else:
                # Random reset within bounds for numerical
                min_val = self.variable_config.get('min', 0)
                max_val = self.variable_config.get('max', 100)
                new_value = random.uniform(min_val, max_val)
                
        elif self.type == 'neighbor_step':
            # For discrete/categorical, move to adjacent value
            if self.variable_config.get('type') == 'categorical':
                categories = self.variable_config.get('categories', [])
                num_cats = len(categories)
                if num_cats > 1:
                    direction = random.choice([-1, 1])
                    new_value = (current_value + direction) % num_cats
                else:
                    new_value = current_value
            else:
                # Discrete numerical step
                if self.direction == 'increase':
                    step = 1
                elif self.direction == 'decrease':
                    step = -1
                else:
                    step = random.choice([-1, 1])
                new_value = current_value + step

        else:
            new_value = current_value

        # Clamp to bounds for numerical types
        if self.variable_config.get('type') in ['continuous', 'discrete']:
            min_val = self.variable_config.get('min', float('-inf'))
            max_val = self.variable_config.get('max', float('inf'))
            new_value = max(min_val, min(max_val, new_value))
            
            if self.variable_config.get('type') == 'discrete':
                new_value = round(new_value)

        new_design[self.variable_name] = new_value
        # Convert back to tuple for hashability
        return tuple(sorted(new_design.items()))

class SimpleDesignSelector(Design_Selector):
    """
    Selects the best design from the population to modify.
    """
    def __init__(self):
        # Sort by score (descending)
        super().__init__(
            name="BestDesignSelector",
            sort_function=lambda design_population: sorted(
                design_population.iterations, 
                key=lambda x: x.score, 
                reverse=True
            )
        )

class RandomModifierSelector(Modifier_Selector):
    """
    Randomly selects a modifier to apply.
    """
    def __init__(self):
        super().__init__(
            name="RandomModifierSelector",
            sort_function=lambda heuristic_map, design_iteration: list(heuristic_map.modifiers)
        )

class AdaptiveModifierSelector(Modifier_Selector):
    """
    Selects modifiers based on their past performance (impact on objectives).
    """
    def __init__(self):
        from optimism_toolkit.selector_functions.modifier_selectors.modifier_sorting_functions import sorted_modifier_by_most_important_objective
        
        def _sort_by_normalized_changes(heuristic_map, design_iteration):
            # Sort modifiers by their normalized impact on the most important objective
            # "changes_normalize_application" divides total change by number of applications
            return sorted_modifier_by_most_important_objective(
                heuristic_map, 
                design_iteration, 
                "changes_normalize_application"
            )

        super().__init__(
            name="AdaptiveModifierSelector",
            sort_function=_sort_by_normalized_changes,
            # 85% chance to pick best modifier, 15% chance to pick random (exploration)
            threshold_probability=lambda *args, **kwargs: 0.85
        )
