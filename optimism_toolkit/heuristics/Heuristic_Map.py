"""Manage relationship between modifiers and their effect on objectives"""
from enum import Enum
from typing import Dict, Iterable, Tuple, Optional, Callable, Union, Set

from sortedcontainers import SortedKeyList

from .heuristic_functions import Modifier, Objective


class Modifier_Keys(Enum):
    """Enumeration of modifier access records to sort by"""
    Applications = 1
    Unique_Applications = 2
    Score_Changes = 3
    Score_Increases = 4
    Score_Decreases = 5

    def __call__(self, modifier: Modifier):
        if self is Modifier_Keys.Applications:
            return modifier.applications
        elif self is Modifier_Keys.Unique_Applications:
            return modifier.unique_applications
        elif self is Modifier_Keys.Score_Changes:
            return modifier.score_changes
        elif self is Modifier_Keys.Score_Increases:
            return modifier.score_increases
        elif self is Modifier_Keys.Score_Decreases:
            return modifier.score_decreases

    def __hash__(self):
        return hash(self.name)


class Objective_Modifier_Keys(Enum):
    """Enumeration of modifier access records to sort by based on objectives"""
    Score_Changes = 1
    Score_Increases = 2
    Score_Decreases = 3
    Value = 4

    def __call__(self, modifier: Modifier, objective: Objective, heuristic_map=None):
        if self is Objective_Modifier_Keys.Score_Changes:
            return modifier.objective_changes[objective]
        elif self is Objective_Modifier_Keys.Score_Increases:
            return modifier.objective_increases[objective]
        elif self is Objective_Modifier_Keys.Score_Decreases:
            return modifier.objective_decreases[objective]
        elif self is Objective_Modifier_Keys.Value:
            return heuristic_map.modifier_value(modifier, objective)

    def __hash__(self):
        return hash(self.name)


class Heuristic_Map:
    """
        Data Structure that manages the relationship between sub-objectives of the objective function and the modifiers that change designs in an optimization process
    """

    @staticmethod
    def objective_to_modifier_heuristic_weights(heuristic_weights: Dict[Objective, Dict[Modifier, float]]) -> Dict[Modifier, Dict[Objective, float]]:
        """
        :param heuristic_weights: heuristic weights in inverted objective modifier order
        :return:
        """
        corrected_weights = {}
        for objective, mod_weights in heuristic_weights.items():
            for modifier, weight in mod_weights.items():
                if modifier not in corrected_weights:
                    corrected_weights[modifier] = {}
                corrected_weights[modifier][objective] = weight
        return corrected_weights

    def __init__(self, heuristic_weights: Union[Dict[Modifier, Dict[Objective, float]], Dict[Objective, Dict[Modifier, float]]],
                 modifier_keys: Optional[Dict[str, Callable]] = None, objective_modifier_keys: Optional[Dict[str, Callable]] = None):
        if objective_modifier_keys is None:
            objective_modifier_keys = {}
        if modifier_keys is None:
            modifier_keys = {}
        for enum in Modifier_Keys:
            modifier_keys[enum] = enum
        for enum in Objective_Modifier_Keys:
            objective_modifier_keys[enum] = enum
        self._modifier_keys: Dict[Union[str, Enum], Callable] = modifier_keys
        self._objective_modifier_keys: Dict[Union[str, Enum], Callable] = objective_modifier_keys
        if len(heuristic_weights) > 0 and isinstance([*heuristic_weights.keys()][0], Objective):
            heuristic_weights = Heuristic_Map.objective_to_modifier_heuristic_weights(heuristic_weights)
        self._heuristic_weights: Dict[Modifier: Dict[Objective, float]] = heuristic_weights
        self._update_by_heuristic_weights()

    def _update_by_heuristic_weights(self):
        self._add_objectives()
        self._total_modifier_weight: Dict[Modifier: float] = {m: sum(w for w in self._heuristic_weights[m].values())
                                                              for m in self}
        self.sorted_modifiers: Dict[Union[str, Enum], SortedKeyList[Modifier]] = {s: SortedKeyList(self.modifiers, key=k) for s, k in self._modifier_keys.items()}
        self.objective_sorted_modifiers: Dict[Objective, Dict[Union[str, Enum], SortedKeyList[Modifier]]] = {o: {s: SortedKeyList(self.modifiers, key=lambda modifier: k(modifier=modifier,
                                                                                                                                                                         objective=o,
                                                                                                                                                                         heuristic_map=self)
                                                                                                                                  )
                                                                                                                 for s, k in self._objective_modifier_keys.items()}
                                                                                                             for o in self.objectives}

    def add_heuristic_weights(self, heuristic_weights: Union[Dict[Modifier, Dict[Objective, float]], Dict[Objective, Dict[Modifier, float]]]):
        """
        :param heuristic_weights: New heuristic weights to add to heuristic map
        """
        if isinstance([*heuristic_weights.keys()][0], Objective):
            heuristic_weights = Heuristic_Map.objective_to_modifier_heuristic_weights(heuristic_weights)
        for modifier, objective_weights in heuristic_weights.items():
            if modifier not in self._heuristic_weights:
                self._heuristic_weights[modifier] = {}
            for objective, weight in objective_weights.items():
                self._heuristic_weights[modifier][objective] = weight
        self._update_by_heuristic_weights()

    def add_heuristic(self, objective: Objective, modifier: Modifier, weight: float):
        """
        Add a heuristic between the objective and modifier of a given weight
        :param objective:
        :param modifier:
        :param weight:
        """
        self.add_heuristic_weights({objective: {modifier: weight}})

    def _add_objectives(self):
        for m in self.modifiers:
            m.heuristic_map = self
            for objective in self.objectives:
                m.add_new_objective(objective)

    def remove_from_sorted_modifiers(self, modifier: Modifier):
        """
        Removes modifier for sorted key lists
        :param modifier: modifier to remove
        """
        for sorted_modifiers in self.sorted_modifiers.values():
            sorted_modifiers.discard(modifier)
        for o in self.objectives:
            for sorted_modifiers in self.objective_sorted_modifiers[o].values():
                sorted_modifiers.discard(modifier)

    def update_modifier_sort(self, modifier: Modifier):
        """
        Removes the modifier from the heuristic map sorting and re-adds it with unique data
        :param modifier: modifier to update
        """
        for sorted_modifier in self.sorted_modifiers.values():
            sorted_modifier.add(modifier)
        for o in self.objectives:
            for sorted_modifier in self.objective_sorted_modifiers[o].values():
                sorted_modifier.add(modifier)

    def modifier_value(self, modifier: Modifier, objective: Objective) -> float:
        """
        :param modifier: modifier to apply
        :param objective: objective to improve
        :return: Value of the modifier for a given objective normalized by other objectives
        """
        if modifier not in self:
            return 0.0
        total = self._total_modifier_weight[modifier]
        if total == 0.0:
            return 0.0
        elif objective not in self._heuristic_weights[modifier]:
            return 0.0
        else:
            return self._heuristic_weights[modifier][objective] / total

    @property
    def modifiers(self) -> Iterable[Modifier]:
        """
        :return: modifiers in the heuristic map
        """
        return self._heuristic_weights.keys()

    @property
    def objectives(self) -> Set[Objective]:
        """
        :return: set of objectives that are matched to modifiers
        """
        objectives = set()
        for weights in self._heuristic_weights.values():
            objectives.update(weights.keys())
        return objectives

    def __iter__(self) -> Iterable[Modifier]:
        return iter(self.modifiers)

    def __contains__(self, modifier: Modifier):
        return modifier in self._heuristic_weights

    def __getitem__(self, item: Tuple[Modifier, Objective]) -> float:
        modifier = item[0]
        objective = item[1]
        if modifier not in self:
            return 0.0
        if objective not in self._heuristic_weights[modifier]:
            return 0.0
        return self._heuristic_weights[modifier][objective]
