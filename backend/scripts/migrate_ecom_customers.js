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
    const existing = rows.map(r => r.Field);
    console.log('Colonnes existantes:', existing.join(', '));

    for (const col of columns) {
      if (existing.includes(col.name)) {
        console.log(`✅ ${col.name} — déjà présente`);
      } else {
        await pool.query(`ALTER TABLE ecom_customers ADD COLUMN ${col.name} ${col.def}`);
        console.log(`✅ ${col.name} — ajoutée`);
      }
    }
    console.log('\n✅ Migration terminée');
  } catch (e) {
    console.error('❌ Erreur migration:', e.message);
    process.exit(1);
  } finally {
    pool.end();
  }
})();
