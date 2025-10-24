"""Base structure for selecting from designs or modifiers"""
import random
from enum import Enum
from typing import Callable, Optional, Any, Reversible

from ..heuristics.Heuristic_Map import Heuristic_Map
from ..heuristics.heuristic_functions import Modifier
from ..optimizer.Design_Iteration import Design_Iteration
from ..optimizer.Design_Population import Design_Population


class Selector_Type(Enum):
    """
    Enumeration of heuristic function types
    """
    Design = "design"
    Modifier = "modifier"


class Selector_Function:
    """
        Structure for managing heuristic functions
    """

    def __init__(self, name: str, selector_type: Selector_Type,
                 sort_function: Optional[Callable] = None, threshold_probability: Callable = lambda *args, **kwargs: 1.0,
                 reverse_sort=False):
        """
        :param reverse_sort:
        :param name:
        :param selector_type:
        :param threshold_probability: a function for calculating acceptance threshold or a static float acceptance threshold
        """
        self.reverse_sort = reverse_sort
        self._selector_type: Selector_Type = selector_type
        self._name: str = name
        self._threshold_probability: Callable = threshold_probability
        self._sort_function: Optional[Callable] = sort_function

    @property
    def name(self) -> str:
        """
        :return: name of the heuristic function
        """
        return self._name

    @property
    def is_design(self) -> bool:
        """
        :return: True if is an objective
        """
        return self._selector_type is Selector_Type.Design

    @property
    def is_modifier(self) -> bool:
        """
        :return: True if is a modifier
        """
        return self._selector_type is Selector_Type.Modifier

    def _select_value(self, values: Reversible):
        """
        :return: a value from the values list
        """
        last_value = None
        iteration = enumerate(values)
        if self.reverse_sort:
            iteration = enumerate(reversed(values))
        for i, value in iteration:
            threshold = self._threshold_probability(index=i, value=value)
            assert 0.0 <= threshold <= 1.0, f"Acceptance probability threshold must be between 0 and 1 but got {threshold}"
            acceptance_probability = random.uniform(0, 1.0)
            if acceptance_probability <= threshold:
                return value
            else:
                last_value = value
        print(f"Warning: no values met selection threshold, returning last value")
        return last_value

    def __str__(self):
        return f"{self._selector_type.value}:{self.name}"

    def __hash__(self):
        return hash(self.name)

    def __repr__(self):
        return str(self)


class Design_Selector(Selector_Function):
    """
        Control Structure to select designs from the design population
    """

    def __init__(self, name: str, sort_function: Callable, threshold_probability: Callable = lambda *args, **kwargs: 1.0, reverse_sort=False):
        super().__init__(name, Selector_Type.Design, sort_function, threshold_probability, reverse_sort=reverse_sort)

    def select_value(self, design_population: Design_Population) -> Any:
        """
        :param design_population: design population to select from
        :return: a design to modify
        """
        values = self._sort_function(design_population=design_population)
        return self._select_value(values)


class Modifier_Selector(Selector_Function):
    """
        Control Structure to select modifiers from heuristic map
    """

    def __init__(self, name: str, sort_function: Callable, threshold_probability: Callable = lambda *args, **kwargs: 1.0, reverse_sort=False):
        super().__init__(name, Selector_Type.Modifier, sort_function, threshold_probability, reverse_sort=reverse_sort)

    def select_value(self, design_iteration: Design_Iteration, heuristic_map: Heuristic_Map) -> Modifier:
        """
        :param design_iteration: iteration to be modified
        :param heuristic_map: heuristic map to source designs from
        :return: a modifier to apply to iteration
        """
        values = self._sort_function(heuristic_map=heuristic_map, design_iteration=design_iteration)
        return self._select_value(values)
