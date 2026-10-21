import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { fetchPayment, simulatePayment, type PaymentSummary } from './api';
import { MP, mpPath } from './config';
import { F, PAYMENT_LABELS } from './format';
import { usePageTitle } from '../utils/usePageTitle';

/** Couleurs des moyens de paiement (repère visuel, sans logo) */
const METHOD_COLOR: Record<string, string> = { wave: '#1dc4ff', orange_money: '#ff7900' };

/**
 * Page de paiement : retour de Wave (ou d'Orange Money) et suivi jusqu'à la confirmation ; en mode test,
 * écran de paiement simulé (aucun argent réel). L'argent est gardé par la plateforme jusqu'à la livraison.
 */
export default function MpPayment() {
  usePageTitle(`Paiement · ${MP.name}`);
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const [p, setP] = useState<PaymentSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetchPayment(id);
    if (r.ok) setP(r.data.payment);
    else setError(r.error);
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);
  // En attente : on vérifie toutes les 3 secondes (Wave confirme en général en quelques secondes)
  const waiting = p?.status === 'en_attente' && !p.test;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [waiting, load]);

  const simulate = async (ok: boolean) => {
    setBusy(true);
    const r = await simulatePayment(id, ok);
    setBusy(false);
    if (r.ok) setP(r.data.payment);
    else setError(r.error);
  };

  if (error)
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="font-display text-3xl">Paiement introuvable</p>
        <p className="mt-2 text-ink/70">{error}</p>
        <Link to={mpPath('/commandes')} className="btn-dark mt-6 inline-flex !h-12 !px-6">
          Mes commandes
        </Link>
      </div>
    );
  if (!p)
    return (
      <div className="py-24 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  const color = METHOD_COLOR[p.method] ?? '#1c1917';
  const label = PAYMENT_LABELS[p.method];

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-10" data-testid="mp-payment">
      <section className="bg-white rounded-3xl border border-ink/[0.06] overflow-hidden">
        <div className="p-5 text-white" style={{ background: color }}>
          <p className="text-xs uppercase tracking-[0.16em] font-semibold opacity-85">
            Paiement {label}
            {p.test && ' · test'}
          </p>
          <p className="mt-1 font-display text-4xl tabular-nums" data-testid="mp-payment-amount">
            {F(p.amount)}
          </p>
          <p className="text-sm opacity-90">
            {p.orders.length} commande{p.orders.length > 1 ? 's' : ''} · {MP.name}
          </p>
        </div>

        <div className="p-5">
          {p.status === 'payee' || p.status === 'remboursee' ? (
            <div className="text-center" data-testid="mp-payment-done">
              <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600" strokeWidth={1.5} />
              <p className="font-display text-3xl mt-2">Paiement reçu</p>
              <p className="text-sm text-ink/70 mt-2">
                L'argent est gardé par {MP.name} : la boutique le reçoit seulement quand vous donnez votre{' '}
                <strong>code de remise</strong>, colis en main. Si la commande est annulée, vous êtes remboursée.
              </p>
              <Link to={mpPath('/commandes')} className="btn-dark mt-5 inline-flex !h-12 !px-6">
                Suivre ma commande
              </Link>
            </div>
          ) : p.status === 'en_attente' ? (
            p.test ? (
              <div data-testid="mp-payment-test">
                <p className="rounded-xl bg-amber-50 text-amber-950 text-sm p-3">
                  <strong>Mode test</strong> : aucun argent réel. Sur le vrai site, l'application {label} s'ouvre ici
                  pour confirmer le paiement.
                </p>
                <button
                  disabled={busy}
                  onClick={() => simulate(true)}
                  className="mt-4 w-full h-14 rounded-full text-white font-bold disabled:opacity-50"
                  style={{ background: color }}
                  data-testid="mp-payment-pay"
                >
                  Payer {F(p.amount)} (test)
                </button>
                <button
                  disabled={busy}
                  onClick={() => simulate(false)}
                  className="mt-2 w-full h-12 rounded-full border border-ink/15 font-semibold"
                  data-testid="mp-payment-cancel"
                >
                  Annuler le paiement
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-ink/40" />
                <p className="mt-3 font-semibold">
                  {params.get('retour') === 'erreur'
                    ? 'Paiement interrompu'
                    : `En attente de la confirmation de ${label}…`}
                </p>
                {p.url && (
                  <a
                    href={p.url}
                    className="mt-4 inline-flex h-12 px-6 rounded-full text-white font-bold items-center"
                    style={{ background: color }}
                  >
                    Ouvrir {label} pour payer
                  </a>
                )}
                <button onClick={load} className="mt-3 block mx-auto text-sm underline">
                  J'ai payé : vérifier
                </button>
              </div>
            )
          ) : (
            <div className="text-center" data-testid="mp-payment-failed">
              <XCircle className="w-14 h-14 mx-auto text-wine" strokeWidth={1.5} />
              <p className="font-display text-3xl mt-2">Paiement non abouti</p>
              <p className="text-sm text-ink/70 mt-2">
                Aucun argent n'a été pris. La commande est annulée et les articles sont remis en vente.
              </p>
              <Link to={mpPath()} className="btn-dark mt-5 inline-flex !h-12 !px-6">
                Revenir aux boutiques
              </Link>
            </div>
          )}
        </div>
      </section>
      <p className="mt-4 text-xs text-ink/55 flex items-start gap-1.5">
        <ShieldCheck className="w-4 h-4 shrink-0" /> Paiement sécurisé : {MP.name} ne voit jamais votre code {label}.
      </p>
    </div>
  );
}
