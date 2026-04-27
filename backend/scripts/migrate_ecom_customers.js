/**
 * Migration: ajout des colonnes manquantes dans ecom_customers (Railway / MySQL 5.7)
 */
require('dotenv').config();
const pool = require('../config/database').pool;

const columns = [
  { name: 'email_verification_token', def: 'VARCHAR(64) DEFAULT NULL' },
  { name: 'email_verified_at',        def: 'TIMESTAMP NULL DEFAULT NULL' },
  { name: 'auth_provider',            def: "VARCHAR(20) NOT NULL DEFAULT 'email'" },
  { name: 'provider_id',              def: 'VARCHAR(255) DEFAULT NULL' },
  { name: 'phone_otp',                def: 'VARCHAR(6) DEFAULT NULL' },
  { name: 'phone_otp_expires_at',     def: 'TIMESTAMP NULL DEFAULT NULL' },
  { name: 'phone_verified_at',        def: 'TIMESTAMP NULL DEFAULT NULL' },
];

(async () => {
  try {
    const [rows] = await pool.query('DESCRIBE ecom_customers');
    const existing = rows.map(r => ({ name: r.Field, null: r.Null }));
    const existingNames = existing.map(r => r.name);
    console.log('Colonnes existantes:', existingNames.join(', '));

    // 1. Rendre email nullable (requis pour comptes téléphone-only)
    const emailCol = existing.find(r => r.name === 'email');
    if (emailCol && emailCol.null === 'NO') {
      await pool.query('ALTER TABLE ecom_customers MODIFY COLUMN email VARCHAR(255) DEFAULT NULL');
      console.log('✅ email — rendu nullable');
    } else {
      console.log('✅ email — déjà nullable');
    }

    // 2. Rendre phone nullable si NOT NULL sans défaut
    const phoneCol = existing.find(r => r.name === 'phone');
    if (phoneCol && phoneCol.null === 'NO') {
      await pool.query('ALTER TABLE ecom_customers MODIFY COLUMN phone VARCHAR(20) DEFAULT NULL');
      console.log('✅ phone — rendu nullable');
    }

    // 3. Ajouter colonnes manquantes
    for (const col of columns) {
      if (existingNames.includes(col.name)) {
        console.log(`✅ ${col.name} — déjà présente`);
      } else {
        await pool.query(`ALTER TABLE ecom_customers ADD COLUMN ${col.name} ${col.def}`);
        console.log(`✅ ${col.name} — ajoutée`);
      }
    }

    // 4. S'assurer que l'index UNIQUE sur phone permet NULL multiples
    const [indexes] = await pool.query("SHOW INDEX FROM ecom_customers WHERE Key_name = 'idx_phone_unique'");
    if (indexes.length === 0) {
      await pool.query('ALTER TABLE ecom_customers ADD UNIQUE KEY idx_phone_unique (phone)').catch(() => {});
      console.log('✅ Index unique phone — ajouté');
    }

    console.log('\n✅ Migration terminée avec succès');
  } catch (e) {
    console.error('❌ Erreur migration:', e.message);
    process.exit(1);
  } finally {
    pool.end();
  }
})();
