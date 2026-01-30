const mysql = require('mysql2/promise');

async function checkUsersTable() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Touf@2000',
    database: 'allo_beton'
  });

  try {
    const [result] = await pool.execute('DESCRIBE users');
    console.log('Colonnes de la table users:');
    result.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();
