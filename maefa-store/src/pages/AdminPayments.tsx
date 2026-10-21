import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { adminPayments, adminPayoutAction, type AdminPayments as Data } from '../marketplace/api';
import { F, PAYMENT_LABELS, ago } from '../marketplace/format';

const KIND: Record<string, string> = { vendeur: 'Vendeuse', livreur: 'Livreur', remboursement: 'Remboursement' };
const STATUS: Record<string, [string, string]> = {
  a_faire: ['En préparation', 'bg-ink/10 text-ink/70'],
  a_verser: ['À verser', 'bg-amber-100 text-amber-900'],
  en_cours: ['En cours', 'bg-sky-100 text-sky-900'],
  versee: ['Versé', 'bg-emerald-100 text-emerald-900'],
  echec: ['Échec', 'bg-red-100 text-red-900'],
};
const PAY_STATUS: Record<string, string> = {
  en_attente: 'En attente',
  payee: 'Payé',
  expiree: 'Expiré',
  annulee: 'Annulé',
  echec: 'Échec',
  remboursee: 'Remboursé',
};

/**
 * Gérante : paiements en ligne. L'argent encaissé, ce qui est gardé (commissions et frais), ce qui attend la
 * livraison, et les versements (vendeuses, livreurs, remboursements) : automatiques si Wave le permet, sinon
 * « À verser » : elle envoie l'argent avec son application Wave puis touche « Versé ».
 */
export const PaymentsTab: React.FC<{ pin: string }> = ({ pin }) => {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(() => adminPayments(pin).then(r => (r.ok ? setData(r.data) : setMessage(r.error))), [pin]);
  useEffect(() => {
    load();
  }, [load]);
  if (!data)
    return (
      <div className="py-12 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  const { config: c, totals: t } = data;
  const todo = data.payouts.filter(p => p.status !== 'versee');
  return (
    <div className="space-y-4" data-testid="admin-mp-payments">
      <section className="bg-white rounded-2xl border border-ink/[0.06] p-4 text-sm">
        <p className="font-semibold">Paiement en ligne</p>
        {!c.provider ? (
          <p className="mt-1 text-ink/70">
            Pas encore activé : les clientes paient à la livraison. Pour l'activer, ouvrez un compte Wave Business, puis
            ajoutez sur Render les clés WAVE_CHECKOUT_KEY et WAVE_WEBHOOK_SECRET (et WAVE_PAYOUT_KEY pour les versements
            automatiques).
          </p>
        ) : (
          <ul className="mt-1 text-ink/75 space-y-0.5" data-testid="admin-mp-pay-config">
            <li>
              Prestataire : <strong>{c.test ? 'mode test (aucun argent réel)' : c.provider}</strong>
            </li>
            <li>Moyens proposés : {c.methods.map(m => PAYMENT_LABELS[m]).join(', ')}</li>
            <li>
              Versements :{' '}
              {c.automaticPayouts
                ? 'automatiques après chaque livraison'
                : 'à faire par vous (liste « À verser » ci-dessous), puis touchez « Versé »'}
            </li>
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(
          [
            ['Encaissé en ligne', t.collected],
            ['Gardé jusqu’à la livraison', t.holding],
            ['Versé (vendeuses, livreurs, remboursements)', t.paidOut],
            ['Reste à verser', t.toPay],
            ['Commission et frais gardés', t.kept],
          ] as [string, number][]
        ).map(([k, v]) => (
          <div key={k} className="bg-white rounded-2xl border border-ink/[0.06] p-4">
            <p className="text-xs text-ink/60">{k}</p>
            <p className="text-xl font-bold mt-1 tabular-nums">{F(v)}</p>
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-wine">{message}</p>}

      <section>
        <h3 className="font-semibold">Versements à faire ({todo.length})</h3>
        {!todo.length && <p className="text-sm text-ink/60 mt-1">Rien à verser pour le moment.</p>}
        <ul className="mt-2 space-y-2">
          {todo.map(p => (
            <li
              key={p.id}
              className="bg-white rounded-2xl border border-ink/[0.06] p-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              data-testid="admin-mp-payout"
            >
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS[p.status]?.[1] ?? ''}`}>
                {STATUS[p.status]?.[0] ?? p.status}
              </span>
              <strong>{F(p.amount)}</strong>
              <span>
                {KIND[p.kind]} · {p.name} · {p.to}
              </span>
              <span className="text-ink/60">
                Commande {p.orderId} ({p.shopName}) · {ago(p.createdAt)}
              </span>
              {p.error && <span className="text-wine">{p.error}</span>}
              <span className="ml-auto flex gap-2">
                {c.automaticPayouts && (
                  <button
                    onClick={async () => {
                      const r = await adminPayoutAction(pin, p.id, 'retry');
                      if (!r.ok) setMessage(r.error);
                      load();
                    }}
                    className="h-9 px-3 rounded-full border border-ink/15 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Réessayer
                  </button>
                )}
                <button
                  onClick={async () => {
                    const reference = window.prompt(
                      `Vous avez envoyé ${F(p.amount)} à ${p.name} (${p.to}) avec Wave ? Référence de la transaction (facultatif)`,
                      '',
                    );
                    if (reference === null) return;
                    const r = await adminPayoutAction(pin, p.id, 'sent', reference);
                    if (!r.ok) setMessage(r.error);
                    load();
                  }}
                  className="h-9 px-3 rounded-full bg-ink text-white text-xs font-semibold"
                  data-testid="admin-mp-payout-sent"
                >
                  Versé
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold">Paiements reçus</h3>
        <ul className="mt-2 divide-y divide-ink/[0.06] bg-white rounded-2xl border border-ink/[0.06]">
          {data.payments.map(p => (
            <li key={p.id} className="p-3 flex flex-wrap gap-x-3 gap-y-0.5 text-sm" data-testid="admin-mp-payment">
              <strong>{F(p.amount)}</strong>
              <span>{PAYMENT_LABELS[p.method]}</span>
              <span className="text-ink/70">{PAY_STATUS[p.status] ?? p.status}</span>
              <span className="text-ink/60">
                {p.orders.join(', ')} · {ago(p.createdAt)}
              </span>
            </li>
          ))}
          {!data.payments.length && <li className="p-3 text-sm text-ink/60">Aucun paiement en ligne.</li>}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold">Versements faits</h3>
        <ul className="mt-2 divide-y divide-ink/[0.06] bg-white rounded-2xl border border-ink/[0.06]">
          {data.payouts
            .filter(p => p.status === 'versee')
            .slice(0, 100)
            .map(p => (
              <li key={p.id} className="p-3 flex flex-wrap gap-x-3 text-sm">
                <strong>{F(p.amount)}</strong>
                <span>
                  {KIND[p.kind]} · {p.name}
                </span>
                <span className="text-ink/60">
                  Commande {p.orderId} · {p.sentAt ? ago(p.sentAt) : ''}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
};
