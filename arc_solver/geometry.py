"""Brique 1 : transformations géométriques globales (groupe diédral D4).

Détecte si chaque sortie d'entraînement est l'entrée ayant subi une même
rotation ou symétrie, puis applique cette transformation aux entrées de test.
"""

import numpy as np

# Ordre = priorité en cas d'ambiguïté (ex. grille symétrique) : les plus simples d'abord.
TRANSFORMS = {
    "identity": lambda g: g,
    "rot90": lambda g: np.rot90(g, k=-1),   # 90° sens horaire
    "rot180": lambda g: np.rot90(g, k=2),
    "rot270": lambda g: np.rot90(g, k=1),   # 270° horaire = 90° anti-horaire
    "flip_horizontal": lambda g: g[:, ::-1],  # miroir gauche <-> droite
    "flip_vertical": lambda g: g[::-1, :],    # miroir haut <-> bas
    "transpose": lambda g: g.T,               # symétrie diagonale principale
    "anti_transpose": lambda g: np.rot90(g, k=2).T,  # symétrie anti-diagonale
}


def detect_geometric_transform(train_pairs, allow_identity=False):
    """Renvoie le nom de la transformation qui explique TOUTES les paires, sinon None."""
    for name, fn in TRANSFORMS.items():
        if name == "identity" and not allow_identity:
            continue
        if all(
            fn(p["input"]).shape == p["output"].shape
            and np.array_equal(fn(p["input"]), p["output"])
            for p in train_pairs
        ):
            return name
    return None


def solve(task):
    """Solveur : liste des grilles de sortie pour chaque test, ou None si non applicable."""
    name = detect_geometric_transform(task["train"])
    if name is None:
        return None
    fn = TRANSFORMS[name]
    return [np.ascontiguousarray(fn(t["input"])) for t in task["test"]]
