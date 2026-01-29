# 🚚 Amélioration de la gestion des ventes - Transport & Logistique

## ✅ Résumé des implémentations

### 1. **Colonnes Transport en Base de Données**
Ajoutées à la table `sales`:
- `vehicle_plate` (VARCHAR 50) - Matricule du véhicule
- `driver_name` (VARCHAR 255) - Nom du chauffeur
- `product_type` (VARCHAR 100) - Type de produit
- `loading_location` (VARCHAR 255) - Lieu de chargement
- `destination` (VARCHAR 255) - Destination de livraison
- `discharge_time` (TIMESTAMP) - Heure de déchargement
- `weight_loaded` (DECIMAL 12,3) - Poids chargé

### 2. **Validation Backend avec Joi**
- Validation stricte des données de vente (POST/PUT)
- Validation des imports CSV
- Middleware de validation intégré
- Messages d'erreur détaillés par champ

**Fichier**: `backend/middleware/validation.js`

### 3. **API REST Améliorée**

#### GET /api/sales
- Pagination: `?page=1&pageSize=25`
- Filtrage: `?status=draft&customerId=xxx&search=VTE`
- Récupération groupée des articles (pas de N+1 queries)
- Réponse: `{ sales, pagination: { page, pageSize, total } }`

#### POST /api/sales
- Crée une vente avec tous les champs transport
- Calcul automatique des totaux (TVA 18%)
- Transaction garantie

#### PUT /api/sales/:id
- Mise à jour des champs transport autorisés
- Statut de vente (draft, confirmed, shipped, delivered, cancelled)
- Statut de paiement (pending, partial, paid, overdue)

#### POST /api/sales/import/preview
- Upload fichier CSV/TSV
- Retour: en-têtes détectées + aperçu des 10 premières lignes

#### POST /api/sales/import
- Import en masse avec mapping personnalisé
- Crée les ventes en transaction

### 4. **Frontend - Formulaire enrichi**

**SaleForm.tsx** inclut:
- Champs client et articles (existants)
- **Nouvelle section Transport:**
  - Matricule véhicule
  - Nom chauffeur
  - Type produit
  - Lieu chargement
  - Destination
  - Heure déchargement
  - Poids chargement

### 5. **Import CSV avec Auto-détection**

**ImportSales.tsx** inclut:
- Upload de fichier CSV/TSV
- **Auto-détection intelligente des colonnes:**
  - `N°FACTURE`, `NUMERO`, `SALE` → `sale_number`
  - `DATE` → date de vente
  - `HEURE` → heure
  - `MATRICULE`, `VEHICLE` → matricule
  - `CHAUFFEUR`, `DRIVER` → nom chauffeur
  - `PRODUIT`, `TYPE` → type produit
  - `LIEU`, `CHARGEMENT` → lieu chargement
  - `DESTINATION` → destination
  - `POIDS`, `WEIGHT` → poids
- Aperçu avant import
- Import transactionnel

### 6. **Tests Unitaires**

**Fichier**: `backend/tests/sales.test.js`

Couvre:
- Création de vente avec champs transport
- Validation des données
- Récupération avec pagination/filtres
- Mise à jour des ventes
- Import CSV avec prévisualisation
- Import en masse

Lancer: `npm run test`

## 🚀 Démarrage rapide

### Backend
```bash
cd backend
npm install                    # Si dépendances manquantes
node scripts/migrate.js        # Créer/migrer la BD
node server.js                 # Démarrer le serveur (port 3001 ou 30011)
```

### Frontend
```bash
npm install                    # Si dépendances manquantes
npm run dev                    # Démarrer Vite (port 5173 ou 5174)
```

### Migration de la BD
Le script `backend/scripts/migrate.js` :
- Crée les tables si absentes
- Ajoute les colonnes transport (ignorant les doublons)
- Crée un utilisateur admin par défaut

## 📊 Exemple d'utilisation

### 1. Créer une vente avec transport
```javascript
POST /api/sales
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    { "productId": "...", "quantity": 10, "price": 50000 }
  ],
  "deliveryDate": "2026-01-30T14:30:00Z",
  "vehiclePlate": "SN-123-ABC",
  "driverName": "Moussa Diop",
  "productType": "ARGILE (SF180)",
  "loadingLocation": "SARAYA",
  "destination": "USINE SINDIA",
  "dischargeTime": "2026-01-30T17:00:00Z",
  "weightLoaded": 52.47
}
```

### 2. Importer un CSV
```javascript
POST /api/sales/import/preview
Content-Type: multipart/form-data
File: transport.csv

// Réponse
{
  "success": true,
  "data": {
    "headers": ["N°FACTURE", "DATE", "MATRICULE", ...],
    "rows": [...]
  }
}
```

```javascript
POST /api/sales/import
{
  "rows": [...],
  "mapping": {
    "saleNumberHeader": "N°FACTURE",
    "dateHeader": "DATE",
    "vehiclePlateHeader": "MATRICULE",
    "driverNameHeader": "NOM CHAUFFEUR",
    "destinationHeader": "DESTINATION",
    "weightHeader": "POIDS"
  }
}
```

### 3. Récupérer avec filtres
```javascript
GET /api/sales?status=draft&page=1&pageSize=25
GET /api/sales?search=VTE-
GET /api/sales?customerId=xxx
```

## 🛠 Configuration

### Variables d'environnement backend
`.env` (déjà configuré):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Touf@2000
DB_NAME=allo_beton
JWT_SECRET=votre-secret-jwt
PORT=3001
```

### Variables d'environnement frontend
`.env.local` (optionnel):
```
VITE_API_URL=http://localhost:30011/api
```

## 📝 Notes techniques

### Performance
- Requête GET /api/sales: ~O(n) avec pagination, pas de N+1
- Import CSV: Transaction unique pour cohérence
- Indices MySQL sur: user_id, created_at, sale_number, status

### Sécurité
- Validation Joi sur tous les inputs
- Middleware d'authentification JWT
- Contrôle d'accès par rôle (admin/manager/seller)
- Sanitisation des données

### Extensibilité
- Facile d'ajouter d'autres colonnes (suivre le pattern)
- Import CSV générique (mapping flexible)
- Tests intégrés pour régression

## 🐛 Dépannage

### Erreur "Port déjà en use"
Le serveur essaie d'autres ports (30011, 5174, etc.)

### Erreur migrations
Si les colonnes existent déjà, le script les ignore gracieusement

### Erreur API 401
Token JWT expiré ou invalide. Se reconnecter.

### Erreur validation
Vérifier les details dans la réponse API (field + message)

## ✨ Prochaines améliorations possibles

- [ ] Export ventes en PDF avec détails transport
- [ ] Suivi GPS du véhicule
- [ ] Notifications en temps réel (Socket.io)
- [ ] Historique des changements de statut
- [ ] Intégration paiement (Stripe, Wave, etc)
- [ ] Rapport logistique avec statistiques
- [ ] Réconciliation poids/quantité
