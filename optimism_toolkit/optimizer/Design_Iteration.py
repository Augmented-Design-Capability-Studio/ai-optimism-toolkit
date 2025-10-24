"""Design Iteration Class"""
import random
from enum import Enum
from typing import Any, Dict, List, Tuple

from sortedcontainers import SortedKeyList

from ..heuristics.Objective_Function import Objective_Function
from ..heuristics.heuristic_functions import Objective


class Design_Iteration:
    """
        Used to keep track of design classes for any domain
    """

    def __init__(self, design: Any, iteration: int, score: float, objective_scores: Dict[Objective, float], objective_function: Objective_Function):
        self.objective_function = objective_function
        self.score: float = score
        self.objective_scores: Dict[Objective, float] = objective_scores
        self.objectives_by_scores: SortedKeyList[Tuple[float, Objective]] = SortedKeyList([(w, o) for o, w in self.objective_scores.items()], key=lambda pair: pair[0])
        self.objective_importance: Dict[Objective, float] = self._objectives_by_importance()
        self.objectives_by_importance: SortedKeyList[Tuple[float, Objective]] = SortedKeyList([(i, o) for o, i in self.objective_importance.items()], key=lambda pair: pair[0])
        self._designs = {design}  # multiple designs may result in the evaluation on this iteration, however this is ignored in optimization
        self.iterations: List[int] = [iteration]
        self.visits = 1
        self.score_changes: float = 0.0
        self.score_increases: int = 0
        self.score_decreases: int = 0
        self.objective_changes: Dict[Objective, float] = {o: 0.0 for o in self.objective_scores}
        self.objective_increases: Dict[Objective, int] = {o: 0 for o in self.objective_scores}
        self.objective_decreases: Dict[Objective, int] = {o: 0 for o in self.objective_scores}

    @property
    def design(self) -> Any:
        """
        :return: The design created in this iteration
        """
        return random.choice([*self._designs])

    @property
    def iteration(self) -> int:
        """
        :return: The last iteration that created this design
        """
        return self.iterations[0]

    def add_iteration_data(self, designs: list, iteration: int, visits: int = 1):
        """
        adds the iteration data
        :param visits: number of time the new design has been visited
        :param designs: the design to compare to
        :param iteration: iteration that created design
        """
        self._designs.update(designs)
        self.iterations.append(iteration)
        self.visits += visits

    def add_iteration(self, iteration, check: bool = False) -> bool:
        """
        :param check: checks that iterations are equal. (o(n) time for number of objectives)
        :param iteration: Design_Iteration to compare to
        :return: True match caused data to be added
        """
        if not check or self == iteration:
            # noinspection PyProtectedMember
            self.add_iteration_data(iteration._designs, iteration.iteration, iteration.visits)
            return True
        else:
            return False

    def add_prior_iteration_changes(self, design_change):
        """
        :param design_change: The Design_Change edge data
        """
        self.score_changes += design_change.score_change
        self.score_increases += int(design_change.score_increased)
        self.score_decreases += int(design_change.score_decreased)
        for o in self.objective_scores:
            self.objective_changes[o] += design_change.objective_changes[o]
            self.objective_increases[o] += int(design_change.objective_increased[o])
            self.objective_decreases[o] += int(design_change.objective_decreased[o])

    def _objectives_by_importance(self) -> Dict[Objective, float]:
        """
        :return: dictionary of objectives keyed to normalized importance to this design iteration
        """
        def _importance(objective: Objective) -> float:
            value = self.objective_function.objectives_to_weights[objective] * (1.0 - self.objective_scores[objective])
            return value

        values = {o: _importance(o) for o in self.objective_function}
        total = sum(values.values())
        if total == 0.0:
            normalized = {o: 0.0 for o in self.objective_function}
        else:
            normalized = {o: values[o] / total for o in self.objective_function}
        return normalized

    def __hash__(self):
        return self.iteration  # use first iteration since it will not change and is guaranteed to exist

    def __str__(self):
        return f"I{self.iteration} scored {self.score:1.2f} of {self.objective_function.perfect_score} ({self.score/self.objective_function.perfect_score *100:1.2f}%) -> {self.design}"

    def __repr__(self):
        return str(self)

    def __eq__(self, other):
        if self.score == other.score:
            for o, s in self.objective_scores.items():
                other_s = other.objective_scores[o]
                if s != other_s:
                    return False  # if objective scores don't match, designs must not be the same
            return True  # regardless of design equivalency, only keep track of one design with matching objectives
        else:
            return False  # if evaluation doesn't match, design must be different


class Iteration_Keys(Enum):
    """Enumeration of sorting keys for design iterations"""
    Visits = 1
    Scores = 2
    First_Iteration = 3
    Score_Changes = 4
    Score_Increases = 5
    Score_Decreases = 6

    def __call__(self, iteration: Design_Iteration):
        if self is Iteration_Keys.Visits:
            return iteration.visits
        elif self is Iteration_Keys.Scores:
            return iteration.score
        elif self is Iteration_Keys.First_Iteration:
            return iteration.iteration
        elif self is Iteration_Keys.Score_Changes:
            return iteration.score_changes
        elif self is Iteration_Keys.Score_Increases:
            return iteration.score_increases
        elif self is Iteration_Keys.Score_Decreases:
            return iteration.score_decreases

    def __hash__(self):
        return hash(self.name)


class Objective_Iteration_Keys(Enum):
    """Enumeration of objective based sorting keys for design iterations"""

    Scores = 1
    Score_Changes = 2
    Score_Increases = 3
    Score_Decreases = 4
    Importance = 4

    def __call__(self, iteration: Design_Iteration, objective: Objective):
        if self is Objective_Iteration_Keys.Scores:
            return iteration.objective_scores[objective]
        elif self is Objective_Iteration_Keys.Score_Changes:
            return iteration.objective_changes[objective]
        elif self is Objective_Iteration_Keys.Score_Increases:
            return iteration.objective_increases[objective]
        elif self is Objective_Iteration_Keys.Score_Decreases:
            return iteration.objective_decreases[objective]
        elif self is Objective_Iteration_Keys.Importance:
            return iteration.objective_importance[objective]

    def __hash__(self):
        return hash(self.name)
