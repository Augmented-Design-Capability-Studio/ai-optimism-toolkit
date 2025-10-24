from typing import Callable

from .modifier_sorting_functions import (
    sorted_modifier_by_changes_on_lowest_scoring_objective,
    sorted_modifier_by_value_to_lowest_scoring_objective,
    sorted_modifier_by_changes_on_most_important_objective,
)
from ..selector_functions import Modifier_Selector


class Historically_Best_For_Lowest_Objective_Modifier(Modifier_Selector):
    """
        Return best performing modifier for the objective that is performing worst
    """

    def __init__(self, threshold_probability: Callable = lambda *args, **kwargs: 1.0):
        super().__init__("historically_best_modifier",
                         sort_function=sorted_modifier_by_changes_on_lowest_scoring_objective,
                         threshold_probability=threshold_probability,
                         reverse_sort=True)


class Historically_Best_For_Important_Objective_Modifier(Modifier_Selector):
    """
        Return best performing modifier for the objective that is performing worst
    """

    def __init__(self, threshold_probability: Callable = lambda *args, **kwargs: 1.0):
        super().__init__("historically_best_modifier",
                         sort_function=sorted_modifier_by_changes_on_most_important_objective,
                         threshold_probability=threshold_probability,
                         reverse_sort=True)


class Best_For_Lowest_Objective_Modifier(Modifier_Selector):
    """
        Return best performing modifier for the objective that is performing worst
    """

    def __init__(self, threshold_probability: Callable = lambda *args, **kwargs: 1.0):
        super().__init__("best_modifier_for_low_objective",
                         sort_function=sorted_modifier_by_value_to_lowest_scoring_objective,
                         threshold_probability=threshold_probability,
                         reverse_sort=True)
