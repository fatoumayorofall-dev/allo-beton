const mysql = require('mysql2/promise');

async function checkPaymentUsers() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Touf@2000',
      database: 'allo_beton'
    });

    console.log('Vérification des utilisateurs des paiements...\n');
    
    // Vérifier les user_id dans les paiements
    const [payments] = await connection.execute(`
      SELECT DISTINCT user_id, COUNT(*) as count 
      FROM payments 
      GROUP BY user_id
    `);

    console.log('🔍 User_id dans les paiements:');
    payments.forEach(p => {
      console.log(`  - ${p.user_id}: ${p.count} paiement(s)`);
    });

    // Vérifier les utilisateurs existants
    const [users] = await connection.execute(`
      SELECT id, email, role FROM users LIMIT 5
    `);

    console.log('\n👥 Utilisateurs existants:');
    users.forEach(u => {
      console.log(`  - ${u.id}: ${u.email} (${u.role})`);
    });

    await connection.end();
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

checkPaymentUsers();
