"""Library of Design Selectors"""
from typing import Callable

from .design_sorting_functions import sorted_by_score
from ..selector_functions import Design_Selector


class Highest_Scoring_Design(Design_Selector):
    """
        Design selector that takes the highest scoring design
    """
    def __init__(self, threshold_probability: Callable = lambda *args, **kwargs: 1.0):
        super().__init__("highest_scoring_design", sorted_by_score, threshold_probability=threshold_probability, reverse_sort=True)
