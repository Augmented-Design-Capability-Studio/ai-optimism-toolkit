"""library of modifier sorting functions for modifier selection"""
from typing import Iterable

from ...heuristics.Heuristic_Map import Heuristic_Map, Modifier_Keys, Objective_Modifier_Keys
from ...heuristics.heuristic_functions import Modifier, Objective
from ...optimizer.Design_Iteration import Design_Iteration


def sorted_by_modifier_applications(heuristic_map: Heuristic_Map, **_) -> Iterable[Modifier]:
    """
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by applications of the modifiers
    """
    return heuristic_map.sorted_modifiers[Modifier_Keys.Applications]


def sorted_by_modifier_unique_applications(heuristic_map: Heuristic_Map, **_) -> Iterable[Modifier]:
    """
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by unique applications of the modifiers
    """
    return heuristic_map.sorted_modifiers[Modifier_Keys.Unique_Applications]


def sorted_by_modifier_score_changes(heuristic_map: Heuristic_Map, **_) -> Iterable[Modifier]:
    """
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by score changes
    """
    return heuristic_map.sorted_modifiers[Modifier_Keys.Score_Changes]


def sorted_by_modifier_score_increases(heuristic_map: Heuristic_Map, **_) -> Iterable[Modifier]:
    """
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by score increases
    """
    return heuristic_map.sorted_modifiers[Modifier_Keys.Score_Increases]


def sorted_by_modifier_score_decreases(heuristic_map: Heuristic_Map, **_) -> Iterable[Modifier]:
    """
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by score decrease
    """
    return heuristic_map.sorted_modifiers[Modifier_Keys.Score_Decreases]


def sorted_by_modifier_objective_key(heuristic_map: Heuristic_Map, objective: Objective, sort_key: str, **_) -> Iterable[Modifier]:
    """

    :param heuristic_map: map of modifiers to objectives
    :param objective: objective to check scores
    :param sort_key: key name to access values by
    :return: modifiers sorted by given key
    """
    return heuristic_map.objective_sorted_modifiers[objective][sort_key]


def sorted_by_modifier_objective_changes(heuristic_map: Heuristic_Map, objective: Objective, **_) -> Iterable[Modifier]:
    """
    :param objective: objective to check scores
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by objective score changes
    """
    return heuristic_map.objective_sorted_modifiers[objective][Objective_Modifier_Keys.Score_Changes]


def sorted_modifier_objective_increase(heuristic_map: Heuristic_Map, objective: Objective, **_) -> Iterable[Modifier]:
    """
    :param objective: objective to check scores
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by objective score increases
    """
    return heuristic_map.objective_sorted_modifiers[objective][Objective_Modifier_Keys.Score_Increases]


def sorted_modifier_objective_decrease(heuristic_map: Heuristic_Map, objective: Objective, **_) -> Iterable[Modifier]:
    """
    :param objective: objective to check scores
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by objective score decreases
    """
    return heuristic_map.objective_sorted_modifiers[objective][Objective_Modifier_Keys.Score_Decreases]


def sorted_modifier_objective_value(heuristic_map: Heuristic_Map, objective: Objective, **_) -> Iterable[Modifier]:
    """
    :param objective: objective to check scores
    :param heuristic_map: map of modifiers to objectives
    :return: a sorted iterable of modifiers by value to objective
    """
    return heuristic_map.objective_sorted_modifiers[objective][Objective_Modifier_Keys.Value]


def sorted_modifier_by_most_important_objective(heuristic_map: Heuristic_Map, design_iteration: Design_Iteration, sort_key: str, **_) -> Iterable[Modifier]:
    """

    :param heuristic_map: map of modifiers to objectives
    :param design_iteration: design iteration to determine most important objective
    :param sort_key: key to sort modifiers by
    :return: modifiers sorted by sort key on most important objective to iteration
    """
    most_important, objective = design_iteration.objectives_by_scores[-1]
    return sorted_by_modifier_objective_key(heuristic_map, objective, sort_key)


def sorted_modifier_by_changes_on_lowest_scoring_objective(heuristic_map: Heuristic_Map,
                                                           design_iteration: Design_Iteration, **_) -> Iterable[Modifier]:
    """

    :param heuristic_map: map of modifiers to objectives
    :param design_iteration: iteration to be modified
    :return: modifiers sorted by their history of changing the lowest scoring objective in the iteration
    """
    lowest_score, objective = design_iteration.objectives_by_scores[0]
    return sorted_by_modifier_objective_changes(heuristic_map=heuristic_map, objective=objective)


def sorted_modifier_by_changes_on_most_important_objective(heuristic_map: Heuristic_Map,
                                                           design_iteration: Design_Iteration, **_) -> Iterable[Modifier]:
    """

    :param heuristic_map: map of modifiers to objectives
    :param design_iteration: iteration to be modified
    :return: modifiers sorted by their history of changing the most important objective to the iteration
    """
    most_important, objective = design_iteration.objectives_by_scores[-1]
    return sorted_by_modifier_objective_changes(heuristic_map=heuristic_map, objective=objective)


def sorted_modifier_by_value_to_lowest_scoring_objective(heuristic_map: Heuristic_Map,
                                                         design_iteration: Design_Iteration, **_) -> Iterable[Modifier]:
    """

    :param heuristic_map: map of modifiers to objectives
    :param design_iteration: iteration to be modified
    :return: modifiers sorted by value to objective that is scoring the lowest
    """
    lowest_score, objective = design_iteration.objectives_by_scores[0]
    return sorted_modifier_objective_value(heuristic_map, objective)
# todo Expected improvement modifier selector_functions
# todo apply all modifiers and select with a cache
