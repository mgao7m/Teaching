# noisy-OR likelihood 
# interventions are encoded as a length-`n_nodes` integer sequence with values
# in {0, 1, 2} where

#     0 = forced off
#     1 = forced on
#     2 = free  (let the mechanism decide)

from __future__ import annotations

import math
from typing import Sequence

import numpy as np

from .dag import DAG, topological_order

FORCED_OFF = 0
FORCED_ON = 1
FREE = 2


def _activation_prob(k: int, wS: float, wB: float) -> float:
    return 1.0 - (1.0 - wB) * (1.0 - wS) ** k


def simulate(
    dag: DAG,
    intervention: Sequence[int],
    wS: float,
    wB: float,
    rng: np.random.Generator | None = None,
):
    if rng is None:
        rng = np.random.default_rng()
    if len(intervention) != dag.n_nodes:
        raise ValueError(
            f"intervention has length {len(intervention)} but dag has "
            f"{dag.n_nodes} nodes"
        )
    state = np.zeros(dag.n_nodes, dtype=int)
    for v in range(dag.n_nodes):
        if intervention[v] != FREE:
            state[v] = intervention[v]
    for v in topological_order(dag):
        if intervention[v] != FREE:
            continue
        k = sum(int(state[p]) for p in dag.parents(v))
        p_on = _activation_prob(k, wS, wB)
        state[v] = 1 if rng.random() < p_on else 0
    return state


def log_likelihood(
    dag: DAG,
    intervention: Sequence[int],
    observation: Sequence[int],
    wS: float,
    wB: float,
):
    if len(intervention) != dag.n_nodes or len(observation) != dag.n_nodes:
        raise ValueError(
            f"length mismatch: dag has {dag.n_nodes} nodes, "
            f"intervention has length {len(intervention)}, "
            f"observation has length {len(observation)}"
        )
    ll = 0.0
    for v in range(dag.n_nodes):
        if intervention[v] != FREE:
            if observation[v] != intervention[v]:
                return -math.inf
            continue
        k = sum(int(observation[p]) for p in dag.parents(v))
        p_on = _activation_prob(k, wS, wB)
        if observation[v] == 1:
            if p_on <= 0:
                return -math.inf
            ll += math.log(p_on)
        else:
            if p_on >= 1:
                return -math.inf
            ll += math.log(1.0 - p_on)
    return ll
