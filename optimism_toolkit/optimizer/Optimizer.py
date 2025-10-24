"""The core optimization structure"""
from typing import Callable, Iterable

from ..heuristics.Heuristic_Map import Heuristic_Map
from ..heuristics.Objective_Function import Objective_Function
from ..heuristics.heuristic_functions import Modifier
from .Design_Iteration import Design_Iteration
from .Design_Population import Design_Population
from ..selector_functions.selector_functions import Design_Selector, Modifier_Selector


class Optimizer:
    """
        Control structure for a metaheuristic optimization process
    """
    def __init__(self, design_selector: Design_Selector, modifier_selector: Modifier_Selector, stopping_criteria: Callable):
        self._design_selector: Design_Selector = design_selector
        self._modifier_selector: Modifier_Selector = modifier_selector
        self._stopping_criteria: Callable = stopping_criteria

    def _select_design(self, design_population: Design_Population) -> Design_Iteration:
        design = self._design_selector.select_value(design_population)
        return design

    def _select_modifier(self, design_iteration: Design_Iteration, heuristic_map: Heuristic_Map) -> Modifier:
        return self._modifier_selector.select_value(design_iteration, heuristic_map)

    def _is_stop(self, design_iteration: Design_Iteration, design_population: Design_Population) -> bool:
        return self._stopping_criteria(design_iteration=design_iteration, design_population=design_population)

    def optimize(self, objective_function: Objective_Function, heuristic_map: Heuristic_Map,
                 seed_designs: Iterable,
                 max_iterations: int = 10000, population_cap: int = 1000) -> Design_Population:
        """
        :param objective_function:
        :param heuristic_map:
        :param seed_designs:
        :param max_iterations:
        :param population_cap:
        :return:
        """
        population = Design_Population(objective_function, population_cap)

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
            # todo check modifier cache
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
        return population
