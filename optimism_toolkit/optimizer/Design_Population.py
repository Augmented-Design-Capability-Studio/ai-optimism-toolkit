"""Data Structure for keeping track of designs created in an optimization process"""
from enum import Enum
from typing import Optional, Tuple, Dict, Any, Set, Union, Callable

from sortedcontainers import SortedDict, SortedKeyList

from ..heuristics.Objective_Function import Objective_Function
from ..heuristics.heuristic_functions import Modifier, Objective
from .Design_Iteration import Design_Iteration, Iteration_Keys, Objective_Iteration_Keys
from .population_history_graph import Modification_History


class Design_Population:
    """
        Data Structure that manages the designs that are produced in a run of an Optimizer
    """

    def __init__(self, objective_function: Objective_Function,
                 population_cap: int = 100, iteration_keys: Optional[Dict[str, Callable]] = None, objective_iteration_keys: Optional[Dict[str, Callable]] = None):
        if objective_iteration_keys is None:
            objective_iteration_keys = {}
        if iteration_keys is None:
            iteration_keys = {}
        self.objective_function = objective_function
        self._population_cap: int = population_cap
        self._iteration_count: int = 0
        self._iteration_keys: Dict[Union[str, Enum], Callable] = iteration_keys
        self._objective_iteration_keys: Dict[Union[str, Enum], Callable] = objective_iteration_keys
        for enum in Iteration_Keys:
            self._iteration_keys[enum] = enum
        for enum in Objective_Iteration_Keys:
            self._objective_iteration_keys[enum] = enum
        self.sorted_iterations: Dict[Union[str, Enum], SortedKeyList[Design_Iteration]] = {s: SortedKeyList(key=k) for s, k in self._iteration_keys.items()}
        self.objective_sorted_iterations: Dict[Objective, Dict[Union[str, Enum], SortedKeyList[Design_Iteration]]] = {o: {s: SortedKeyList(key=lambda iteration: k(iteration, o))
                                                                                                                          for s, k in self._objective_iteration_keys.items()}
                                                                                                                      for o in self.objective_function}
        self.iterations_by_scores: SortedDict[float: Set[Design_Iteration]] = SortedDict()
        self.iterations_by_objective_scores: Dict[Objective: SortedDict[float: Design_Iteration]] = {o: SortedDict() for o in self.objective_function}
        self.modification_history: Modification_History = Modification_History()
        self.last_iteration: Optional[Design_Iteration] = None

    def portion_perfect_score(self, design_iteration: Design_Iteration) -> float:
        """
        :param design_iteration: scored iteration
        :return: portion of perfect score on objective function
        """
        return design_iteration.score / self.objective_function.perfect_score

    def top_N_iterations(self, iteration_count: int, objective: Optional[Objective] = None):
        """
        :param iteration_count: number of iterations to return
        :param objective: objective to collect from or general scores if none
        :return: N iterations with top scores
        """
        top_iterations = []
        if objective is not None:
            for iterations in reversed(self.iterations_by_objective_scores[objective].values()):
                top_iterations.extend(iterations)
                if len(top_iterations) == iteration_count:
                    break
        else:
            for iterations in reversed(self.iterations_by_scores.values()):
                top_iterations.extend(iterations)
                if len(top_iterations) == iteration_count:
                    break
        return top_iterations

    @property
    def iterations(self) -> SortedKeyList[Design_Iteration]:
        """
        :return: List of iterations sorted by the time they were first created
        """
        return self.sorted_iterations[Iteration_Keys.First_Iteration]

    def _remove_from_sorted_iterations(self, iteration: Design_Iteration):
        for key, sorted_iterations in self.sorted_iterations.items():
            sorted_iterations.discard(iteration)
        for o in self.objective_function:
            for sorted_iterations in self.objective_sorted_iterations[o].values():
                sorted_iterations.discard(iteration)

    def _sort_new_iteration(self, iteration: Design_Iteration):
        for sorted_iterations in self.sorted_iterations.values():
            sorted_iterations.add(iteration)
        for o in self.objective_function:
            for sorted_iterations in self.objective_sorted_iterations[o].values():
                sorted_iterations.add(iteration)

    @property
    def population_cap(self) -> int:
        """
        :return: Amount of unique iterations the population is capped to
        """
        return self._population_cap

    @property
    def iteration_count(self) -> int:
        """
        :return: Number of iterations given to the population
        """
        return self._iteration_count

    def matching_iteration(self, iteration: Design_Iteration) -> Optional[Design_Iteration]:
        """
        :param iteration: design iteration to search for by objective evaluation
        :return: The matching iterations or None if no match was found
        """
        if iteration.score in self.iterations_by_scores:
            for matching_score_iteration in self.iterations_by_scores[iteration.score]:
                if iteration == matching_score_iteration:
                    return matching_score_iteration
            return None
        else:
            return None  # no matching evaluation implies design is unique

    def _evaluate_design(self, design: Any) -> Tuple[float, Dict[Objective, float]]:
        return self.objective_function(design)

    def _drop_worst_design(self):
        # remove overall worst performing iteration
        lowest_score, worst_iterations = self.iterations_by_scores.popitem(0)
        for worst_iteration in worst_iterations:
            assert isinstance(worst_iteration, Design_Iteration)
            # remove from sorted iterations
            self._remove_from_sorted_iterations(worst_iteration)
            # remove from objective score mapping
            for o in self.objective_function:
                self.iterations_by_objective_scores[o][worst_iteration.objective_scores[o]].remove(worst_iteration)
            # remove from modification history
            self.modification_history.remove_iteration(worst_iteration)

    def add_to_population(self, design: Any, prior_iteration: Optional[Design_Iteration] = None, modifier: Optional[Modifier] = None) -> Tuple[Design_Iteration, bool]:
        """
        Adds a design to the population structure
        :param prior_iteration: the iteration that this design was created from with a modifier
        :param design: the design created
        :param modifier: the modifier used to create it or null if no modifier was used
        :return: the iteration count of this design, the objective function score of the design, a map of objectives to objective scores of this design
        """
        # reduce population to population cap
        while len(self) >= self._population_cap:
            self._drop_worst_design()
        iteration_count = self._iteration_count
        self._iteration_count += 1
        score, objective_scores = self._evaluate_design(design)
        iteration = Design_Iteration(design, iteration_count, score, objective_scores, self.objective_function)
        # check if an iteration with equivalent evaluation is already in the population
        new_iteration = True
        matching_iteration = self.matching_iteration(iteration)
        if matching_iteration is not None:
            new_iteration = False
            self._remove_from_sorted_iterations(matching_iteration)  # remove to support resorting after update
            matching_iteration.add_iteration(iteration)  # update iteration usage information
            iteration = matching_iteration  # replace with the one that is already in the population
        else:  # add a new iteration by evaluation scores
            self._add_iteration_by_scores(iteration)
        # add to iterations sorted by visitation. Updates visitation if matching iteration was found
        self._sort_new_iteration(iteration)
        if modifier is not None:
            assert prior_iteration is not None
            design_change, new_modifier_on_edge = self.modification_history.add_edge(prior_iteration, iteration, modifier)
            iteration.add_prior_iteration_changes(design_change)
            modifier.record_application(design_change, new_modifier_on_edge)
        self.last_iteration = iteration
        return iteration, new_iteration

    def _add_iteration_by_scores(self, iteration: Design_Iteration):
        if iteration.score not in self.iterations_by_scores:
            self.iterations_by_scores[iteration.score] = set()
        self.iterations_by_scores[iteration.score].add(iteration)
        # add to mapping of objective scores to iterations
        for o in self.objective_function:
            if iteration.objective_scores[o] not in self.iterations_by_objective_scores[o]:
                self.iterations_by_objective_scores[o][iteration.objective_scores[o]] = set()
            self.iterations_by_objective_scores[o][iteration.objective_scores[o]].add(iteration)

    def __len__(self):
        return len(self.iterations)

    def __contains__(self, iteration):
        return iteration in self.iterations

    def __getitem__(self, item: Union[float, Tuple[Objective, float]]) -> Set[Design_Iteration]:
        def _closest_iteration_to_score(s: float, iterations_by_scores: SortedDict[float, Design_Iteration]) -> float:
            """
            :param s: score to find the closest score to
            :param iterations_by_scores: the sorting of design iterations by score
            :return: the score that is closest to s
            """
            index = iterations_by_scores.bisect_key_left[s]
            lower = iterations_by_scores.peekitem(index)
            upper = iterations_by_scores.peekitem(index + 1)
            if abs(s - lower) <= abs(s - upper):
                return lower
            else:
                return upper

        if isinstance(item, float):  # search by score
            if item in self.iterations_by_scores:
                return self.iterations_by_scores[item]
            return self.iterations_by_scores[_closest_iteration_to_score(item, self.iterations_by_scores)]
        else:  # search by objective score
            objective = item[0]
            score = item[1]
            assert objective in self.iterations_by_objective_scores
            if score in self.iterations_by_scores:
                return self.iterations_by_scores[item]
            return self.iterations_by_objective_scores[objective][_closest_iteration_to_score(score, self.iterations_by_objective_scores[objective])]
