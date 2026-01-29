const mysql = require('mysql2/promise');

async function checkPaymentTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Touf@2000',
      database: 'allo_beton'
    });

    console.log('Vérification de la structure de la table payments...');
    
    // Obtenir les colonnes
    const [columns] = await connection.execute(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='payments' AND TABLE_SCHEMA='allo_beton' ORDER BY ORDINAL_POSITION"
    );

    console.log('\nColonnes:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // Vérifier une vente et ses paiements
    console.log('\nVérification des données...');
    const [sales] = await connection.execute(
      'SELECT id, sale_number, payment_status FROM sales LIMIT 3'
    );
    
    console.log('\nVentes:');
    for (const sale of sales) {
      console.log(`  - ${sale.sale_number}: payment_status = ${sale.payment_status}`);
      
      const [payments] = await connection.execute(
        'SELECT id, amount, status FROM payments WHERE sale_id = ?',
        [sale.id]
      );
      
      if (payments.length > 0) {
        console.log(`    Paiements: ${payments.length}`);
        payments.forEach(p => {
          console.log(`      - ${p.amount} (status: ${p.status})`);
        });
      } else {
        console.log('    Pas de paiements');
      }
    }

    await connection.end();
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  }
}

checkPaymentTable();
