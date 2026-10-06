"""Chargement des tâches ARC (fichiers JSON), 100 % hors ligne."""

import json
from pathlib import Path

import numpy as np


def to_array(grid):
    """Liste de listes d'entiers 0-9 -> ndarray int8."""
    arr = np.asarray(grid, dtype=np.int8)
    if arr.ndim != 2:
        raise ValueError(f"grille non rectangulaire ou mal formée : shape={arr.shape}")
    return arr


def to_list(arr):
    """ndarray -> liste de listes d'int Python (format de soumission)."""
    return [[int(v) for v in row] for row in arr]


def _parse_task(raw):
    return {
        "train": [
            {"input": to_array(p["input"]), "output": to_array(p["output"])}
            for p in raw["train"]
        ],
        "test": [
            {
                "input": to_array(p["input"]),
                "output": to_array(p["output"]) if "output" in p else None,
            }
            for p in raw["test"]
        ],
    }


def load_task(path):
    """Charge un fichier de tâche individuel (format {"train": [...], "test": [...]})."""
    with open(path, encoding="utf-8") as f:
        return _parse_task(json.load(f))


def load_tasks(path, solutions_path=None):
    """Charge un ensemble de tâches et renvoie {task_id: task}.

    `path` peut être :
      - un dossier de fichiers `<task_id>.json` (format du dépôt ARC original) ;
      - un fichier JSON unique {task_id: task} (format Kaggle, ex. arc-agi_training_challenges.json).
    `solutions_path` (optionnel, format Kaggle) : {task_id: [output_test_0, ...]}.
    """
    path = Path(path)
    if path.is_dir():
        tasks = {p.stem: load_task(p) for p in sorted(path.glob("*.json"))}
    else:
        with open(path, encoding="utf-8") as f:
            tasks = {tid: _parse_task(raw) for tid, raw in json.load(f).items()}

    if solutions_path is not None:
        with open(solutions_path, encoding="utf-8") as f:
            solutions = json.load(f)
        for tid, outputs in solutions.items():
            if tid in tasks:
                for test_pair, out in zip(tasks[tid]["test"], outputs):
                    test_pair["output"] = to_array(out)
    return tasks
