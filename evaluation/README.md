# Boîte à outils d'évaluation de l'artefact

Ces scripts produisent, de façon **reproductible**, les grandeurs citées dans le
mémoire de Master MMTD. Ils constituent la mise en œuvre concrète des méthodes
d'évaluation décrites au § 7.4 (analyse statique, test fonctionnel, rejeu sur
historique) et répondent à l'exigence de reproductibilité du § 7.6.3 : un tiers
disposant du dépôt doit obtenir les mêmes nombres.

## Les quatre scripts

| Script | Ce qu'il mesure | Hypothèse | Base requise |
|---|---|---|---|
| `audit-artefact.cjs` | périmètre livré : code, modules, routes, services, tables, dépendances | H4, § 8.4 | non |
| `evaluer-detection-anomalies.cjs` | précision, rappel, F1 du détecteur d'anomalies | H2, § 8.2 | non |
| `evaluer-predictions.cjs` | MAE, MAPE, couverture d'intervalle des prévisions | H2, § 8.2 | non |
| `indicateurs-exploitation.cjs` | délais de recouvrement, part du mobile money, encours | H3, § 8.3 | **oui** |

Les trois premiers ne nécessitent **aucune base de données** : l'accès aux
données y est substitué en mémoire par un jeu de contrôle déterministe. C'est
ce qui les rend exécutables par un membre du jury.

## Exécution

```bash
node evaluation/audit-artefact.cjs
node evaluation/evaluer-detection-anomalies.cjs
node evaluation/evaluer-predictions.cjs
node evaluation/indicateurs-exploitation.cjs      # nécessite la connexion à la base
```

Chaque script accepte `--json` pour une sortie exploitable, et écrit son rapport
dans `evaluation/resultats/`.

Les scripts d'évaluation acceptent `--graine <n>` : changer la graine change le
jeu de contrôle. Les résultats cités dans le mémoire correspondent aux graines
par défaut (42 pour les anomalies, 7 pour les prédictions).

## Portée et limites

Ces mesures sont **artificielles** au sens de Venable, Pries-Heje et Baskerville
(2016) : elles établissent le comportement des services dans des conditions
maîtrisées. Elles ne mesurent pas ce que les services produisent chez des
utilisateurs en situation de travail, ce qui relèverait d'une évaluation
naturaliste — protocole formulé au § 10.5 du mémoire.

Le script `indicateurs-exploitation.cjs` fait exception : il porte sur des
données réelles, mais d'**une seule entreprise** et sur un historique court. Il
autorise des constats descriptifs, non des inférences.

## Anonymisation

`indicateurs-exploitation.cjs` n'extrait que des agrégations. Aucune requête ne
renvoie de donnée nominative, conformément au § 7.7 du mémoire et à la loi
sénégalaise n° 2008-12 sur la protection des données à caractère personnel.

## Vérifier le script d'indicateurs sans toucher à la base de production

`indicateurs-exploitation.cjs` est le seul script qui interroge une vraie base.
Pour le valider sans risque, on peut monter une base locale à partir des
migrations du projet :

```bash
# 1. base vide
mysql -e "CREATE DATABASE allo_beton CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. schéma, à partir des migrations du dépôt
cd backend
node scripts/migrate.js
node scripts/create_all_ecom_tables.js
node scripts/migrate_ecom_customers.js
node scripts/migrate_tracking.js
node scripts/migrate_orders_schema.js

# 3. le script, pointé sur cette base via backend/.env
cd ..
node evaluation/indicateurs-exploitation.cjs
```

Le script relève d'abord le schéma présent : un indicateur dont la table manque
est déclaré indisponible, il ne fait pas échouer les autres.

## Deux pièges du schéma, à connaître avant d'interpréter les résultats

**La table `sales` ne porte pas de colonne `paid_amount`.** Le montant réglé se
calcule à partir des paiements rattachés à la vente, ce que fait l'indicateur
`encours_client`. Toute requête qui supposerait cette colonne échouerait.

**Deux tables de paiement coexistent, et une seule ventile par opérateur.**
`payments.payment_method` (côté ERP) est une énumération dont `mobile_money` est
une valeur unique : elle ne distingue ni Wave, ni Orange Money, ni Free Money.
La ventilation par opérateur se lit dans `ecom_payments.method`, côté boutique.
Le § 8.3 du mémoire doit donc prendre ses chiffres par opérateur dans la seconde
table, et ses délais de recouvrement dans la première.
