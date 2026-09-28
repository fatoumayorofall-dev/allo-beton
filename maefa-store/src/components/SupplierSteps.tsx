import React from 'react';
import { Globe2 } from 'lucide-react';
import type { OrderSupplier, SupplierStatus } from '../data/types';

export const SUPPLIER_LABELS: Record<SupplierStatus, string> = {
  a_commander: 'Commande reçue',
  commandee: 'Commandée chez notre partenaire',
  expediee: 'En route vers Dakar',
  arrivee: 'Arrivée à Dakar',
};
const ORDER: SupplierStatus[] = ['a_commander', 'commandee', 'expediee', 'arrivee'];

/** Étapes d'un article du Marché, du fournisseur jusqu'à Dakar (la livraison locale suit ensuite). */
export const SupplierSteps: React.FC<{ supplier: OrderSupplier }> = ({ supplier }) => {
  const reached = ORDER.indexOf(supplier.status);
  const dateOf = (s: SupplierStatus) => supplier.history?.find(h => h.status === s)?.date;
  return (
    <div className="p-6 sm:p-8 rounded-[2rem] bg-white border border-ink/[0.06]" data-testid="supplier-steps">
      <p className="eyebrow inline-flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Le Marché · chez notre partenaire</p>
      <ol className="mt-5 grid sm:grid-cols-4 gap-3">
        {ORDER.map((s, i) => {
          const done = i <= reached;
          const date = dateOf(s);
          return (
            <li key={s} className={`relative p-4 rounded-2xl ${i === reached ? 'bg-blush/50' : done ? 'bg-ivory' : 'bg-ivory/50 text-ink/70'}`}>
              <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold ${done ? 'bg-wine text-white' : 'bg-white border border-ink/10'}`}>{done ? '✓' : i + 1}</span>
              <p className="text-sm font-semibold mt-2 leading-snug">{SUPPLIER_LABELS[s]}</p>
              {date && <p className="text-[11px] text-ink/70 mt-0.5">{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>}
            </li>
          );
        })}
      </ol>
      {supplier.tracking && (
        <p className="mt-4 text-sm">Numéro de suivi : <strong>{supplier.tracking}</strong>
          {supplier.trackingUrl && <> · <a href={supplier.trackingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 text-wine">suivre le colis</a></>}</p>
      )}
    </div>
  );
};
