# 🧪 Tests - Système de Commandes Fournisseurs

## ✅ Corrections Apportées

### 1. **Création de Commandes**
- ✅ Ajout du champ `product_name` dans l'INSERT `purchase_order_items`
- ✅ Les articles sont maintenant correctement sauvegardés avec leurs noms

### 2. **Calcul et Affichage des Prix**
- ✅ `PurchaseOrderForm` calcule correctement : `quantity × unit_cost` pour chaque ligne
- ✅ Total calculé avant envoi à l'API
- ✅ Articles et prix affichés dans la table avec formatage XOF

### 3. **Récupération des Articles**
- ✅ GET `/api/purchase-orders/supplier/:supplier_id` retourne les `items` pour chaque commande
- ✅ Chaque item contient: `product_name, quantity, unit_cost, line_total`

### 4. **Affichage Tableau**
- ✅ Colonne "Articles" affiche les noms réels au lieu de "Béton" en dur
- ✅ Affiche jusqu'à 2 articles avec "+X autre(s)" si plus
- ✅ Format: "Produit (Quantité)"

### 5. **Refresh Automatique**
- ✅ Après création d'une commande, la liste se rafraîchit avec `refreshKey`
- ✅ Les nouvelles commandes apparaissent immédiatement

## 📋 Procédure de Test Manuelle

### Étape 1: Créer une Commande
1. Navigate to **Fournisseurs**
2. Click on a supplier to open **Détail Fournisseur**
3. Click **"Nouvelle Commande"**
4. Fill in:
   - **N° Commande**: Auto-généré (CMD-xxxxx)
   - **Date de Livraison**: Choisir une date
   - **Articles**:
     - Produit 1: "Béton C25" | Qté: 5 | Prix: 50000 XOF
     - Produit 2: "Béton C30" | Qté: 3 | Prix: 75000 XOF
   - **Notes**: Optionnel
5. Total doit afficher: **425,000 F** (5×50K + 3×75K)
6. Click **"Enregistrer"**

### Étape 2: Vérifier la Création
- Modal se ferme automatiquement
- Message console: "✅ Commande créée avec succès"
- Pas d'erreur HTTP (vérifier Network tab)

### Étape 3: Afficher l'Historique
1. Click **"Voir Historique"** (le bouton vert)
2. Table s'ouvre avec colonnes:
   - **Date**: Format JJ/MM/AAAA
   - **N° Commande**: CMD-xxxxx
   - **Articles**: "Béton C25 (5)" et "Béton C30 (3)"
   - **Montant**: 425,000 F (formaté XOF)
   - **Livraison Prévue**: Date choisie ou "—"
   - **Statut**: "draft" (gris)
   - **Actions**: Voir / Télécharger

### Étape 4: Créer une 2e Commande
1. Fermer modal historique
2. Cliquer à nouveau **"Nouvelle Commande"**
3. Ajouter différents articles
4. Enregistrer
5. Ouvrir **"Voir Historique"** → 2 commandes doivent apparaître

## 🔧 Vérifications Techniques

### Frontend Console
```javascript
// Créer une commande via formulaire devrait afficher:
console.log('Création commande:', { ... })
// Puis:
console.log('✅ Commande créée avec succès')
```

### Network (F12 → Network tab)
```
POST /api/purchase-orders
Body: {
  supplier_id: "uuid",
  order_number: "CMD-1234567890",
  expectedDeliveryDate: "2026-02-15",
  notes: "...",
  items: [
    { product_name: "Béton C25", quantity: 5, unit_cost: 50000 },
    { product_name: "Béton C30", quantity: 3, unit_cost: 75000 }
  ],
  total_amount: 425000
}
Response:
{
  success: true,
  message: "Commande créée avec succès",
  data: {
    id: "uuid",
    order_number: "CMD-1234567890",
    status: "draft",
    total_amount: 425000,
    items: [
      { id: "uuid", product_name: "Béton C25", quantity: 5, unit_cost: 50000, line_total: 250000 },
      { id: "uuid", product_name: "Béton C30", quantity: 3, unit_cost: 75000, line_total: 225000 }
    ],
    ...
  }
}
```

### Database Verification
```sql
-- Vérifier les commandes créées:
SELECT po.id, po.order_number, po.total_amount, COUNT(poi.id) as item_count
FROM purchase_orders po
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
GROUP BY po.id
ORDER BY po.created_at DESC;

-- Vérifier les articles avec prix:
SELECT poi.product_name, poi.quantity, poi.unit_cost, poi.line_total
FROM purchase_order_items poi
ORDER BY poi.created_at DESC
LIMIT 10;
```

## ✨ Résultats Attendus

### Calculs Corrects
- ✅ Prix unitaire × Quantité = Total ligne
- ✅ Somme totale ligne = Montant commande
- ✅ Formatage XOF avec séparateurs (ex: 425,000 F)

### Affichage Articles
- ✅ Noms des articles visibles dans tableau
- ✅ Quantités affichées entre parenthèses
- ✅ Troncature intelligente (max 2 visibles + "+X autre(s)")

### Refresh Automatique
- ✅ Après création, liste se réaffiche sans F5
- ✅ Nouvelles commandes visibles immédiatement
- ✅ Modal historique se rafraîchit

## 🐛 Si Erreurs

### Erreur 500
- Vérifier server.js console pour détails
- Vérifier token JWT valide (depuis localStorage)
- Vérifier supplier_id existe en base

### Articles ne s'affichent pas
- Vérifier Network → POST response contient `items: []`
- Vérifier GET `/supplier/:id` retourne items avec product_name
- Vérifier base données: `SELECT * FROM purchase_order_items;`

### Calculs incorrects
- Vérifier PurchaseOrderForm: `item.quantity * item.unit_cost`
- Vérifier backend: `line_total = quantity * unit_cost`
- Vérifier formatCurrency en XOF dans liste

## 📊 État Complet

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Créer commande | ✅ | Articles + prix sauvegardés |
| Calculer total | ✅ | Formule correcte (Qté × Prix) |
| Afficher articles | ✅ | Noms réels au lieu de "Béton" |
| Formatage devise | ✅ | XOF avec séparateurs |
| Refresh liste | ✅ | Automatique après création |
| Récupérer historique | ✅ | Avec items détaillés |

## 🎯 Prochaines Étapes

1. **Télécharger PDF** - Implémenter génération facture
2. **Modifier Commande** - Éditer statut, ajouter notes
3. **Détail Complet** - Modal avec tous les items et calculs détaillés
4. **Export Excel** - Alternative au PDF

---
**Dernière mise à jour**: 29 Janvier 2026
**Version**: 1.0 - Système complet et fonctionnel
