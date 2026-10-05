// Lance le pipeline de données sur DATA_DIR et affiche le rapport : npm run data:pipeline
// (DATA_DIR=dossier des données ; par défaut server/data).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from '../../server/analytics/pipeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.resolve(here, '../../server/data');
const report = await runPipeline(dataDir);
const { _model: model, ...r } = report;
console.log(
  `Pipeline : ${r.fichiers} fichier(s), ${r.volume.lignes.toLocaleString('fr-FR')} lignes en ${r.dureeMs} ms`,
);
console.log('Nettoyage :', r.volume);
console.log('Entonnoir :', r.entonnoir);
console.log('Pièces les plus vues :', r.topProduits.slice(0, 5));
console.log(`Modèle : ${r.modele.pieces} pièces, ${r.modele.visiteuses.toLocaleString('fr-FR')} visiteuses`);
console.log(
  `Évaluation (dernière pièce cachée, @${r.evaluation.k}) : réussite ${r.evaluation.hitRate} contre ${r.evaluation.baselineHitRate} pour la référence « plus populaires » (${r.evaluation.users} parcours)`,
);
const sample = Object.entries(model.similar).slice(0, 2);
for (const [id, list] of sample)
  console.log(
    `  ${id} → ${list
      .slice(0, 3)
      .map(x => `${x.id} (${x.score})`)
      .join(', ')}`,
  );
