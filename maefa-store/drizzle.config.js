// Génération des migrations SQL à partir du schéma : npm run db:generate
export default {
  dialect: 'postgresql',
  schema: './server/db/schema.js',
  out: './server/db/migrations',
  dbCredentials: { url: process.env.DATABASE_URL || 'postgres://maefa:maefa@localhost:5432/maefa' },
};
