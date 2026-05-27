"""Particle filter over noisy-OR DAGs, in the spirit of Bramley et al. (2017).

Each particle is a single DAG on a fixed node set. We treat the noisy-OR
parameters w_S and w_B as known. Inference proceeds as a standard sequential
Monte Carlo loop:

    for each (intervention, observation):
        reweight particles by their likelihood for the new observation
        if effective sample size is too low:
            resample
            apply a few MCMC moves (single-edge toggle) for rejuvenation
"""

from .dag import DAG, is_acyclic, topological_order
from .noisy_or import FORCED_OFF, FORCED_ON, FREE, log_likelihood, simulate
from .particle_filter import (
    FilterConfig,
    Particle,
    edge_marginals,
    effective_sample_size,
    init_particles,
    normalize_weights,
    rejuvenate,
    resample,
    reweight,
    run_filter,
)
from .prior import log_prior, sample_prior

__all__ = [
    "DAG",
    "FilterConfig",
    "FORCED_OFF",
    "FORCED_ON",
    "FREE",
    "Particle",
    "edge_marginals",
    "effective_sample_size",
    "init_particles",
    "is_acyclic",
    "log_likelihood",
    "log_prior",
    "normalize_weights",
    "rejuvenate",
    "resample",
    "reweight",
    "run_filter",
    "sample_prior",
    "simulate",
    "topological_order",
]
