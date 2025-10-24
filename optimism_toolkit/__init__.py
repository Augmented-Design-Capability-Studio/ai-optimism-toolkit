"""
Optimism Toolkit - A package for optimizing designs using heuristic functions.

This package provides tools for optimizing designs using heuristic functions, modifiers,
and objective functions. The main components are organized into several submodules:

- heuristics: Core functionality for defining and managing heuristic functions
- optimizer: Design optimization engine and population management
- selector_functions: Selection strategies for designs and modifiers
- stopping_criteria: Conditions for terminating optimization

For examples, see the examples/ directory in the package root.
"""

# Import key functionality but maintain explicit module paths for clarity
from .heuristics import (
    heuristic_functions,
    Heuristic_Map,
    Objective_Function,
    heuristic_registration,
)

from .optimizer import (
    Optimizer,
    Design_Population,
    Design_Iteration,
)

from .selector_functions.design_selectors import design_selectors
from .selector_functions.modifier_selectors import modifier_selectors, modifier_sorting_functions
from .selector_functions import selector_functions

from .stopping_criteria import stopping_criteria

# Define what should be accessible when doing 'from optimism_toolkit import *'
__all__ = [
    # Main modules for easy access
    'heuristic_functions',
    'Heuristic_Map',
    'Objective_Function',
    'heuristic_registration',
    'Optimizer',
    'Design_Population',
    'Design_Iteration',
    'design_selectors',
    'modifier_selectors',
    'modifier_sorting_functions',
    'selector_functions',
    'stopping_criteria',
]
