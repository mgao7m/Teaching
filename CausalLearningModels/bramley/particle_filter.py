"""Particle filter over DAGs with MCMC rejuvenation.

Each time step:

    1. Reweight: log w_i  +=  log P(obs_t | dag_i, intervention_t).
    2. If there is more than one particle and the effective sample size has
       fallen below threshold, systematically resample (weights are reset to
       uniform).
    3. Always apply a few MCMC steps (symmetric single-edge toggle proposal)
       targeting the posterior given the entire observation history.

Rejuvenation runs every step regardless of resampling because that is what
actually moves the chain. In particular, the n_particles=1 case (Bramley-like
single-hypothesis learner) relies entirely on MCMC: there is no resampling
to do, and without an unconditional rejuvenation step the chain never moves.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import numpy as np

from .dag import DAG, is_acyclic
from .noisy_or import log_likelihood
from .prior import all_directed_edges, log_prior, sample_prior

Observation = Tuple[Sequence[int], Sequence[int]]  # (intervention, outcome)


@dataclass
class Particle:
    dag: DAG
    log_weight: float = 0.0


# ── basic weight utilities ──────────────────────────────────────────────────


def _logsumexp(xs: Sequence[float]) -> float:
    m = max(xs)
    if math.isinf(m) and m < 0:
        return -math.inf
    return m + math.log(sum(math.exp(x - m) for x in xs))


def normalize_weights(particles: List[Particle]) -> List[float]:
    """Normalized weights in linear space. Does not mutate the particles."""
    lw = [p.log_weight for p in particles]
    z = _logsumexp(lw)
    if math.isinf(z):
        n = len(particles)
        return [1.0 / n] * n
    return [math.exp(l - z) for l in lw]


def effective_sample_size(particles: List[Particle]) -> float:
    w = normalize_weights(particles)
    return 1.0 / sum(x * x for x in w)


# ── filter steps ────────────────────────────────────────────────────────────


def init_particles(
    n_particles: int,
    n_nodes: int,
    p_edge: float,
    rng: np.random.Generator,
) -> List[Particle]:
    return [
        Particle(dag=sample_prior(n_nodes, p_edge, rng), log_weight=0.0)
        for _ in range(n_particles)
    ]


def reweight(
    particles: List[Particle],
    obs: Observation,
    wS: float,
    wB: float,
) -> None:
    """In-place: log w_i += log P(obs | dag_i, intervention)."""
    intervention, outcome = obs
    for p in particles:
        p.log_weight += log_likelihood(p.dag, intervention, outcome, wS, wB)


def resample(
    particles: List[Particle],
    rng: np.random.Generator,
) -> List[Particle]:
    """Systematic resampling. Returns a fresh list with reset weights."""
    n = len(particles)
    w = normalize_weights(particles)
    cumw = np.cumsum(w)
    u0 = rng.random() / n
    new: List[Particle] = []
    j = 0
    for i in range(n):
        u = u0 + i / n
        while j < n - 1 and u > cumw[j]:
            j += 1
        new.append(Particle(dag=particles[j].dag, log_weight=0.0))
    return new


# ── MCMC rejuvenation kernel ────────────────────────────────────────────────


def _propose_edit(dag: DAG, rng: np.random.Generator) -> DAG:
    """Symmetric single-edge toggle. Cyclic results are rejected upstream."""
    candidates = all_directed_edges(dag.n_nodes)
    u, v = candidates[int(rng.integers(len(candidates)))]
    if dag.has_edge(u, v):
        return dag.remove_edge(u, v)
    return dag.add_edge(u, v)


def _log_posterior(
    dag: DAG,
    history: Sequence[Observation],
    wS: float,
    wB: float,
    p_edge: float,
) -> float:
    lp = log_prior(dag, p_edge)
    if math.isinf(lp):
        return -math.inf
    for intervention, outcome in history:
        lp += log_likelihood(dag, intervention, outcome, wS, wB)
        if math.isinf(lp):
            return -math.inf
    return lp


def mcmc_step(
    particle: Particle,
    history: Sequence[Observation],
    wS: float,
    wB: float,
    p_edge: float,
    rng: np.random.Generator,
    cached_lp: float | None = None,
) -> Tuple[Particle, float]:
    lp_curr = (
        cached_lp
        if cached_lp is not None
        else _log_posterior(particle.dag, history, wS, wB, p_edge)
    )
    proposed = _propose_edit(particle.dag, rng)
    if not is_acyclic(proposed):
        return particle, lp_curr
    lp_prop = _log_posterior(proposed, history, wS, wB, p_edge)
    log_acc = lp_prop - lp_curr
    if math.isnan(log_acc):
        # Both states have -inf log-posterior; accept to keep moving so the
        # chain can eventually find a finite-posterior state.
        accept = True
    else:
        accept = rng.random() < math.exp(min(0.0, log_acc))
    if accept:
        return Particle(dag=proposed, log_weight=particle.log_weight), lp_prop
    return particle, lp_curr


def rejuvenate(
    particles: List[Particle],
    history: Sequence[Observation],
    wS: float,
    wB: float,
    p_edge: float,
    n_steps: int,
    rng: np.random.Generator,
) -> List[Particle]:
    """Apply `n_steps` MH moves to each particle independently."""
    out: List[Particle] = []
    for p in particles:
        lp = _log_posterior(p.dag, history, wS, wB, p_edge)
        for _ in range(n_steps):
            p, lp = mcmc_step(p, history, wS, wB, p_edge, rng=rng, cached_lp=lp)
        out.append(p)
    return out


# ── full filter ─────────────────────────────────────────────────────────────


@dataclass
class FilterConfig:
    n_particles: int = 10
    n_nodes: int = 4
    p_edge: float = 0.3
    wS: float = 1.0
    wB: float = 0.0
    ess_threshold_frac: float = 0.5
    n_rejuv_steps: int = 10


def run_filter(
    observations: Sequence[Observation],
    config: FilterConfig,
    rng: np.random.Generator | None = None,
):
    if rng is None:
        rng = np.random.default_rng()
    if observations:
        obs_n = len(observations[0][0])
        if obs_n != config.n_nodes:
            raise ValueError(
                f"FilterConfig.n_nodes={config.n_nodes} but observations have "
                f"{obs_n} nodes (length of first intervention vector)"
            )
    particles = init_particles(
        config.n_particles, config.n_nodes, config.p_edge, rng
    )
    history: List[Observation] = []
    snapshots: List[dict] = []

    for obs in observations:
        reweight(particles, obs, config.wS, config.wB)
        ess = effective_sample_size(particles)
        history.append(obs)
        if (
            config.n_particles > 1
            and ess < config.ess_threshold_frac * config.n_particles
        ):
            particles = resample(particles, rng)
        particles = rejuvenate(
            particles,
            history,
            config.wS,
            config.wB,
            config.p_edge,
            config.n_rejuv_steps,
            rng,
        )
        snapshots.append(
            {
                "ess": ess,
                "weights": normalize_weights(particles),
                "dags": [p.dag for p in particles],
            }
        )

    return particles, snapshots


# ── posterior summaries ─────────────────────────────────────────────────────


def edge_marginals(
    particles: Sequence[Particle],
    n_nodes: int,
) -> np.ndarray:
    w = normalize_weights(list(particles))
    P = np.zeros((n_nodes, n_nodes))
    for wi, particle in zip(w, particles):
        for u, v in particle.dag.edges:
            P[u, v] += wi
    return P
