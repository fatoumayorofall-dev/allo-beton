import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  adminForgiveBuyer,
  adminLedger,
  adminSecurity,
  adminUnlockOrder,
  type LedgerEntry,
  type Security,
} from '../marketplace/api';
import { F, ago } from '../marketplace/format';

/** Libellés des lignes du registre (mouvements d'argent et décisions) */
const LEDGER_LABELS: Record<string, string> = {
  livraison: 'Livraison encaissée par le livreur',
  vente_livree: 'Vente livrée par le vendeur',
  envoi_vendeur: 'Part envoyée au vendeur',
  vendeur_paye: 'Vendeur : argent reçu',
  vendeur_non_paye: 'Vendeur : argent pas reçu',
  versement_livreur: 'Commissions versées par un livreur',
  reglement_vendeur: 'Commissions réglées par un vendeur',
  abonnement: 'Abonnement Pro payé',
  livraison_ratee: 'Livraison ratée',
  colis_rendu: 'Colis rendu au vendeur',
  acheteur_debloque: 'Acheteur débloqué',
};
const REASONS = { absent: 'absent', refus: 'refus' } as const;

/**
 * Sécurité de la place de marché : registre infalsifiable, acheteurs bloqués (livraisons ratées),
 * vendeurs pas payés par le livreur, argent gardé par les livreurs, colis bloqués (codes faux).
 */
export const SecurityPanel: React.FC<{ pin: string; onMessage: (m: string) => void }> = ({ pin, onMessage }) => {
  const [data, setData] = useState<Security | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const load = useCallback(async () => {
    const [s, l] = await Promise.all([adminSecurity(pin), adminLedger(pin)]);
    if (s.ok) setData(s.data);
    if (l.ok) setEntries(l.data.entries);
  }, [pin]);
  useEffect(() => {
    load();
  }, [load]);
  if (!data) return <Loader2 className="w-6 h-6 animate-spin text-ink/40" />;
  const { ledger } = data;

  return (
    <div className="space-y-4" data-testid="admin-mp-security">
      <section
        className={`rounded-2xl p-4 flex gap-3 ${ledger.ok ? 'bg-emerald-50 text-emerald-950' : 'bg-red-50 text-red-950'}`}
        data-testid="admin-mp-ledger"
      >
        {ledger.ok ? <ShieldCheck className="w-6 h-6 shrink-0" /> : <ShieldAlert className="w-6 h-6 shrink-0" />}
        <div className="text-sm">
          <p className="font-semibold">
            {ledger.ok
              ? `Registre intact : ${ledger.count} opération(s), aucune modification`
              : `Alerte : la ligne ${ledger.brokenAt} du registre a été modifiée ou supprimée`}
          </p>
          <p className="mt-1">
            Chaque mouvement d'argent est scellé avec le précédent : personne ne peut changer un montant sans que ça se
            voie, même en entrant dans la base de données.
          </p>
          {ledger.head && (
            <p className="mt-1 text-xs break-all">
              Empreinte du jour (notez-la de temps en temps) : <code>{ledger.head.slice(0, 16)}</code>
            </p>
          )}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <h3 className="font-semibold">Acheteurs avec des livraisons ratées</h3>
        <p className="text-xs text-ink/65">
          Absent ou refus du colis. À 2, l'acheteur ne peut plus commander : débloquez-le après explication (ou paiement
          de la course perdue).
        </p>
        {!data.buyers.length && <p className="text-sm text-ink/70 mt-2">Aucun.</p>}
        {data.buyers.map(b => (
          <div
            key={b.phone}
            className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm"
            data-testid="admin-mp-buyer-strikes"
          >
            <span>
              <strong>{b.name}</strong> · {b.phone} · {b.strikes} ratée(s) (
              {b.failures.map(f => `${f.orderId} ${REASONS[f.reason]}`).join(', ')})
              {b.blocked && <span className="ml-1 text-wine font-semibold">· bloqué</span>}
            </span>
            <button
              onClick={async () => {
                const r = await adminForgiveBuyer(pin, b.phone);
                onMessage(r.ok ? `${b.name} peut de nouveau commander` : r.error);
                load();
              }}
              className="h-9 px-4 rounded-full border border-ink/15 font-semibold"
              data-testid="admin-mp-forgive"
            >
              Débloquer
            </button>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <h3 className="font-semibold">Argent gardé par les livreurs</h3>
        <p className="text-xs text-ink/65">
          Commissions dues + parts des vendeurs pas encore reçues. Au plafond, le livreur ne reçoit plus de course.
        </p>
        {!data.drivers.length && <p className="text-sm text-ink/70 mt-2">Aucun.</p>}
        {data.drivers.map(d => (
          <p key={d.id} className="mt-2 text-sm">
            <strong>{d.name}</strong> · {d.phone} · garde {F(d.held)} sur {F(d.cap)}
            {d.blocked && <span className="ml-1 text-wine font-semibold">· bloqué</span>}
          </p>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <h3 className="font-semibold">Vendeurs qui n'ont pas reçu leur argent</h3>
        {!data.unpaidSellers.length && <p className="text-sm text-ink/70 mt-2">Aucun.</p>}
        {data.unpaidSellers.map(u => (
          <p key={u.orderId} className="mt-2 text-sm" data-testid="admin-mp-unpaid">
            <strong>{u.shopName}</strong> · commande {u.orderId} · {F(u.amount)} · livreur {u.driver?.name} (
            {u.driver?.phone}) · {ago(u.at)}
          </p>
        ))}
      </section>

      {data.lockedCodes.length > 0 && (
        <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
          <h3 className="font-semibold">Colis bloqués (5 codes faux)</h3>
          <p className="text-xs text-ink/65">Appelez le livreur et le client avant de débloquer.</p>
          {data.lockedCodes.map(c => (
            <div key={c.orderId} className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span>
                {c.orderId} · {c.shopName}
              </span>
              <button
                onClick={async () => {
                  const r = await adminUnlockOrder(pin, c.orderId);
                  onMessage(r.ok ? 'Colis débloqué' : r.error);
                  load();
                }}
                className="h-9 px-4 rounded-full border border-ink/15 font-semibold"
              >
                Débloquer
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="bg-white rounded-2xl border border-ink/[0.06] p-4">
        <h3 className="font-semibold">Dernières opérations du registre</h3>
        <p className="text-xs text-ink/65">
          {data.newSellers} nouvelle(s) boutique(s) limitée(s) par commande tant qu'elles n'ont pas 3 ventes livrées.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {entries.slice(0, 30).map(e => (
            <li key={e.seq} className="flex flex-wrap gap-x-2">
              <span className="text-ink/50">n° {e.seq}</span>
              <span>{LEDGER_LABELS[e.type] ?? e.type}</span>
              {typeof e.data.orderId === 'string' && <span className="text-ink/60">{e.data.orderId}</span>}
              {['amount', 'collect', 'subtotal'].map(k =>
                typeof e.data[k] === 'number' ? <strong key={k}>{F(e.data[k] as number)}</strong> : null,
              )}
              <span className="text-ink/50">{ago(e.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default SecurityPanel;
