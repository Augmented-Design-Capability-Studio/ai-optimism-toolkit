"""Example optimization code that guess a target number between 0 and 100"""

import random

from optimism_toolkit.heuristics.Heuristic_Map import Heuristic_Map
from optimism_toolkit.heuristics.Objective_Function import Objective_Function
from optimism_toolkit.heuristics.heuristic_functions import Objective, Modifier, Heuristic_Type
from optimism_toolkit.heuristics.heuristic_registration import make_heuristic_library
from optimism_toolkit.optimizer.Optimizer import Optimizer
from optimism_toolkit.selector_functions.design_selectors.design_selectors import Highest_Scoring_Design
from optimism_toolkit.selector_functions.modifier_selectors.modifier_selectors import Best_For_Lowest_Objective_Modifier
from optimism_toolkit.stopping_criteria.stopping_criteria import (
    stop_if_any_criteria_met,
    stop_at_threshold_score,
    stop_at_N_iterations,
)

target_number = random.randint(0, 100)
print(f"Target == {target_number}")

guess_number_heuristic, guess_number_heuristic_library = make_heuristic_library("Guess A Number")


@guess_number_heuristic(Heuristic_Type.Objective, target=target_number)
def less_than_number(number: int, target: int) -> float:
    """
    :param number: number that is guessed
    :param target: target number to guess
    :return: 1 if n>t or distances from n to t
    """
    if number >= target:
        return 1.0
    else:
        return 1.0 - ((target - number) / 100)


@guess_number_heuristic(Heuristic_Type.Objective, target=target_number)
def greater_than_number(number: int, target: int) -> float:
    """
    :param number: number that is guessed
    :param target: target number to guess
    :return: 1 if n<t or distances from n to t
    """
    if number <= target:
        return 1.0
    else:
        return 1.0 - ((number - target) / 100)


@guess_number_heuristic(Heuristic_Type.Modifier)
def increment(number: int) -> int:
    """
    :param number: number to increment.
    :return: incremented number by 1
    """
    return min(number + 1, 100)


@guess_number_heuristic(Heuristic_Type.Modifier)
def decrement(number: int) -> int:
    """
    :param number: number to decrement.
    :return: decremented number by 1
    """
    return max(number - 1, 0)


def _guess_the_number():
    """
    Generate a
    :return: Discovered Design population
    """
    le_objective = Objective(lambda number: less_than_number(number, target_number), name='le')
    ge_objective = Objective(lambda number: greater_than_number(number, target_number), name='ge')
    objective_function = Objective_Function({le_objective: 1.0,
                                             ge_objective: 1.0})
    heuristic_map = Heuristic_Map({Modifier(increment): {le_objective: 1.0},
                                   Modifier(decrement): {ge_objective: 1.0}})

    design_selector = Highest_Scoring_Design()
    modifier_selector = Best_For_Lowest_Objective_Modifier()
    stopping_criteria = lambda design_iteration, design_population: stop_if_any_criteria_met(design_iteration=design_iteration,
                                                                                             design_population=design_population,
                                                                                             criteria=[stop_at_threshold_score, stop_at_N_iterations])

    guesses = [random.randint(0, 100)]
    optimizer = Optimizer(design_selector, modifier_selector, stopping_criteria)
    population = optimizer.optimize(objective_function, heuristic_map, guesses)
    return population.top_N_iterations(1)


def guess_the_number():
    """
    Optimize guess at target number
    :return: top iteration from population
    """
    objective_function = Objective_Function()
    le_objective = guess_number_heuristic_library.get_objective(less_than_number)
    objective_function.add_objective_by_weight(le_objective, 1.0)
    ge_objective = guess_number_heuristic_library.get_objective(greater_than_number)
    objective_function.add_objective_by_weight(ge_objective, 1.0)
    increment_modifier = guess_number_heuristic_library.get_modifier(increment)
    decrement_modifier = guess_number_heuristic_library.get_modifier(decrement)
    # heuristic_map = Heuristic_Map({increment_modifier: {le_objective: 1.0},
    #                                decrement_modifier: {ge_objective: 1.0}})
    heuristic_map = Heuristic_Map({})
    heuristic_map.add_heuristic(le_objective, increment_modifier, 1.0)
    heuristic_map.add_heuristic(ge_objective, decrement_modifier, 1.0)

    design_selector = Highest_Scoring_Design()
    modifier_selector = Best_For_Lowest_Objective_Modifier()
    stopping_criteria = lambda design_iteration, design_population: stop_if_any_criteria_met(design_iteration=design_iteration,
                                                                                             design_population=design_population,
                                                                                             criteria=[stop_at_threshold_score, stop_at_N_iterations])

    guesses = [random.randint(0, 100) for _ in range(0, 10)]
    optimizer = Optimizer(design_selector, modifier_selector, stopping_criteria)
    population = optimizer.optimize(objective_function, heuristic_map, guesses)
    return population.top_N_iterations(1)


print(f"Guessed: {guess_the_number()[0].design}")
