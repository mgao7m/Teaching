"""DAG hypothesis representation.

A DAG is a fixed set of nodes plus a frozenset of directed edges. The class
itself does not enforce acyclicity; callers can check it via `is_acyclic`.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Iterable, List, Tuple

Edge = Tuple[int, int]


@dataclass(frozen=True)
class DAG:
    n_nodes: int
    edges: FrozenSet[Edge]

    def parents(self, v: int) -> List[int]:
        return [u for (u, w) in self.edges if w == v]

    def children(self, v: int) -> List[int]:
        return [w for (u, w) in self.edges if u == v]

    def has_edge(self, u: int, v: int) -> bool:
        return (u, v) in self.edges

    def with_edges(self, edges: Iterable[Edge]) -> "DAG":
        return DAG(self.n_nodes, frozenset(edges))

    def add_edge(self, u: int, v: int) -> "DAG":
        return self.with_edges(self.edges | {(u, v)})

    def remove_edge(self, u: int, v: int) -> "DAG":
        return self.with_edges(self.edges - {(u, v)})

    def reverse_edge(self, u: int, v: int) -> "DAG":
        return self.with_edges((self.edges - {(u, v)}) | {(v, u)})


def is_acyclic(dag: DAG) -> bool:
    """Kahn's algorithm. True iff there is no directed cycle."""
    in_deg = [0] * dag.n_nodes
    children: List[List[int]] = [[] for _ in range(dag.n_nodes)]
    for u, v in dag.edges:
        in_deg[v] += 1
        children[u].append(v)
    stack = [i for i in range(dag.n_nodes) if in_deg[i] == 0]
    seen = 0
    while stack:
        u = stack.pop()
        seen += 1
        for v in children[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                stack.append(v)
    return seen == dag.n_nodes


def topological_order(dag: DAG) -> List[int]:
    """Return one topological order. Raises if the graph is cyclic."""
    in_deg = [0] * dag.n_nodes
    children: List[List[int]] = [[] for _ in range(dag.n_nodes)]
    for u, v in dag.edges:
        in_deg[v] += 1
        children[u].append(v)
    order: List[int] = []
    stack = [i for i in range(dag.n_nodes) if in_deg[i] == 0]
    while stack:
        u = stack.pop()
        order.append(u)
        for v in children[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                stack.append(v)
    if len(order) != dag.n_nodes:
        raise ValueError("graph contains a cycle")
    return order
