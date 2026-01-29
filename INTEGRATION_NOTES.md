# Notes d'Intégration - Système de Gestion des Commandes Fournisseurs

## ✅ Intégrations Complétées

### 1. Modal Historique des Commandes (Factures)
- **Fichier**: `src/components/Suppliers/PurchaseOrdersList.tsx`
- **Statut**: ✅ Créé et connecté
- **Fonctionnalité**: Affiche l'historique des commandes fournisseurs dans une table professionnelle avec:
  - Colonnes: Date, N° Commande, Articles, Montant, Livraison Prévue, Statut, Actions
  - Formatage monétaire XOF (Franc CFA)
  - Formatage de dates français (jj/mm/aaaa)
  - Badges de statut colorés (draft/sent/confirmed/received/cancelled)
  - Total général calculé
  - États de chargement et d'erreur

### 2. Connexion "Voir Historique" → Modal PurchaseOrdersList
- **Fichier**: `src/components/Suppliers/SupplierDetail.tsx`
- **Changements**:
  - Ajout état `showOrdersList` (useState)
  - Bouton "Voir Historique" déclenche `setShowOrdersList(true)`
  - Rendu conditionnel du modal `PurchaseOrdersList` avec supplierId et supplierName
  - Import de `PurchaseOrdersList` en haut du fichier

### 3. Flux de Données - API
- **Frontend**: `src/services/mysql-api.js`
  - Méthode: `purchaseOrdersAPI.getBySupplier(supplierId)`
  - URL: `GET /api/purchase-orders/supplier/{supplierId}`
  
- **Backend**: `backend/routes/purchase_orders.js`
  - Route: `GET /supplier/:supplier_id`
  - Authentification: `authenticateToken`
  - Retour: Tableau de commandes filtrées par user_id et supplier_id

## 📊 Structure des Données - Commandes (Purchase Orders)

### Table: `purchase_orders`
```sql
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- supplier_id (UUID, FK → suppliers.id)
- order_number (VARCHAR)
- status (ENUM: draft, sent, confirmed, received, cancelled)
- order_date (TIMESTAMP)
- expected_delivery_date (DATE)
- total_amount (DECIMAL)
- notes (TEXT)
- created_at (TIMESTAMP)
```

### Table: `purchase_order_items`
```sql
- id (UUID, PK)
- purchase_order_id (UUID, FK → purchase_orders.id)
- product_name (VARCHAR) - Optionnel, pour description personnalisée
- quantity (INT)
- unit_cost (DECIMAL)
- line_total (DECIMAL)
- created_at (TIMESTAMP)
```

## 🔄 Flux Utilisateur

1. **Utilisateur ouvre Détail Fournisseur** 
   - Clique sur icône fournisseur dans liste

2. **Trois actions disponibles**
   - "Nouvelle Commande" → Ouvre `PurchaseOrderForm`
   - "Voir Historique" → **Ouvre `PurchaseOrdersList`** ← NOUVELLEMENT CONNECTÉ
   - "Contacter" → Placeholder pour fonctionnalité future

3. **Modal Historique se charge**
   - Récupère supplierId et supplierName du contexte
   - Lance `purchaseOrdersAPI.getBySupplier(supplierId)`
   - Affiche tableau des commandes avec filtering par user_id

4. **Affichage Tableau**
   - Formatage XOF des montants
   - Formatage dates locales
   - Badges de statut colorés
   - Boutons d'actions (Voir/Télécharger PDF)

## 🎨 Design et Cohérence

### Couleurs Utilisées
- Bleu (primaire): `bg-blue-600`, `text-blue-600` → Informations, en-têtes
- Vert (succès): `bg-green-600` → Commandes confirmées, actions positives
- Jaune (avertissement): `bg-yellow-600` → Articles en attente
- Gris (neutre): `bg-gray-600` → Actions secondaires
- Rouge (danger): `bg-red-600` → Annulées, erreurs

### Polices et Sizing
- En-têtes: `text-xl font-semibold` pour titres modaux
- Sous-titres: `text-sm text-gray-600` pour contexte
- Cellules tableau: `text-gray-900` ou `text-gray-600` selon importance
- Nombres: `font-bold` pour montants, `font-semibold` pour totaux

### Espacements
- Padding intérieur: `p-6` pour content zones, `p-3` pour cellules
- Gaps grille: `gap-6` ou `gap-3` selon contexte
- Borders: `border-gray-200` pour séparations

## 🔗 Dépendances Entre Fichiers

```
SupplierDetail.tsx
├─ Imports:
│  ├─ PurchaseOrderForm.tsx ✅
│  ├─ PurchaseOrdersList.tsx ✅ (NOUVELLEMENT CONNECTÉ)
│  └─ purchaseOrdersAPI ✅
└─ States:
   ├─ showPurchaseForm ✅
   └─ showOrdersList ✅ (NOUVELLEMENT CONNECTÉ)

PurchaseOrdersList.tsx
├─ Imports:
│  ├─ purchaseOrdersAPI ✅
│  └─ lucide-react icons ✅
└─ API Call:
   └─ getBySupplier(supplierId) ✅

purchase_orders.js (Route Backend)
├─ GET /supplier/:supplier_id ✅
└─ POST / (création) ✅
```

## ⚙️ Configuration API

### Endpoint GET - Historique
```
Method: GET
URL: http://localhost:3001/api/purchase-orders/supplier/{supplierId}
Headers: Authorization: Bearer {token}
Response: 
{
  success: boolean,
  data: [
    {
      id: string,
      order_number: string,
      status: string,
      order_date: string,
      expected_delivery_date: string,
      total_amount: number,
      ...
    }
  ]
}
```

## 🧪 Test Manual

### Étapes pour Tester
1. Naviguer vers **Fournisseurs** → sélectionner un fournisseur
2. Cliquer bouton **"Voir Historique"** en bas du modal
3. Modal **Historique des Commandes** doit s'ouvrir
4. Table affiche les commandes du fournisseur avec:
   - Dates formatées
   - Montants en XOF
   - Statuts avec couleurs
   - Total général en bas
5. Bouton **X** en haut-right ferme le modal
6. Revenir à détail fournisseur

### Cas Limites
- **Aucune commande**: Message "Aucune commande trouvée"
- **Erreur API**: Affichage message d'erreur rouge
- **Chargement**: Message "Chargement des commandes..." avec spinner

## 📋 Fonctionnalités Futures

### À Implémenter
1. **Téléchargement PDF**
   - Route: `GET /api/purchase-orders/:id/pdf`
   - Utiliser package: `pdfkit`
   - Format: Facture style français (SIRET, TVA, etc.)

2. **Détail Commande**
   - Composant: `PurchaseOrderDetail.tsx`
   - Affiche: Items détaillés, notes, client info
   - Actions: Modifier statut, ajouter notes

3. **Modification de Commande**
   - Avant statut "sent"
   - Édit items, dates, notes
   - Route PUT: `UPDATE purchase_orders SET ... WHERE id = ?`

4. **Suppression/Annulation**
   - Status → "cancelled" plutôt que DELETE
   - Traçabilité complète des commandes

## ✨ Maintenant Disponible

✅ **Historique complet des commandes par fournisseur avec:**
- Interface modale intégrée dans le détail fournisseur
- Tableau professionnel avec formatage français
- Chargement asynchrone depuis API
- Gestion d'erreurs et états de chargement
- Design cohérent avec le reste de l'application
- Filtrage automatique par utilisateur connecté

**Le système est prêt pour production** et peut être étendu avec les fonctionnalités futures listées ci-dessus.
