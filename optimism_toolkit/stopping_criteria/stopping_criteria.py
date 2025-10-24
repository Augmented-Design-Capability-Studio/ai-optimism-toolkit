"""Library of Stopping Criteria for optimizer"""
from typing import Callable, Iterable

from ..optimizer.Design_Iteration import Design_Iteration
from ..optimizer.Design_Population import Design_Population


def stop_at_N_iterations(design_population: Design_Population, n=1000, **_) -> bool:
    """
    :param design_population: population created during optimization
    :param n: number of iterations to stop at
    :param _: spare kwargs
    :return: true if the current iteration count is equal to n
    """
    return design_population.iteration_count == n


def stop_at_threshold_score(design_iteration: Design_Iteration, design_population: Design_Population, threshold_portion: float = 1.0, **_) -> bool:
    """
    :param design_iteration: last iteration created
    :param design_population: population of designs so far
    :param threshold_portion: portion of a perfect score to stop at
    :param _: spare kwargs
    :return:
    """
    return design_population.portion_perfect_score(design_iteration) >= threshold_portion


def stop_if_any_criteria_met(design_iteration: Design_Iteration, design_population: Design_Population, criteria: Iterable[Callable], **_) -> bool:
    """
    :param design_iteration: last iteration created
    :param design_population: population of designs so far
    :param criteria: iterable of stopping criteria functions to consider
    :param _: spare kwargs
    :return: stop if any criteria is met
    """
    for stop_criteria in criteria:
        if stop_criteria(design_iteration=design_iteration, design_population=design_population):
            return True
    return False


def stop_if_all_criteria_met(design_iteration: Design_Iteration, design_population: Design_Population, criteria: Iterable[Callable], **_) -> bool:
    """
    :param design_iteration: last iteration created
    :param design_population: population of designs so far
    :param criteria: iterable of stopping criteria functions to consider
    :param _: spare kwargs
    :return: stop if all criteria ar met
    """
    for stop_criteria in criteria:
        if not stop_criteria(design_iteration=design_iteration, design_population=design_population):
            return False
    return True
