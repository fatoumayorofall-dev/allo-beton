// Avant la construction du site : chaque photo produit doit avoir sa version légère (public/produits/540/).
// Sinon, les vignettes sur téléphone seraient vides. Correction : python3 outils/photo/miniatures.py
import { existsSync, readdirSync } from 'node:fs';
const dir = new URL('../public/produits/', import.meta.url);
const missing = readdirSync(dir).filter(f => f.endsWith('.jpg') && !existsSync(new URL(`540/${f}`, dir)));
if (missing.length) {
  console.error(`Miniatures manquantes (${missing.length}) : ${missing.slice(0, 5).join(', ')}…\nLancez : python3 outils/photo/miniatures.py`);
  process.exit(1);
}
