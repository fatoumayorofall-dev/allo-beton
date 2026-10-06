import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from arc_solver import geometry  # noqa: E402
from arc_solver.data import load_task, load_tasks, to_list  # noqa: E402

A = [[1, 2, 0], [3, 4, 0]]
B = [[5, 0], [6, 7], [8, 9]]


def make_task(fn, grids, test_grid):
    return {
        "train": [{"input": to_list(np.array(g)), "output": to_list(fn(np.array(g)))} for g in grids],
        "test": [{"input": test_grid}],
    }


class TestGeometry(unittest.TestCase):
    def test_each_transform_is_detected_and_applied(self):
        test_grid = [[1, 0, 2], [0, 3, 4], [5, 6, 7], [8, 0, 9]]
        for name, fn in geometry.TRANSFORMS.items():
            if name == "identity":
                continue
            with self.subTest(name=name), tempfile.TemporaryDirectory() as d:
                p = Path(d) / "t.json"
                p.write_text(json.dumps(make_task(fn, [A, B], test_grid)))
                task = load_task(p)
                self.assertEqual(geometry.detect_geometric_transform(task["train"]), name)
                pred = geometry.solve(task)
                self.assertTrue(np.array_equal(pred[0], fn(np.array(test_grid))))

    def test_rot90_is_clockwise(self):
        g = np.array([[1, 2], [3, 4]])
        self.assertEqual(to_list(geometry.TRANSFORMS["rot90"](g)), [[3, 1], [4, 2]])

    def test_returns_none_when_no_rule_fits(self):
        task = {
            "train": [{"input": np.array([[1, 2]]), "output": np.array([[3, 3]])}],
            "test": [{"input": np.array([[1]])}],
        }
        self.assertIsNone(geometry.solve(task))

    def test_inconsistent_pairs_rejected(self):
        a, b = np.array(A), np.array(B)
        task = {
            "train": [
                {"input": a, "output": np.rot90(a, -1)},
                {"input": b, "output": b[::-1, :]},
            ],
            "test": [{"input": a}],
        }
        self.assertIsNone(geometry.solve(task))

    def test_kaggle_combined_format(self):
        with tempfile.TemporaryDirectory() as d:
            ch, so = Path(d) / "c.json", Path(d) / "s.json"
            ch.write_text(json.dumps({"abc": {"train": [{"input": A, "output": A}], "test": [{"input": B}]}}))
            so.write_text(json.dumps({"abc": [B]}))
            tasks = load_tasks(ch, so)
            self.assertTrue(np.array_equal(tasks["abc"]["test"][0]["output"], np.array(B)))


if __name__ == "__main__":
    unittest.main()
