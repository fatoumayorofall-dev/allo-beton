import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Loader2, MessageCircle, XCircle } from 'lucide-react';
import type { PurchaseRequest, RequestStatus } from '../data/types';
import { fetchAdminRequests, patchRequest } from '../services/api';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { waNumber } from '../utils/whatsappMessages';
import { ProductImage } from '../components/ProductImage';

const LABELS: Record<RequestStatus, { label: string; tone: string }> = {
  nouvelle: { label: 'À vérifier', tone: 'bg-amber-100 text-amber-900' },
  disponible: { label: 'Disponible · lien envoyé', tone: 'bg-emerald-100 text-emerald-900' },
  indisponible: { label: 'Pas disponible', tone: 'bg-ink/10 text-ink/70' },
  commandee: { label: 'Commandée', tone: 'bg-ink text-ivory' },
};
const FILTERS: { id: RequestStatus | 'toutes'; label: string }[] = [
  { id: 'nouvelle', label: 'À vérifier' }, { id: 'disponible', label: 'Disponibles' }, { id: 'commandee', label: 'Commandées' }, { id: 'indisponible', label: 'Pas disponibles' }, { id: 'toutes', label: 'Toutes' },
];

const ago = (iso: string) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'à l\'instant';
  if (min < 60) return `il y a ${min} min`;
  if (min < 24 * 60) return `il y a ${Math.round(min / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const finishLink = (id: string) => `${window.location.origin}/commande?demande=${id}`;
export function availableMessage(r: PurchaseRequest) {
  return [
    `Bonne nouvelle ✨ Votre commande est disponible !`,
    ...r.items.map(i => `▸ ${i.name}${i.color ? ` · ${i.color}` : ''}${i.size ? ` · pointure ${i.size}` : ''} × ${i.quantity} : ${formatPrice(i.price * i.quantity)}`),
    `Total : *${formatPrice(r.total)}* (livraison en plus, selon votre quartier)`,
    ``,
    `Pour la recevoir, indiquez votre maison sur la carte et choisissez le paiement (Wave, Orange Money ou à la livraison) ici :`,
    finishLink(r.id),
    ``,
    `Merci de votre confiance 🌸 Maefa`,
  ].join('\n');
}
export function unavailableMessage(r: PurchaseRequest, note: string) {
  return [
    `Merci pour votre demande ${r.id} 🌸`,
    `Nous sommes désolés : ${r.items.length > 1 ? 'ces pièces ne sont' : 'cette pièce n\'est'} pas disponible${r.items.length > 1 ? 's' : ''} pour le moment.`,
    note ? `\n${note}` : `Voulez-vous que nous vous proposions un modèle proche ?`,
  ].join('\n');
}

/**
 * Demandes WhatsApp : chaque « Acheter » de la boutique arrive ici. La gérante vérifie chez
 * son fournisseur, puis répond « disponible » (lien pour finaliser) ou « pas disponible ».
 */
export const RequestsTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { notify } = useStore();
  const [list, setList] = useState<PurchaseRequest[] | null>(null);
  const [filter, setFilter] = useState<RequestStatus | 'toutes'>('nouvelle');
  const [busy, setBusy] = useState('');
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Prix convenus (marchandage sur WhatsApp), un champ par article
  const [deals, setDeals] = useState<Record<string, string[]>>({});
  const dealOf = (r: PurchaseRequest) => deals[r.id] ?? r.items.map(i => String(i.price));
  const dealPrices = (r: PurchaseRequest) => dealOf(r).map(v => Math.round(Number(v.replace(/\D/g, ''))));
  const dealChanged = (r: PurchaseRequest) => dealPrices(r).some((v, k) => v !== r.items[k].price);
  const dealValid = (r: PurchaseRequest) => dealPrices(r).every(v => v > 0);

  const reload = useCallback(() => fetchAdminRequests(pin).then(r => r && setList(r)), [pin]);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 20000);
    return () => clearInterval(id);
  }, [reload]);

  const counts = useMemo(() => (list ?? []).reduce<Record<string, number>>((m, r) => ((m[r.status] = (m[r.status] ?? 0) + 1), m), {}), [list]);
  // Une demande à laquelle on vient de répondre reste affichée, le temps d'envoyer le message
  const shown = (list ?? []).filter(r => filter === 'toutes' || r.status === filter || answered[r.id]);

  const answer = async (r: PurchaseRequest, status: 'disponible' | 'indisponible') => {
    setBusy(r.id);
    const note = notes[r.id] ?? '';
    if (status === 'disponible' && !dealValid(r)) { setBusy(''); notify('Indiquez un prix pour chaque article', 'error'); return; }
    const res = await patchRequest(pin, r.id, { status, note: status === 'indisponible' ? note : undefined, prices: status === 'disponible' && dealChanged(r) ? dealPrices(r) : undefined });
    setBusy('');
    if (!res.ok) { notify(res.error, 'error'); return; }
    setAnswered(a => ({ ...a, [r.id]: status === 'disponible' ? availableMessage(res.data.request) : unavailableMessage(r, note) }));
    setList(l => (l ?? []).map(x => (x.id === r.id ? res.data.request : x)));
  };

  const waTo = (r: PurchaseRequest, text: string) =>
    r.customer?.phone ? `https://wa.me/${waNumber(r.customer.phone)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;

  if (!list) return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="space-y-5" data-testid="requests-tab">
      <div className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
        <h2 className="font-display text-3xl">Demandes WhatsApp</h2>
        <p className="text-sm text-ink/70 mt-2 max-w-2xl">Chaque « Acheter » du site arrive ici et sur votre WhatsApp, avec la même référence (DEM-…). Vérifiez chez votre fournisseur, puis répondez : la cliente reçoit le lien pour finaliser (adresse sur la carte et paiement).</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 h-9 rounded-full text-sm border ${filter === f.id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10'}`}>
              {f.label}{f.id !== 'toutes' && counts[f.id] ? ` (${counts[f.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && <p className="text-sm text-ink/70 px-2">Aucune demande ici pour le moment.</p>}

      {shown.map(r => (
        <article key={r.id} className="bg-white rounded-[1.5rem] border border-ink/[0.06] p-5 space-y-4" data-testid="request-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">{r.id} <span className="font-normal text-ink/60 text-sm">· {ago(r.createdAt)}{r.customer?.firstName ? ` · ${r.customer.firstName}` : ''}{r.customer?.zone ? `, ${r.customer.zone}` : ''}</span></p>
            <span className={`px-3 h-8 rounded-full text-xs font-semibold inline-flex items-center ${LABELS[r.status].tone}`}>{LABELS[r.status].label}{r.orderId ? ` · ${r.orderId}` : ''}</span>
          </div>
          <ul className="space-y-2">
            {r.items.map((i, k) => (
              <li key={k} className="flex items-center gap-3">
                <ProductImage src={i.image} alt="" label="" className="w-14 h-[4.4rem] rounded-xl shrink-0" sizes="60px" />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block font-semibold truncate">{i.name}</span>
                  <span className="block text-xs text-ink/65">{[i.color, i.size && `pointure ${i.size}`, `× ${i.quantity}`].filter(Boolean).join(' · ')}</span>
                </span>
                {(r.status === 'nouvelle' || r.status === 'disponible') && !answered[r.id] ? (
                  <label className="shrink-0 text-right">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-ink/60">Prix convenu{i.quantity > 1 ? ' (1 pièce)' : ''}</span>
                    <input inputMode="numeric" value={dealOf(r)[k]} data-testid="deal-price"
                      onChange={e => setDeals(d => ({ ...d, [r.id]: dealOf(r).map((v, j) => (j === k ? e.target.value.replace(/[^\d\s]/g, '') : v)) }))}
                      className="w-28 h-10 px-3 rounded-xl border border-ink/15 text-right font-semibold" aria-label={`Prix convenu pour ${i.name}`} />
                    {(i.catalogPrice ?? i.price) !== Number(dealOf(r)[k].replace(/\D/g, '')) && <span className="block text-[10px] text-ink/55 mt-0.5">catalogue : {formatPrice(i.catalogPrice ?? i.price)}</span>}
                  </label>
                ) : (
                  <span className="text-sm font-semibold shrink-0 text-right">{formatPrice(i.price * i.quantity)}{i.catalogPrice && i.catalogPrice !== i.price && <span className="block text-[10px] font-normal text-ink/55 line-through">{formatPrice(i.catalogPrice * i.quantity)}</span>}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-right">Total articles : <strong data-testid="request-total">{formatPrice(answered[r.id] || r.status === 'commandee' || r.status === 'indisponible' ? r.total : dealPrices(r).reduce((s, v, k) => s + (v || 0) * r.items[k].quantity, 0))}</strong></p>
          {r.status === 'disponible' && !answered[r.id] && dealChanged(r) && (
            <button onClick={() => answer(r, 'disponible')} disabled={!!busy} data-testid="deal-save" className="w-full h-12 rounded-2xl bg-ink text-ivory font-semibold">Enregistrer le prix convenu</button>
          )}

          {r.status === 'nouvelle' && !answered[r.id] && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => answer(r, 'disponible')} disabled={!!busy} data-testid="request-available" className="h-14 rounded-2xl bg-emerald-700 text-white font-semibold inline-flex items-center justify-center gap-2">
                  {busy === r.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} Disponible
                </button>
                <button onClick={() => answer(r, 'indisponible')} disabled={!!busy} className="h-14 rounded-2xl border border-ink/15 font-semibold inline-flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" /> Pas disponible
                </button>
              </div>
              <input value={notes[r.id] ?? ''} onChange={e => setNotes(n => ({ ...n, [r.id]: e.target.value }))} className="field-sm"
                placeholder="Si pas disponible : un mot pour la cliente (facultatif), ex. « Le noir arrive jeudi »" aria-label={`Message pour ${r.id}`} />
            </div>
          )}

          {(answered[r.id] || r.status === 'disponible') && (
            <div className="rounded-2xl bg-ivory p-4 space-y-3">
              <p className="text-sm font-semibold">{r.status === 'indisponible' ? 'Message à envoyer à la cliente' : 'Lien pour finaliser, à envoyer à la cliente'}</p>
              <pre className="whitespace-pre-wrap text-xs text-ink/80 font-sans" data-testid="request-message">{answered[r.id] ?? availableMessage(r)}</pre>
              <div className="flex flex-wrap gap-2">
                <a href={waTo(r, answered[r.id] ?? availableMessage(r))} target="_blank" rel="noopener noreferrer" className="px-4 h-11 rounded-full bg-[#177a41] text-white text-sm font-semibold inline-flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Envoyer sur WhatsApp
                </a>
                <button onClick={() => { navigator.clipboard?.writeText(answered[r.id] ?? availableMessage(r)); notify('Message copié'); }} className="px-4 h-11 rounded-full bg-white border border-ink/15 text-sm inline-flex items-center gap-2"><Copy className="w-4 h-4" /> Copier</button>
              </div>
              {!r.customer?.phone && <p className="text-[11px] text-ink/60">WhatsApp vous demandera de choisir la discussion de la cliente (celle qui contient la référence {r.id}).</p>}
            </div>
          )}
        </article>
      ))}
    </div>
  );
};

export default RequestsTab;
