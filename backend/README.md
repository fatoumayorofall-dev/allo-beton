# Allo Béton - Backend MySQL

Backend Node.js/Express avec base de données MySQL pour l'application Allo Béton.

## 🚀 Installation et Configuration

### Prérequis

- Node.js 16+ 
- MySQL 8.0+
- npm ou yarn

### 1. Installation des dépendances

```bash
cd backend
npm install
```

### 2. Configuration de la base de données

1. Démarrez MySQL sur votre machine
2. Créez une base de données (optionnel, sera créée automatiquement):
```sql
CREATE DATABASE allo_beton CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configuration des variables d'environnement

Copiez le fichier `.env.example` vers `.env` et configurez vos paramètres:

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres MySQL:

```env
# Configuration de la base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_NAME=allo_beton
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql

# Configuration JWT
JWT_SECRET=votre_clé_secrète_très_longue_et_sécurisée
JWT_EXPIRES_IN=7d

# Configuration du serveur
PORT=3001
NODE_ENV=development

# Configuration CORS
FRONTEND_URL=http://localhost:5173
```

### 4. Initialisation de la base de données

Exécutez les migrations pour créer les tables:

```bash
npm run migrate
```

Cette commande va:
- Créer la base de données si elle n'existe pas
- Créer toutes les tables nécessaires
- Créer un utilisateur admin par défaut

**Utilisateur admin créé:**
- Email: `admin@allobeton.sn`
- Mot de passe: `admin123`
- ⚠️ **Changez ce mot de passe après la première connexion!**

### 5. Insertion des données d'exemple (optionnel)

Pour ajouter des données d'exemple:

```bash
npm run seed
```

### 6. Démarrage du serveur

```bash
# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:3001`

## 📚 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil
- `PUT /api/auth/change-password` - Changement mot de passe

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit
- `PUT /api/products/:id` - Modifier un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Clients
- `GET /api/customers` - Liste des clients
- `POST /api/customers` - Créer un client
- `PUT /api/customers/:id` - Modifier un client
- `DELETE /api/customers/:id` - Supprimer un client

### Ventes
- `GET /api/sales` - Liste des ventes
- `POST /api/sales` - Créer une vente
- `PUT /api/sales/:id` - Modifier une vente

### Tableau de bord
- `GET /api/dashboard/stats` - Statistiques

### Santé
- `GET /api/health` - État du serveur et de la base de données

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Incluez le token dans l'en-tête Authorization:

```
Authorization: Bearer votre_token_jwt
```

## 🛡️ Sécurité

- Helmet.js pour les en-têtes de sécurité
- Rate limiting (100 requêtes/15min par IP)
- Validation des données d'entrée
- Hachage des mots de passe avec bcrypt
- CORS configuré

## 🗄️ Structure de la base de données

### Tables principales:
- `users` - Utilisateurs et authentification
- `categories` - Catégories de produits
- `suppliers` - Fournisseurs
- `products` - Produits
- `inventory_items` - Gestion des stocks
- `customers` - Clients
- `sales` - Ventes
- `sale_items` - Articles de vente
- `payments` - Paiements
- `notifications` - Notifications

## 🔧 Scripts disponibles

```bash
npm start          # Démarrer le serveur
npm run dev        # Mode développement avec nodemon
npm run migrate    # Exécuter les migrations
npm run seed       # Insérer les données d'exemple
```

## 🐛 Dépannage

### Erreur de connexion MySQL
1. Vérifiez que MySQL est démarré
2. Vérifiez les paramètres dans `.env`
3. Vérifiez que l'utilisateur MySQL a les bonnes permissions

### Port déjà utilisé
Changez le port dans `.env`:
```env
PORT=3002
```

### Erreur JWT
Vérifiez que `JWT_SECRET` est défini dans `.env`

## 📝 Logs

Les logs du serveur incluent:
- Requêtes HTTP avec timestamp
- Erreurs de base de données
- Erreurs d'authentification
- État de santé du serveur

## 🚀 Déploiement

Pour le déploiement en production:

1. Configurez les variables d'environnement de production
2. Utilisez un gestionnaire de processus comme PM2
3. Configurez un proxy inverse (nginx)
4. Activez HTTPS
5. Configurez les sauvegardes de base de données

```bash
# Exemple avec PM2
npm install -g pm2
pm2 start server.js --name "allo-beton-api"
```