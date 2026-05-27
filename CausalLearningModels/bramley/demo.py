
from __future__ import annotations

if __name__ == "__main__" and __package__ in (None, ""):
    import pathlib
    import sys

    _here = pathlib.Path(__file__).resolve()
    sys.path.insert(0, str(_here.parents[2]))
    __package__ = "CausalLearningModels.bramley"

import numpy as np

from .dag import DAG
from .noisy_or import FORCED_OFF, FORCED_ON, FREE, simulate
from .particle_filter import FilterConfig, run_filter


def _names(n: int):
    return [chr(ord("A") + i) for i in range(n)]


def _format_marginals(P: np.ndarray) -> str:
    n = P.shape[0]
    names = _names(n)
    header = "        " + "  ".join(f"{names[v]:>5}" for v in range(n))
    lines = [header]
    for u in range(n):
        cells = [
            f"{P[u, v]:5.2f}" if u != v else "    -"
            for v in range(n)
        ]
        lines.append(f"  {names[u]}    " + "  ".join(cells))
    return "\n".join(lines)


def _informative_interventions(n_nodes: int):
    out = []
    for i in range(n_nodes):
        on = [FREE] * n_nodes
        on[i] = FORCED_ON
        out.append(on)
        off = [FREE] * n_nodes
        off[i] = FORCED_OFF
        out.append(off)
    return out

def _random_intervention(n_nodes: int):
    return [int(np.random.randint(3)) for _ in range(n_nodes)]


def main():
    true_dag = DAG(4, frozenset({(0, 1), (1, 2), (0, 3)}))
    n_nodes = true_dag.n_nodes
    names = _names(n_nodes)

    config = FilterConfig(
        n_particles=1,
        n_nodes=n_nodes,
        p_edge=0.3,
        wS=1.0,
        wB=0.0,
        ess_threshold_frac=0.5,
        n_rejuv_steps=30,
    )

    n_trials = 30
    #ivs = _informative_interventions(n_nodes)
    ivs = [_random_intervention(n_nodes) for _ in range(n_trials)]
    observations = []
    for k in range(n_trials):
        iv = ivs[k % len(ivs)]
        out = simulate(true_dag, iv, config.wS, config.wB).tolist()
        observations.append((iv, out))

    _, snapshots = run_filter(observations, config)

    true_edges = sorted(true_dag.edges)
    print(f"true edges: {true_edges}")
    print(
        "true edge_str: "
        + ", ".join(f"{names[u]}->{names[v]}" for u, v in true_edges)
    )
    print()

    for t, snap in enumerate(snapshots):
        iv, out = observations[t]
        P = np.zeros((n_nodes, n_nodes))
        for wi, dag in zip(snap["weights"], snap["dags"]):
            for u, v in dag.edges:
                P[u, v] += wi
        print(
            f"t={t + 1:2d}   ESS={snap['ess']:6.1f}   "
            f"iv={iv}   obs={out}"
        )
        print(_format_marginals(P))
        print()


if __name__ == "__main__":
    main()
