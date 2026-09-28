/**
 * Changement de nom de la boutique (Fabima → EFA) : les données déjà gardées dans le navigateur
 * (panier, favoris, commandes, compte, réglages) passent sous les nouveaux noms, une seule fois.
 * Importé en tout premier par main.tsx, avant que le site ne lise quoi que ce soit.
 */
function migrate(store: Storage) {
  const old: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && k.startsWith('fabima')) old.push(k);
  }
  for (const k of old) {
    const next = 'efa' + k.slice('fabima'.length);
    // les références des pièces changent aussi : « FAB-109 » devient « EFA-109 »
    if (store.getItem(next) === null) store.setItem(next, (store.getItem(k) ?? '').replace(/"FAB-([A-Z0-9]+)/g, '"EFA-$1'));
    store.removeItem(k);
  }
}

try { migrate(localStorage); migrate(sessionStorage); } catch { /* stockage indisponible : rien à reprendre */ }
