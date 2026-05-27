"""Prior over DAGs.

Independent Bernoulli(`p_edge`) per directed edge, restricted to the acyclic
subset. We never compute the normalizing constant: it cancels in every MH
ratio we use.
"""
from __future__ import annotations

import math
from typing import List

import numpy as np

from .dag import DAG, Edge, is_acyclic


def all_directed_edges(n_nodes: int) -> List[Edge]:
    return [(u, v) for u in range(n_nodes) for v in range(n_nodes) if u != v]


def sample_prior(
    n_nodes: int,
    p_edge: float,
    rng = None,
    max_rejection_tries: int = 200,
):
    for _ in range(max_rejection_tries):
        edges = frozenset(
            e for e in all_directed_edges(n_nodes) if (np.random.random() if rng is None else rng.random()) < p_edge
        )
        dag = DAG(n_nodes, edges)
        if is_acyclic(dag): 
            return dag

    if rng is None:
        order = list(np.random.permutation(n_nodes))
    else:
        order = list(rng.permutation(n_nodes))
    edges = []
    for i, u in enumerate(order):
        for v in order[i + 1 :]:
            R = np.random.random() if rng is None else rng.random()
            if R < p_edge:
                edges.append((int(u), int(v)))
    return DAG(n_nodes, frozenset(edges))


def log_prior(dag: DAG, p_edge: float) -> float:
    """Unnormalized log-prior. Returns -inf for cyclic graphs."""
    if not is_acyclic(dag):
        return -math.inf
    n_total = dag.n_nodes * (dag.n_nodes - 1)
    n_present = len(dag.edges)
    n_absent = n_total - n_present
    return (
        n_present * math.log(p_edge)
        + n_absent * math.log(1.0 - p_edge)
    )
