const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'allo_beton',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Créer le pool de connexions
const pool = mysql.createPool(dbConfig);

// Fonction pour tester la connexion
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connexion MySQL établie avec succès');
    console.log(`📊 Base de données: ${process.env.DB_NAME}`);
    console.log(`🏠 Serveur: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
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
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    
    const tempConnection = await mysql.createConnection(tempConfig);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();
    
    console.log(`✅ Base de données '${process.env.DB_NAME}' créée ou vérifiée`);
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