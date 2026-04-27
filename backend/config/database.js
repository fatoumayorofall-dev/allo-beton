const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Railway: utiliser MYSQL_URL ou MYSQL_PUBLIC_URL si disponible
const mysqlUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;
const dbHost = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
const dbName = process.env.MYSQLDATABASE || process.env.DB_NAME || 'allo_beton';

let pool;

if (mysqlUrl && !mysqlUrl.includes('railway.internal')) {
  // Connexion via URL publique (Railway TCP proxy)
  console.log('🔗 Connexion MySQL via URL publique');
  pool = mysql.createPool({
    uri: mysqlUrl,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4',
    connectTimeout: 30000
  });
} else {
  // Connexion locale ou réseau privé
  console.log('🔗 Connexion MySQL via host/port');
  pool = mysql.createPool({
    host:     dbHost,
    port:     parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    user:     process.env.MYSQLUSER     || process.env.DB_USER     || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });
}

// Fonction pour tester la connexion
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion MySQL établie avec succès');
    console.log(`📊 Base de données: ${dbName}`);
    console.log(`🏠 Serveur: ${mysqlUrl ? '(URL)' : dbHost + ':' + (process.env.MYSQLPORT || process.env.DB_PORT || 3306)}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion MySQL:', error.message);
    return false;
  }
}

// Fonction pour créer la base de données si elle n'existe pas
async function createDatabaseIfNotExists() {
  try {
    if (mysqlUrl) {
      // Railway gère la base automatiquement, on skip la création
      console.log(`✅ Base de données '${dbName}' (gérée par Railway)`);
      return;
    }
    const tempConnection = await mysql.createConnection({
      host: dbHost,
      port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || ''
    });
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();
    
    console.log(`✅ Base de données '${dbName}' créée ou vérifiée`);
  } catch (error) {
    console.error('❌ Erreur création base de données:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection,
  createDatabaseIfNotExists
};