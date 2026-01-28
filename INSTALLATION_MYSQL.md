# Installation Allo Béton avec MySQL

Ce guide vous explique comment installer et configurer Allo Béton avec une base de données MySQL locale.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé:

- **Node.js 16+** - [Télécharger ici](https://nodejs.org/)
- **MySQL 8.0+** - [Télécharger ici](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Télécharger ici](https://git-scm.com/)

## 🗄️ 1. Installation et configuration de MySQL

### Sur Windows:
1. Téléchargez MySQL Installer depuis le site officiel
2. Installez MySQL Server avec les paramètres par défaut
3. Notez le mot de passe root que vous définissez
4. Démarrez le service MySQL

### Sur macOS:
```bash
# Avec Homebrew
brew install mysql
brew services start mysql

# Sécuriser l'installation
mysql_secure_installation
```

### Sur Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

### Vérification de l'installation:
```bash
mysql --version
mysql -u root -p
```

## 🚀 2. Installation du Backend

### Étape 1: Naviguer vers le dossier backend
```bash
cd backend
```

### Étape 2: Installer les dépendances
```bash
npm install
```

### Étape 3: Configuration de l'environnement
```bash
# Copier le fichier d'exemple
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

# Configuration JWT (générez une clé secrète forte)
JWT_SECRET=votre_clé_secrète_très_longue_et_sécurisée_ici_au_moins_32_caractères
JWT_EXPIRES_IN=7d

# Configuration du serveur
PORT=3001
NODE_ENV=development

# Configuration CORS
FRONTEND_URL=http://localhost:5173
```

### Étape 4: Initialiser la base de données
```bash
# Créer les tables et l'utilisateur admin
npm run migrate

# (Optionnel) Ajouter des données d'exemple
npm run seed
```

### Étape 5: Démarrer le serveur backend
```bash
# Mode développement avec rechargement automatique
npm run dev

# Ou mode production
npm start
```

Le backend sera accessible sur `http://localhost:3001`

## 🎨 3. Configuration du Frontend

### Étape 1: Retourner au dossier racine
```bash
cd ..
```

### Étape 2: Installer les dépendances
```bash
npm install
```

### Étape 3: Vérifier la configuration
Le fichier `.env` devrait déjà contenir:
```env
VITE_API_URL=http://localhost:3001/api
```

### Étape 4: Démarrer le frontend
```bash
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 🔐 4. Première connexion

Une fois les deux serveurs démarrés:

1. Ouvrez votre navigateur sur `http://localhost:5173`
2. Connectez-vous avec les identifiants par défaut:
   - **Email**: `admin@allobeton.sn`
   - **Mot de passe**: `admin123`

⚠️ **Important**: Changez ce mot de passe après la première connexion!

## ✅ 5. Vérification de l'installation

### Vérifier le backend:
```bash
curl http://localhost:3001/api/health
```

Vous devriez voir:
```json
{
  "success": true,
  "status": "OK",
  "database": "Connected",
  "version": "1.0.0"
}
```

### Vérifier le frontend:
- Ouvrez `http://localhost:5173`
- Vous devriez voir la page de connexion d'Allo Béton

## 🛠️ 6. Scripts utiles

### Backend:
```bash
cd backend

# Démarrer en mode développement
npm run dev

# Réinitialiser la base de données
npm run migrate

# Ajouter des données d'exemple
npm run seed

# Démarrer en mode production
npm start
```

### Frontend:
```bash
# Démarrer en mode développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la version de production
npm run preview
```

## 🐛 7. Dépannage

### Erreur de connexion MySQL:
```bash
# Vérifier que MySQL fonctionne
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS
net start mysql  # Windows

# Se connecter à MySQL pour tester
mysql -u root -p
```

### Port déjà utilisé:
```bash
# Trouver le processus utilisant le port
lsof -i :3001  # Backend
lsof -i :5173  # Frontend

# Tuer le processus
kill -9 PID
```

### Problème de permissions MySQL:
```sql
-- Se connecter en tant que root
mysql -u root -p

-- Créer un utilisateur dédié (optionnel)
CREATE USER 'allobeton'@'localhost' IDENTIFIED BY 'motdepasse_securise';
GRANT ALL PRIVILEGES ON allo_beton.* TO 'allobeton'@'localhost';
FLUSH PRIVILEGES;
```

### Réinitialiser complètement:
```bash
# Supprimer la base de données
mysql -u root -p -e "DROP DATABASE IF EXISTS allo_beton;"

# Relancer les migrations
cd backend
npm run migrate
npm run seed
```

## 📁 8. Structure des dossiers

```
allo-beton-mysql/
├── backend/                 # API Node.js/Express
│   ├── config/             # Configuration DB
│   ├── middleware/         # Middleware Express
│   ├── routes/             # Routes API
│   ├── scripts/            # Scripts de migration
│   ├── .env                # Variables d'environnement
│   └── server.js           # Point d'entrée
├── src/                    # Application React
│   ├── components/         # Composants React
│   ├── services/           # Services API
│   └── ...
├── .env                    # Configuration frontend
└── INSTALLATION_MYSQL.md   # Ce fichier
```

## 🚀 9. Fonctionnalités incluses

- ✅ **Authentification JWT** complète avec rôles
- ✅ **Gestion des produits** avec inventaire automatique
- ✅ **Gestion des clients** avec historique d'achats
- ✅ **Gestion des fournisseurs** avec suivi des commandes
- ✅ **Système de ventes** complet avec articles
- ✅ **Gestion des paiements** avec statuts automatiques
- ✅ **Tableau de bord** avec statistiques en temps réel
- ✅ **Système de catégories** pour organiser les produits
- ✅ **Notifications** pour les stocks faibles
- ✅ **API REST** sécurisée et documentée
- ✅ **Base de données MySQL** optimisée avec index

## 🔒 10. Sécurité

- Mots de passe hachés avec bcrypt (12 rounds)
- Authentification JWT avec expiration
- Protection CORS configurée
- Rate limiting (100 requêtes/15min)
- Validation des données d'entrée
- Protection contre l'injection SQL
- Soft delete pour préserver l'intégrité des données

## 🎯 11. Prochaines étapes

Une fois l'installation terminée:

1. **Changez le mot de passe admin**
2. **Créez vos catégories de produits**
3. **Ajoutez vos fournisseurs**
4. **Créez vos produits avec stock**
5. **Ajoutez vos clients**
6. **Commencez à créer des ventes!**

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs du backend: `cd backend && npm run dev`
2. Vérifiez la console du navigateur (F12)
3. Consultez la documentation MySQL
4. Vérifiez que tous les ports sont disponibles
5. Assurez-vous que MySQL est démarré

---

🎉 **Félicitations!** Votre installation d'Allo Béton avec MySQL est maintenant prête à l'emploi!

**Connexion par défaut:**
- URL: http://localhost:5173
- Email: admin@allobeton.sn
- Mot de passe: admin123

**API Backend:**
- URL: http://localhost:3001
- Documentation: http://localhost:3001
- Santé: http://localhost:3001/api/health