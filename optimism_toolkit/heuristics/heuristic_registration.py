"""Code base for registering objectives and modifiers from a class or set of functions for a specific domain area"""

from typing import Callable, Optional, Tuple

from .Heuristic_Library import Heuristic_Library
from .heuristic_functions import Heuristic_Type


def make_heuristic_library(library_name: str) -> Tuple[Callable, Heuristic_Library]:
    """
    :return: a decorator function with a heuristic_library parameter that tracks decorated functions by given function name
    """
    heuristic_library: Heuristic_Library = Heuristic_Library(library_name)

    def heuristic_decorator(heuristic_type: Heuristic_Type, name: Optional[str] = None, deep_copy: bool = False, **function_kwargs) -> Callable:
        """
        :param heuristic_type: Modifier or Objective
        :param name: name of function or None if derived from function
        :param deep_copy: True if modifier deep copies designs first
        :param function_kwargs: keyword arguments to add to objective
        :return: the decorator that registers functions in heuristic_library
        """

        def registrar(function: Callable) -> Callable:
            """
            adds decorated function to heuristic_library
            :param function: function to register
            :return: the decorated function
            """
            heuristic_library.add_function(heuristic_type, function, name, deep_copy, **function_kwargs)
            return function

        return registrar

    heuristic_decorator.registry = heuristic_library
    return heuristic_decorator, heuristic_library
