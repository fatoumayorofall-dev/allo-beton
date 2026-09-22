import React, { Suspense, lazy, useState } from 'react';
import { Copy, Loader2, MapPin, MessageCircle, Navigation } from 'lucide-react';
import type { Order } from '../data/types';
import { buildWhatsAppLink, googleMapsDirections } from '../config/site';
import { assignDriver } from '../services/api';
import { useStore } from '../context/StoreContext';
import { waNumber } from '../utils/whatsappMessages';
import { formatPrice } from '../utils/format';

const LiveTracking = lazy(() => import('../components/LiveTracking'));

const DRIVERS_KEY = 'fabima_drivers';
type Driver = { name: string; phone: string };
const loadDrivers = (): Driver[] => { try { return JSON.parse(localStorage.getItem(DRIVERS_KEY) || '[]'); } catch { return []; } };
const rememberDriver = (d: Driver) => {
  try { localStorage.setItem(DRIVERS_KEY, JSON.stringify([d, ...loadDrivers().filter(x => x.phone !== d.phone)].slice(0, 6))); } catch { /* ignore */ }
};

const STATE_LABELS = { assignee: 'Pas encore parti', en_route: 'En route', livree: 'Livré' } as const;

function driverText(order: Order, link: string) {
  const c = order.customer;
  return [
    `🛵 *Livraison ${order.id}* — Fabima Store`,
    ``,
    `Cliente : ${c.firstName} ${c.lastName} — ${c.phone}`,
    `Quartier : ${c.location?.label || c.zone}`,
    order.paymentStatus === 'paye' ? 'Déjà payé ✅' : `À encaisser : *${formatPrice(order.total)}*`,
    ``,
    `Ouvrez ce lien et touchez « Démarrer la course » :`,
    link,
  ].join('\n');
}

/** Détail d'une commande côté gérante : point de livraison sur la carte + livreur suivi en direct. */
export const DeliveryPanel: React.FC<{ order: Order; pin: string; onChanged: () => void }> = ({ order, pin, onChanged }) => {
  const { notify } = useStore();
  const loc = order.customer.location;
  const d = order.delivery;
  const onServer = order.delivery !== undefined;
  const [form, setForm] = useState<Driver>({ name: '', phone: '' });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const drivers = loadDrivers();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await assignDriver(order.id, form, pin);
    setBusy(false);
    if (!r.ok) { notify(r.error, 'error'); return; }
    rememberDriver(form);
    setEditing(false);
    notify(r.data.sent?.ok ? `${form.name} a reçu le lien sur WhatsApp` : 'Livreur enregistré : envoyez-lui le lien', 'success');
    onChanged();
  };

  const canAssign = onServer && order.status !== 'annulee' && order.status !== 'livree';

  return (
    <div className="space-y-4" data-testid="delivery-panel">
      <div>
        <p className="font-medium mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Point de livraison</p>
        {loc ? (
          <>
            <Suspense fallback={<div className="h-56 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
              <LiveTracking location={loc} delivery={d?.state === 'en_route' ? d : null} compact />
            </Suspense>
            <p className="mt-2">{loc.label || `${loc.lat}, ${loc.lng}`}{loc.accuracy ? <span className="text-ink/50"> · GPS ± {loc.accuracy} m</span> : null}</p>
            {loc.landmark && <p className="text-ink/70">🔎 {loc.landmark}</p>}
            <a href={googleMapsDirections(loc)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-[#1a73e8] font-semibold">
              <Navigation className="w-4 h-4" /> Ouvrir dans Google Maps
            </a>
          </>
        ) : (
          <p className="text-ink/55">Pas de point sur la carte : adresse écrite uniquement.</p>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-ivory space-y-3">
        <p className="font-medium">🛵 Livreur</p>
        {!onServer && <p className="text-xs text-ink/55">Commande gardée sur ce téléphone uniquement : le suivi du livreur demande le serveur.</p>}
        {d && !editing && (
          <>
            <p><strong>{d.driverName}</strong> · {d.driverPhone} · <span className="text-wine">{STATE_LABELS[d.state]}</span>
              {d.state === 'en_route' && d.etaMin != null && <span className="text-ink/60"> · arrive dans ~{d.etaMin} min</span>}</p>
            {d.driverLink && d.state !== 'livree' && (
              <div className="flex flex-wrap gap-2">
                <a href={buildWhatsAppLink(driverText(order, d.driverLink), waNumber(d.driverPhone))} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#1f8f4e] text-white text-sm font-semibold"><MessageCircle className="w-4 h-4" /> Envoyer le lien au livreur</a>
                <button type="button" onClick={() => navigator.clipboard?.writeText(d.driverLink!).then(() => notify('Lien copié', 'success'))}
                  className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-ink/15 text-sm"><Copy className="w-4 h-4" /> Copier le lien</button>
                <button type="button" onClick={() => { setForm({ name: d.driverName, phone: d.driverPhone.replace(/^\+221/, '') }); setEditing(true); }}
                  className="px-4 h-10 rounded-full text-sm underline underline-offset-4">Changer de livreur</button>
              </div>
            )}
          </>
        )}
        {canAssign && (!d || editing) && (
          <form onSubmit={submit} className="space-y-2">
            {drivers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {drivers.map(x => (
                  <button key={x.phone} type="button" onClick={() => setForm(x)} className={`px-3 h-8 rounded-full text-xs border ${form.phone === x.phone ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}>{x.name}</button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom du livreur" aria-label="Nom du livreur" required className="px-3 h-11 rounded-xl border border-ink/15 bg-white" />
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="77 123 45 67" type="tel" aria-label="Téléphone du livreur" required className="px-3 h-11 rounded-xl border border-ink/15 bg-white" />
            </div>
            <button disabled={busy} className="w-full h-11 rounded-full bg-ink text-ivory font-semibold inline-flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confier la livraison
            </button>
            <p className="text-xs text-ink/50">Le livreur reçoit un lien : il touche « Démarrer la course », la cliente est prévenue et le suit sur la carte.</p>
          </form>
        )}
      </div>
    </div>
  );
};
