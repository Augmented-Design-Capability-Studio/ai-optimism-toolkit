"""Example of how to create an optimizer for optimizing chocolate chip cookie based on http://www.goodeatsfanpage.com/season3/cookie/cookietranscript.htm"""
from enum import Enum
from typing import Dict, Union, Callable

from optimism_toolkit.heuristics.Heuristic_Map import Heuristic_Map
from optimism_toolkit.heuristics.Objective_Function import Objective_Function
from optimism_toolkit.heuristics.heuristic_functions import Heuristic_Type, Objective, Modifier
from optimism_toolkit.heuristics.heuristic_registration import make_heuristic_library
from optimism_toolkit.heuristics.objectives.objective_decorators import inverse_objective, target_value_objective
from optimism_toolkit.optimizer.Optimizer import Optimizer
from optimism_toolkit.selector_functions.design_selectors.design_selectors import Highest_Scoring_Design
from optimism_toolkit.selector_functions.modifier_selectors.modifier_sorting_functions import sorted_modifier_by_most_important_objective
from optimism_toolkit.selector_functions.selector_functions import Modifier_Selector
from optimism_toolkit.stopping_criteria.stopping_criteria import (
    stop_if_any_criteria_met,
    stop_at_threshold_score,
    stop_at_N_iterations,
)

cookie_heuristic, cookie_heuristic_library = make_heuristic_library("Cookie Texture")


def cookie_objective(name: Union[str, Callable]) -> Objective:
    """
    :param name:
    :return: cookie objective by name
    """
    return cookie_heuristic_library.get_objective(name)


def cookie_modifier(name: Union[str, Callable]) -> Modifier:
    """
    :param name:
    :return: cookie modifier by name
    """
    return cookie_heuristic_library.get_modifier(name)


class Flour(Enum):
    """Enumeration of Flour types"""
    Bread = "Bread"
    AP = "All Purpose"
    Cake = "Cake"

    def __str__(self):
        return f"{self.value} flour"

    def __repr__(self):
        return str(self)


class Fat(Enum):
    """Enumeration of Fat Types"""
    Butter = "butter"
    Shortening = "shortening"

    def __str__(self):
        return self.value

    def __repr__(self):
        return str(self)


class Cookie:
    """
        An optimize cookie recipe
    """

    def __init__(self, flour_cups: float = 2.25, baking_soda_tsp: float = 1.0, baking_powder_tsp: float = 0.0, white_sugar_cup: float = .75, brown_sugar_cup: float = 1.0,
                 eggs: int = 1, egg_yolks: int = 1, milk_oz: int = 2.0, melt_fat: bool = False, fat_type=Fat.Butter, flour=Flour.Bread):
        self.fat: Fat = fat_type
        self.melt_fat: bool = melt_fat
        self.flour: Flour = flour
        self.flour_cups: float = flour_cups
        self.salt_tsp: float = 1.0
        self.baking_soda_tsp: float = baking_soda_tsp
        self.baking_powder_tsp: float = baking_powder_tsp
        self.white_sugar_cup: float = white_sugar_cup
        self.brown_sugar_cup: float = brown_sugar_cup
        self.eggs: int = eggs
        self.egg_yolks: int = egg_yolks
        self.milk_oz: float = milk_oz
        self.chips_cups: float = 2.0
        self.vanilla_tsp: float = 1.5

    def __str__(self):
        melted = ""
        if self.melt_fat:
            melted = "Melted "
        return f"1c {melted}{self.fat}, {self.flour_cups} of {self.flour}," \
               f"soda={self.baking_soda_tsp}, powder={self.baking_powder_tsp}, White={self.white_sugar_cup}, Brown={self.brown_sugar_cup}," \
               f"eggs={self.eggs}, yolks={self.egg_yolks}, milk={self.milk_oz}"

    @cookie_heuristic(Heuristic_Type.Objective, "solid_fat")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def melted_fat(self) -> float:
        """
        :return: 1.0 if butter is melted, 0.0 otherwise
        """
        return float(self.melt_fat)

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def melt_fat(self):
        """
            Sets butter to melt
        """
        self.melt_fat = True

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def solidify_fat(self):
        """
            Sets butter not to melt
        """
        self.melt_fat = False

    @cookie_heuristic(Heuristic_Type.Objective, "balance_sugar")
    @target_value_objective(target=.5)
    @cookie_heuristic(Heuristic_Type.Objective, "brown_to_white_sugar")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def white_to_brown_sugar(self):
        """
        :return: portion of sugar that is glassy structure
        """
        return self.white_sugar_cup / (self.white_sugar_cup + self.brown_sugar_cup)

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def increase_white_to_brown_sugar(self):
        """
            Increases white to brown sugar
        """
        increment = .25
        if self.brown_sugar_cup >= .75:  # limits brown sugar to minimum 1/2 cup
            self.brown_sugar_cup -= increment
            self.white_sugar_cup += increment

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def increase_brown_to_white_sugar(self):
        """
            Increase brown to white sugar
        """
        increment = .25
        if self.white_sugar_cup >= increment:  # limits white sugar to minimum 1/4 cup
            self.brown_sugar_cup += increment
            self.white_sugar_cup -= increment

    @cookie_heuristic(Heuristic_Type.Objective, "medium_gluten")
    @target_value_objective(.5)
    @cookie_heuristic(Heuristic_Type.Objective, "low_gluten")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def flour_protein(self):
        """
        :return: Portion of the flour protein available from flour
        """
        if self.flour is Flour.Bread:
            return 1.0
        elif self.flour is Flour.AP:
            return .5
        else:
            return 0.0

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def use_bread_flour(self):
        """
            Modifies bread flour by quarter cup and takes it away from less protein flours
        """
        self.flour = Flour.Bread

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def use_ap_flour(self):
        """
            Modifies ap flour by quarter cup and takes it away from less protein flours
        """
        self.flour = Flour.AP

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def use_cake_flour(self):
        """
            Modifies cake flour to decrease protein
        """
        self.flour = Flour.Cake

    @cookie_heuristic(Heuristic_Type.Objective, "Non_Acidic_Batter")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def acidity(self) -> float:
        """
        Note: Raising Acidity (Baking Powder, Brown sugar) reduces the setting temperature and time to set of the batter
        :return: proportion of acidity introducing ingredients
        """
        return (self.leavening_acidity() + (1.0 - self.white_to_brown_sugar())) / 2.0

    def leavening_acidity(self):
        """
        :return: portion of acidity leavening agents
        """
        return self.baking_powder_tsp / 1.0

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def increase_leavening_acidity(self):
        """
            increases acidity of leavening agents
        """
        increment = .25
        if self.baking_soda_tsp >= increment:
            self.baking_soda_tsp -= increment
            self.baking_powder_tsp += increment

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def decrease_leavening_acidity(self):
        """
            decreases acidity of leavening agents which increases setting temperature which gives time to spread -> crispy
        """
        increment = .25
        if self.baking_powder_tsp >= increment:
            self.baking_soda_tsp += increment
            self.baking_powder_tsp -= increment

    @cookie_heuristic(Heuristic_Type.Objective, "is_shortening")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def is_butter(self):
        """
        :return: true if fat is butter
        """
        return self.fat is Fat.Butter

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def use_butter(self):
        """
            Increase teh amount of spreadable fat (butter)
        """
        self.fat = Fat.Butter

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def use_shortening(self):
        """
            Decrease teh amount of spreadable fat (butter)
        """
        self.fat = Fat.Shortening

    @property
    def animal_proteins(self):
        """
        :return: Total portion of animal proteins from eggs and milk
        """
        return self.egg_proteins + self.milk_proteins

    @property
    def milk_proteins(self) -> float:
        """
        :return: portion of milk protein
        """
        return float(self.milk_oz) / 4.0  # 4oz of milk is equivalent to 1 egg

    @property
    def egg_proteins(self) -> float:
        """
        :return: protein from eggs and egg yolks
        """
        return float(self.eggs + (float(self.egg_yolks) / 2.0))

    @cookie_heuristic(Heuristic_Type.Objective, "wet_animal_proteins")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def dry_egg_proteins(self) -> float:
        """
        :return: proportion of animal proteins accounted for by egg whites
        """
        egg_whites = self.eggs / 2.0
        return egg_whites / self.animal_proteins

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def decrease_egg_whites(self):
        """
            Replaces egg whites with milk and egg yolk
        """
        if self.eggs >= 1:  # can replace egg with egg yolk and milk
            self._replace_egg_white()

    @cookie_heuristic(Heuristic_Type.Objective, "portion_milk_proteins")
    @inverse_objective
    @cookie_heuristic(Heuristic_Type.Objective)
    def portion_egg_proteins(self) -> float:
        """
        :return: portion of egg to animal proteins
        """
        return self.egg_proteins / 2.0

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def increase_eggs(self):
        """
            Replace milk protein with eggs
        """
        if self.milk_oz >= 2:  # can replace egg or egg yolk
            if self.egg_yolks >= 1:  # can replace with whole egg
                self.egg_yolks -= 1
                self.eggs += 1
            else:
                self.egg_yolks += 1
            self.milk_oz -= 2

    @cookie_heuristic(Heuristic_Type.Modifier, deep_copy=True)
    def increase_milk(self):
        """
            Replaces egg proteins with milk
        """
        if self.egg_yolks >= 1:  # can replace with milk
            self.egg_yolks -= 1
            self.milk_oz += 2
        elif self.eggs >= 1:  # can replace with milk and egg yolk
            self._replace_egg_white()

    def _replace_egg_white(self):
        self.eggs -= 1
        self.egg_yolks += 1
        self.milk_oz += 2

    @staticmethod
    def chewy_hm() -> Dict[Objective, Dict[Modifier, float]]:
        """
        :return: Heuristic weights between chewy objectives and modifiers
        """
        # brown sugar traps moisture
        # higher gluten traps moisture
        # butter adds water content and moisture
        # Egg whites dry out baked goods, reducing moisture
        return {cookie_objective("brown_to_white_sugar"): {cookie_modifier(Cookie.increase_brown_to_white_sugar): 1.0},
                cookie_objective(Cookie.flour_protein): {cookie_modifier(Cookie.use_ap_flour): 0.5, cookie_modifier(Cookie.use_bread_flour): 1.0},
                cookie_objective(Cookie.is_butter): {cookie_modifier(Cookie.use_butter): 1.0},
                cookie_objective(Cookie.melted_fat): {cookie_modifier(Cookie.melt_fat): 1.0},
                cookie_objective("wet_animal_proteins"): {cookie_modifier(Cookie.decrease_egg_whites): 1.0}}

    @staticmethod
    def crispy_hm() -> Dict[Objective, Dict[Modifier, float]]:
        """
        :return: Heuristic weights between crispy objectives and modifiers
        """
        # Butter melts fast, promotes spread
        # eggs trap moisture leading to rising steam
        # lower acidity raises setting temperature allowing time to spread
        # white sugar is crispy
        return {cookie_objective(Cookie.is_butter): {cookie_modifier(Cookie.use_butter): 1.0},
                cookie_objective("medium_gluten"): {cookie_modifier(Cookie.use_ap_flour): 1.0},
                cookie_objective("portion_milk_proteins"): {cookie_modifier(Cookie.increase_milk): 1.0},
                cookie_objective("Non_Acidic_Batter"): {cookie_modifier(Cookie.decrease_leavening_acidity): 1.0, cookie_modifier(Cookie.increase_white_to_brown_sugar): 0.5},
                cookie_objective(Cookie.white_to_brown_sugar): {cookie_modifier(Cookie.increase_white_to_brown_sugar): 1.0}
                }

    @staticmethod
    def cakiness_hm() -> Dict[Objective, Dict[Modifier, float]]:
        """
        :return: Heuristic weights between cakey objectives and modifiers
        """
        # Shortening melts at higher temperature giving batter time to rise
        # Flour protein absorbs water which needs to be turned to steam to make a batter that rises
        # Higher acidity lowers the spread of batter, includes need to keep some brown sugar
        # Eggs promote rise and drys batter
        # white sugar releases water to create steam
        return {cookie_objective("is_shortening"): {cookie_modifier(Cookie.use_shortening): 1.0},
                cookie_objective("low_gluten"): {cookie_modifier(Cookie.use_cake_flour): 1.0},
                cookie_objective(Cookie.acidity): {cookie_modifier(Cookie.increase_leavening_acidity): 1.0, cookie_modifier(Cookie.increase_brown_to_white_sugar): 0.5},
                cookie_objective(Cookie.portion_egg_proteins): {cookie_modifier(Cookie.increase_eggs): 1.0},
                cookie_objective("balance_sugar"): {cookie_modifier(Cookie.increase_brown_to_white_sugar): 0.5, cookie_modifier(Cookie.increase_white_to_brown_sugar): 0.5}}


def optimize_cookie_recipe(crispiness: float = 1.0, chewiness: float = 0.0, cakiness: float = 1.0):
    """
    :param crispiness: weight on making cookie crispy
    :param chewiness: weight on making cookie chewy
    :param cakiness: weight on making cookie cakey
    :return: optimized cookie recipe
    """
    sub_problems = [(chewiness, Cookie.chewy_hm()), (crispiness, Cookie.crispy_hm()), (cakiness, Cookie.cakiness_hm())]
    objective_values = {}
    hm_weights = {}
    for problem in sub_problems:
        obj_weight = problem[0]
        problem_hm = problem[1]
        for obj, modifiers in problem_hm.items():
            if obj not in objective_values:
                objective_values[obj] = 0.0
                hm_weights[obj] = {}
            objective_values[obj] += obj_weight
            for mod, weight in modifiers.items():
                if mod not in hm_weights[obj]:
                    hm_weights[obj][mod] = 0.0
                hm_weights[obj][mod] += weight

    def _normalized_unique_applications(modifier, objective, **_):
        if modifier.unique_applications == 0:
            return 0.0
        else:
            return modifier.objective_changes[objective] / float(modifier.unique_applications)

    def _normalized_applications(modifier, objective, **_):
        if modifier.applications == 0:
            return 0.0
        else:
            return modifier.objective_changes[objective] / float(modifier.applications)

    objective_modifier_keys = {"changes_normalize_unique_applications": _normalized_unique_applications,
                               "changes_normalize_application": _normalized_applications}
    objective_function = Objective_Function(objective_values)
    hm = Heuristic_Map(hm_weights, objective_modifier_keys=objective_modifier_keys)

    design_selector = Highest_Scoring_Design()

    def _sort_by_normalized_changes(heuristic_map, design_iteration):
        return sorted_modifier_by_most_important_objective(heuristic_map, design_iteration, "changes_normalize_application")

    modifier_selector = Modifier_Selector("applications_to_change", _sort_by_normalized_changes, threshold_probability=lambda *args, **kwargs: .85)

    def _stop_at_70_percent_score(design_iteration, design_population):
        return stop_at_threshold_score(design_iteration, design_population, .70)

    stopping_criteria = lambda design_iteration, design_population: stop_if_any_criteria_met(design_iteration=design_iteration,
                                                                                             design_population=design_population,
                                                                                             criteria=[_stop_at_70_percent_score,
                                                                                                       stop_at_N_iterations])

    guesses = [Cookie()]
    print(guesses[0])
    optimizer = Optimizer(design_selector, modifier_selector, stopping_criteria)
    population = optimizer.optimize(objective_function, hm, guesses, population_cap=10)
    return population.top_N_iterations(1)


optimum_cookie = optimize_cookie_recipe(crispiness=0.0, chewiness=0.5, cakiness=1.0)
print(optimum_cookie)
