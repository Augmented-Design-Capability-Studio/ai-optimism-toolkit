"""Library of Design Sorting functions"""
from typing import Iterable

from ...heuristics.heuristic_functions import Objective
from ...optimizer.Design_Iteration import Design_Iteration, Iteration_Keys, Objective_Iteration_Keys
from ...optimizer.Design_Population import Design_Population


def sorted_by_score(design_population: Design_Population) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :return: iterations sorted from worst to best overall performance
    """
    return design_population.sorted_iterations[Iteration_Keys.Scores]


def sorted_by_objective_score(design_population: Design_Population, objective: Objective) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :param objective: the objective to compare to
    :return: iterations sorted from worst to best objective performance
    """
    return design_population.objective_sorted_iterations[objective][Objective_Iteration_Keys.Scores]


def sorted_by_visitation(design_population: Design_Population):
    """
    :param design_population: population to source iterations from
    :return: iterations sorted how often they have been discovered/visited in the optimization
    """
    return design_population.sorted_iterations[Iteration_Keys.Visits]


def sorted_by_creation_time(design_population: Design_Population) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :return: iterations sorted when they were first discovered by the optimizer
    """
    return design_population.sorted_iterations[Iteration_Keys.First_Iteration]


def sorted_by_score_changes(design_population: Design_Population) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :return: iterations sorted by how much they have changed prior iterations scores
    """
    return design_population.sorted_iterations[Iteration_Keys.Score_Changes]


def sorted_by_score_decreases(design_population: Design_Population) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :return: iterations sorted by how often they increased prior iterations scores
    """
    return design_population.sorted_iterations[Iteration_Keys.Score_Decreases]


def sorted_by_score_increases(design_population: Design_Population) -> Iterable[Design_Iteration]:
    """
    :param design_population: population to source iterations from
    :return: iterations sorted by how often they have decreased prior iterations scores
    """
    return design_population.sorted_iterations[Iteration_Keys.Score_Increases]


def sorted_by_objective_changes(design_population: Design_Population, objective: Objective) -> Iterable[Design_Iteration]:
    """
    :param objective: objective to check score changes against
    :param design_population: population to source iterations from
    :return: iterations sorted by how much they have changed prior iterations scores
    """
    return design_population.objective_sorted_iterations[objective][Objective_Iteration_Keys.Score_Changes]


def sorted_by_objective_decreases(design_population: Design_Population, objective: Objective) -> Iterable[Design_Iteration]:
    """
    :param objective: objective to check score changes against
    :param design_population: population to source iterations from
    :return: iterations sorted by how often they increased prior iterations scores
    """
    return design_population.objective_sorted_iterations[objective][Objective_Iteration_Keys.Score_Decreases]


def sorted_by_objective_increases(design_population: Design_Population, objective: Objective) -> Iterable[Design_Iteration]:
    """
    :param objective: objective to check score changes against
    :param design_population: population to source iterations from
    :return: iterations sorted by how often they have decreased prior iterations scores
    """
    return design_population.objective_sorted_iterations[objective][Objective_Iteration_Keys.Score_Increases]
