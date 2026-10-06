# Projet ARC-AGI — règles permanentes

Ce dépôt contient notre solveur pour le concours Kaggle ARC Prize.
Dépôt dédié uniquement au concours.

## Contraintes absolues

1. **100 % autonome** : tout le code s'exécute sur les machines Kaggle, sans service externe.
2. **Internet OFF** : lors de l'évaluation finale (2 novembre), aucun accès réseau.
   - Aucun appel d'API (ni Claude, ni autre LLM distant), aucun `pip install` à l'exécution,
     aucun téléchargement de poids ou de données.
   - Toute la logique (géométrie, symétries, formes, couleurs) est codée en Python dans le dépôt.
   - Dépendances autorisées : bibliothèque standard + paquets préinstallés sur l'image Kaggle
     (numpy en priorité). Tout autre paquet doit être embarqué comme dataset Kaggle hors ligne.
3. **Budget temps : < 9 h au total** sur GPU RTX 6000. L'efficacité est prioritaire :
   - chaque solveur doit avoir un budget de temps par tâche et échouer proprement (retour `None`) ;
   - on essaie d'abord les règles rapides (O(taille de grille)), les recherches coûteuses ensuite ;
   - jamais de boucle sans borne.
4. **Format des données** : JSON. Une grille = liste de listes d'entiers 0–9 (couleurs).
   Chaque tâche a `train` (paires `input`/`output`) et `test` (`input`, `output` absent en éval).
   Le solveur doit induire la règle à partir de `train` et l'appliquer à `test`.

## Conventions de code

- Les grilles sont manipulées en interne comme `numpy.ndarray` (dtype `int8`), et reconverties
  en listes de listes pour la soumission.
- Un solveur = une fonction `solve(task) -> list[grid] | None` : `None` si la règle n'explique
  pas **toutes** les paires d'entraînement (pas de devinette silencieuse).
- Chaque nouvelle brique logique est accompagnée de tests dans `tests/`.
- Lancer les tests : `python -m unittest discover -s tests` depuis la racine du dépôt.
