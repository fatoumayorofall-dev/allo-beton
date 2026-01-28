# Allo Béton - Système de Gestion avec MySQL

## 🚀 Installation Rapide

### Prérequis
- Node.js 16+
- MySQL 8.0+
- Git

### 1. Installation du Backend

```bash
cd backend
npm install
cp .env.example .env
```

Configurez votre `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=allo_beton
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
JWT_SECRET=votre_clé_secrète_très_longue
PORT=3001
FRONTEND_URL=http://localhost:5173
```

Initialisez la base de données:
```bash
npm run migrate
npm run seed  # Optionnel: données d'exemple
npm run dev
```

### 2. Installation du Frontend

```bash
# Dans le dossier racine
npm install
npm run dev
```

### 3. Première Connexion

- URL: http://localhost:5173
- Email: admin@allobeton.sn
- Mot de passe: admin123

⚠️ **Changez ce mot de passe après la première connexion!**

## 📚 Documentation Complète

Consultez `INSTALLATION.md` pour les instructions détaillées.

## 🛠️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + MySQL
- **Authentification**: JWT
- **Base de données**: MySQL 8.0+

## 🔧 Scripts Utiles

### Backend:
```bash
cd backend
npm run dev      # Développement
npm run migrate  # Migrations DB
npm run seed     # Données d'exemple
```

### Frontend:
```bash
npm run dev      # Développement
npm run build    # Production
```

## 📞 Support

Consultez les logs en cas de problème:
- Backend: `cd backend && npm run dev`
- Frontend: Console du navigateur (F12)

---

🎉 **Votre système Allo Béton avec MySQL est prêt!**