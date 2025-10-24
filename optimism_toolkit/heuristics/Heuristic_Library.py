"""Structure for tracking objectives and modifiers for a registered design type"""

import inspect
from copy import deepcopy
from typing import Dict, Callable, Optional, Union

from .Heuristic_Map import Heuristic_Map
from .Objective_Function import Objective_Function
from .heuristic_functions import Objective, Modifier, Heuristic_Type


class Heuristic_Library:
    """Library that Keeps track of all Registered Heuristics"""

    def __init__(self, library_name: str):
        self._library_name = library_name
        self._objectives: Dict[str: Objective] = {}
        self._modifiers: Dict[str: Modifier] = {}

    def get_objective(self, name: Union[str, Callable]) -> Objective:
        """
        :param name:
        :return: objective by name
        """
        if isinstance(name, str):
            return self._objectives[name]
        else:
            return self._objectives[Heuristic_Library.name_heuristic(name)]

    def get_modifier(self, name: Union[str, Callable]) -> Modifier:
        """
        :param name:
        :return: objective by name
        """
        if isinstance(name, str):
            return self._modifiers[name]
        else:
            return self._modifiers[Heuristic_Library.name_heuristic(name)]

    def add_function(self, heuristic_type: Heuristic_Type, function: Callable, name: Optional[str], deep_copy: bool = False, **function_kwargs):
        """
        Add function by type to library
        :param heuristic_type: Modifier or Objective
        :param function: function to register
        :param name: name of function or None if derived from function
        :param deep_copy: True if modifier deep copies designs first
        :param function_kwargs: keyword arguments to add to objective
        """
        if heuristic_type is Heuristic_Type.Modifier:
            self.add_modifier(function, name, deep_copy, **function_kwargs)
        else:
            self.add_objective(function, name, **function_kwargs)

    def add_objective(self, objective_callable: Callable, objective_name: Optional[str], **objective_kwargs):
        """
        :param objective_callable: callable to create objective from
        :param objective_name: name for objective or callable name if None
        :param objective_kwargs: keyword arguments to add to the objective
        """
        if objective_name is None:
            objective_name = self.name_heuristic(objective_callable)
        if objective_name in self._objectives:
            print(f"OPTIMISM Warning: overloading objective {objective_name}")
        if len(objective_kwargs) == 0:
            objective = Objective(objective_callable, objective_name)
        else:
            objective = Objective(lambda design: objective_callable(design, **objective_kwargs), objective_name)
        self._objectives[objective_name] = objective

    def add_modifier(self, modifier_callable: Callable, modifier_name: Optional[str], deep_copy: bool = False, **modifier_kwargs):
        """
        :param modifier_callable: callable to create modifier from
        :param modifier_name: name for modifier or callable name if None.
        :param deep_copy: if true, modifier will copy design before modification
        :param modifier_kwargs: keyword arguments to add to the modifier
        """
        if modifier_name is None:
            modifier_name = self.name_heuristic(modifier_callable)
        if len(modifier_kwargs) == 0:
            if deep_copy:
                def copy_and_modify_no_kwargs(design):
                    """
                    :param design: design to be copied and modify
                    :return: copy design then modify the copy
                    """
                    copied_design = deepcopy(design)
                    modifier_callable(copied_design)
                    return copied_design

                modifier = Modifier(copy_and_modify_no_kwargs, modifier_name)
            else:
                modifier = Modifier(modifier_callable, modifier_name)
        else:
            if deep_copy:
                def copy_and_modify(design):
                    """
                    :param design: design to be copied and modify
                    :return: copy design then modify the copy with modifier key word arguments
                    """
                    copied_design = deepcopy(design)
                    modifier_callable(copied_design, **modifier_kwargs)
                    return copied_design

                modifier = Modifier(copy_and_modify, modifier_name)
            else:
                modifier = Modifier(lambda design: modifier_callable(design, **modifier_kwargs), modifier_name)
        self._modifiers[modifier_name] = modifier

    @staticmethod
    def name_heuristic(function):
        """
        :param function: function to infer name from
        :return: inferred name of the heuristic function provided
        """
        if inspect.ismethod(function):
            function_name = function.__qualname__
        elif inspect.isfunction(function) or inspect.isclass(function):
            function_name = function.__name__
        else:
            assert False, f"{function} has not default name. Expected method, function, or callable class"

        if hasattr(function, "base_function"):  # modified heuristic function such as an inverted objective
            base_function_name = Heuristic_Library.name_heuristic(function.base_function)
            function_name = f"{function_name}.{base_function_name}"
        return function_name

    def uniform_objective_function(self) -> Objective_Function:
        """
        :return: Objective function with equal weights on all objectives
        """
        return Objective_Function({o: 1.0 for o in self._objectives})

    def uniform_heuristic_map(self) -> Heuristic_Map:
        """
        :return: heuristic map with equal weights on all modifier objective pairs
        """
        return Heuristic_Map({m: {o: 1.0 for o in self._objectives} for m in self._modifiers})
