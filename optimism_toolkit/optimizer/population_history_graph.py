"""Structures for tracking relationships between designs based on modification results"""

from typing import Dict, Iterable, List, Tuple

import networkx as nx

from ..heuristics.heuristic_functions import Modifier, Objective
from .Design_Iteration import Design_Iteration


class Design_Change:
    """
        Edge data for design change tracking
    """

    def __init__(self, prior_iteration: Design_Iteration, current_iteration: Design_Iteration):
        self.modifiers = set()
        self.score_change: float = current_iteration.score - prior_iteration.score
        self.score_increased: bool = self.score_change > 0
        self.score_decreased: bool = self.score_change < 0
        self.objective_changes: Dict[Objective: float] = {o: current_iteration.objective_scores[o] - prior_iteration.objective_scores[o] for o in prior_iteration.objective_scores}
        self.objective_increased: Dict[Objective: bool] = {o: c > 0 for o, c in self.objective_changes.items()}
        self.objective_decreased: Dict[Objective: bool] = {o: c < 0 for o, c in self.objective_changes.items()}

    def __iter__(self) -> Iterable[Objective]:
        return iter(self.objective_changes)

    def __contains__(self, modifier: Modifier):
        return modifier in self.modifiers


class Modification_History:
    """
        Directed graph for tracking changes to designs
    """

    def __init__(self):
        self.graph = nx.DiGraph()
        self.modifiers: List[Modifier] = []
        self.modifier_to_unique_applications: Dict[Modifier, int] = {}
        self.modifier_to_objective_differences: Dict[Modifier, Dict[Objective: float]] = {}
        self.modifier_to_score_differences: Dict[Modifier, float] = {}
        self.modifier_to_objective_increases: Dict[Modifier, Dict[Objective: int]] = {}
        self.modifier_to_score_increases: Dict[Modifier, int] = {}
        self.modifier_to_objective_decreases: Dict[Modifier, Dict[Objective: int]] = {}
        self.modifier_to_score_decreases: Dict[Modifier, int] = {}

    def add_design_iteration(self, iteration: Design_Iteration) -> bool:
        """
        :param iteration: design iteration to add as node (if not already there)
        :return True if node was added
        """
        if not self.graph.has_node(iteration):
            self.graph.add_node(iteration)
            return True
        return False

    def remove_iteration(self, iteration: Design_Iteration) -> bool:
        """
        Removes an iteration from the graph
        :param iteration: the iteration to remove
        :return: True if the iteration was found and removed
        """
        if iteration in self.graph.nodes:
            self.graph.remove_node(iteration)
            return True
        return False

    def add_edge(self, prior_iteration: Design_Iteration, current_iteration: Design_Iteration, modifier: Modifier) -> Tuple[Design_Change, bool]:
        """
        Creates an edge between two iterations
        :param prior_iteration: iteration that was modified
        :param current_iteration: modification result
        :param modifier: modifier applied
        """
        prior_new_node = self.add_design_iteration(prior_iteration)
        current_new_node = self.add_design_iteration(current_iteration)
        if prior_new_node or current_new_node or (not self.graph.has_edge(prior_iteration, current_iteration)):
            edge_data = Design_Change(prior_iteration, current_iteration)
            self.graph.add_edge(prior_iteration, current_iteration, edge_data=edge_data)
        else:
            edge_data = self._get_edge_data(prior_iteration, current_iteration)
        # update modifier applications
        new_modifier_on_edge = modifier not in edge_data.modifiers
        if new_modifier_on_edge:
            edge_data.modifiers.add(modifier)
        modifier.record_application(edge_data, new_modifier_on_edge)
        return self._get_edge_data(prior_iteration, current_iteration), new_modifier_on_edge

    def _get_edge_data(self, prior_iteration: Design_Iteration, current_iteration: Design_Iteration):
        return self.graph[prior_iteration][current_iteration]["edge_data"]
