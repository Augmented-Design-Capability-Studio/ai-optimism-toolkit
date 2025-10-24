"""Class for managing secularized multi-objective function"""

from typing import Any, Tuple, Dict, Optional

from .heuristic_functions import Objective


# noinspection PyTypeChecker
class Objective_Function:
    """
        Process for evaluating a design in a given optimization
    """

    def __init__(self, objectives_to_weights: Optional[Dict[Objective, float]] = None):
        if objectives_to_weights is None:
            objectives_to_weights = {}
        self.objectives_to_weights: Dict[Objective, float] = objectives_to_weights
        self._total_weight: float = sum(self.objectives_to_weights.values())

    def add_objective_by_weight(self, objective: Objective, weight: float):
        """
        add objective by weight to the objective function
        :param objective: objective to add
        :param weight: weight on objective
        """
        self.objectives_to_weights[objective] = weight
        self._total_weight: float = sum(self.objectives_to_weights.values())

    @property
    def perfect_score(self) -> float:
        """
        :return: Maximum possible score of objective function
        """
        return self._total_weight

    def evaluate_objectives(self, design: Any) -> Dict[Objective, float]:
        """
        :param design: design to evaluate
        :return: Dictionary of objectives mapped to their evaluation of the design
        """
        # todo check objective call operation is giving floats
        return {o: o(design) for o in self.objectives_to_weights.keys()}

    def weighted_evaluation(self, design: Any) -> Dict[Objective, float]:
        """
        :param design: design to evaluate
        :return: Dictionary of objectives to weighted evaluations of the design
        """
        return {o: v * self.objectives_to_weights[o] for o, v in self.evaluate_objectives(design).items()}

    def evaluate(self, design: Any) -> Tuple[float, Dict[Objective, float]]:
        """
        :param design: design to be evaluated
        :return: the final objective function score
        """
        objective_scores = self.weighted_evaluation(design)
        return sum(objective_scores.values()), objective_scores

    def __call__(self, design: Any) -> Tuple[float, Dict[Objective, float]]:
        return self.evaluate(design)

    def __iter__(self):
        return iter(self.objectives_to_weights.keys())

    def __len__(self):
        return len(self.objectives_to_weights)
