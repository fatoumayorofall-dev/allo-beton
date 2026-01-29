const { pool } = require('../config/database');

async function addProductNameColumn() {
  try {
    console.log('🔧 Ajout de la colonne product_name à purchase_order_items...');
    
    // Vérifier si la colonne existe déjà
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'product_name'`
    );

    if (columns.length > 0) {
      console.log('✅ La colonne product_name existe déjà');
      process.exit(0);
    }

    // Ajouter la colonne
    await pool.execute(
      `ALTER TABLE purchase_order_items ADD COLUMN product_name VARCHAR(255) AFTER purchase_order_id`
    );

    console.log('✅ Colonne product_name ajoutée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', error.message);
    process.exit(1);
  }
}

addProductNameColumn();
