/**
 * Changements de nom de la boutique (Fabima → EFA → Maefa) : les données déjà gardées dans le navigateur
 * (panier, favoris, commandes, compte, réglages) passent sous le nom actuel, une seule fois.
 * Les références des pièces suivent : « FAB-109 » ou « EFA-109 » deviennent « MAE-109 ».
 * Importé en tout premier par main.tsx, avant que le site ne lise quoi que ce soit.
 */
const OLD_PREFIXES = ['fabima', 'efa'];
const CURRENT = 'maefa';
const renameRefs = (v: string) => v.replace(/"(?:FAB|EFA)-([A-Z0-9]+)/g, '"MAE-$1');

function migrate(store: Storage) {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k) keys.push(k);
  }
  for (const k of keys) {
    const prefix = OLD_PREFIXES.find(p => k.startsWith(p + '_'));
    if (!prefix) continue;
    const next = CURRENT + k.slice(prefix.length);
    if (store.getItem(next) === null) store.setItem(next, renameRefs(store.getItem(k) ?? ''));
    store.removeItem(k);
  }
}

try { migrate(localStorage); migrate(sessionStorage); } catch { /* stockage indisponible : rien à reprendre */ }
