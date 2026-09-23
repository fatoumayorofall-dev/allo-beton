import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowDown, Copy, Loader2, MapPin, MessageCircle, Navigation, Plus, Trash2 } from 'lucide-react';
import type { DeliveryLeg, Order, RelayPoint, Vehicle } from '../data/types';
import { buildWhatsAppLink, googleMapsDirections } from '../config/site';
import { saveDeliveryPlan, searchPlaces, type PlaceResult } from '../services/api';
import { useStore } from '../context/StoreContext';
import { waNumber } from '../utils/whatsappMessages';
import { VEHICLE_LABELS, formatEta, formatPrice } from '../utils/format';
import { RelaySteps } from '../components/LiveTracking';

const LiveTracking = lazy(() => import('../components/LiveTracking'));

/* Livreurs et points de relais déjà utilisés : proposés en un clic */
const DRIVERS_KEY = 'fabima_drivers';
const POINTS_KEY = 'fabima_relay_points';
type Driver = { name: string; phone: string; vehicle?: Vehicle };
const load = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const remember = <T,>(key: string, item: T, same: (a: T) => boolean, max = 8) => {
  try { localStorage.setItem(key, JSON.stringify([item, ...load<T>(key).filter(x => !same(x))].slice(0, max))); } catch { /* ignore */ }
};

const STATE_LABELS = { attente: 'Pas encore parti', en_route: 'En route', remis: 'Terminé' } as const;

interface Row { name: string; phone: string; vehicle: Vehicle; to: RelayPoint | null; locked: boolean }
const emptyRow = (vehicle: Vehicle = 'moto'): Row => ({ name: '', phone: '', vehicle, to: null, locked: false });

function driverText(order: Order, legs: DeliveryLeg[], k: number) {
  const c = order.customer;
  const leg = legs[k], prev = legs[k - 1], next = legs[k + 1];
  const lines = [`🛵 *Livraison ${order.id}* — Fabima Store`];
  if (legs.length > 1) lines.push(`🔁 Relais : étape ${k + 1} sur ${legs.length}`);
  lines.push('');
  if (prev) lines.push(`📦 Vous recevez le colis de ${prev.driverName} (${prev.driverPhone})${prev.to ? ` à : ${prev.to.label}` : ''}.`);
  if (next) lines.push(`🤝 Vous le remettez à ${next.driverName} (${next.driverPhone}) à : *${leg.to?.label}*.`);
  else lines.push(`Cliente : ${c.firstName} ${c.lastName} — ${c.phone}`, `Quartier : ${c.location?.label || c.zone}`,
    order.paymentStatus === 'paye' ? 'Déjà payé ✅' : `À encaisser : *${formatPrice(order.total)}*`);
  lines.push('', `Ouvrez ce lien et touchez « ${prev ? 'J\'ai reçu le colis' : 'Démarrer la course'} » :`, leg.driverLink ?? '');
  return lines.join('\n');
}

/** Champ « point de relais » : recherche sur la carte ou simple nom (gare routière, station…). */
const RelayPointField: React.FC<{ value: RelayPoint | null; onChange: (p: RelayPoint | null) => void; index: number }> = ({ value, onChange, index }) => {
  const [q, setQ] = useState(value?.label ?? '');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const recent = load<RelayPoint>(POINTS_KEY);
  useEffect(() => {
    // pas de recherche quand le texte est celui d'un lieu déjà choisi dans la liste
    if (q.trim().length < 3 || (value?.lat != null && q === value.label)) { setResults(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => setResults(await searchPlaces(q, undefined, ctrl.signal) ?? []), 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);
  const pick = (p: RelayPoint) => { onChange(p); setQ(p.label); setResults(null); };
  return (
    <div className="relative">
      <input value={q} onChange={e => { setQ(e.target.value); onChange(e.target.value.trim() ? { label: e.target.value.trim() } : null); }}
        placeholder="Point de relais : gare routière, station…" aria-label={`Point de relais ${index + 1}`}
        className="w-full px-3 h-11 rounded-xl border border-ink/15 bg-white" />
      {value?.label && <span className="text-[11px] text-ink/70">{value.lat != null ? '📍 point sur la carte' : 'nom seulement (pas de point sur la carte)'}</span>}
      {!value && recent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {recent.map(p => <button key={p.label} type="button" onClick={() => pick(p)} className="px-3 h-7 rounded-full text-xs bg-white border border-ink/15">🔁 {p.label}</button>)}
        </div>
      )}
      {results && results.length > 0 && (
        <ul className="absolute z-[600] left-0 right-0 mt-1 bg-white rounded-xl shadow-luxe border border-ink/[0.06] max-h-56 overflow-y-auto">
          {results.map(r => (
            <li key={`${r.lat},${r.lng}`}><button type="button" onClick={() => pick({ label: r.label, lat: r.lat, lng: r.lng })} className="w-full text-left px-3 py-2 text-sm hover:bg-ivory">📍 {r.label}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Détail d'une commande côté gérante : point de livraison sur la carte + livreur(s) suivis en direct. */
export const DeliveryPanel: React.FC<{ order: Order; pin: string; onChanged: () => void }> = ({ order, pin, onChanged }) => {
  const { notify } = useStore();
  const loc = order.customer.location;
  const d = order.delivery;
  const legs = d?.legs ?? [];
  const onServer = order.delivery !== undefined;
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const drivers = load<Driver>(DRIVERS_KEY);

  const openEditor = (relay = false) => {
    const base: Row[] = legs.length
      ? legs.map(l => ({ name: l.driverName, phone: l.driverPhone.replace(/^\+221/, ''), vehicle: l.vehicle, to: l.to, locked: l.state !== 'attente' }))
      : [emptyRow()];
    // « En relais » : on ajoute une étape longue distance avant la dernière
    if (relay && base.length === 1) base.unshift({ ...emptyRow('moto') });
    setRows(base);
    setEditing(true);
  };
  const update = (k: number, patch: Partial<Row>) => setRows(rs => rs.map((r, i) => (i === k ? { ...r, ...patch } : r)));
  const addRelay = () => setRows(rs => [...rs.slice(0, -1), emptyRow(rs.length === 1 ? 'moto' : 'car'), rs[rs.length - 1]]);
  const removeRow = (k: number) => setRows(rs => rs.filter((_, i) => i !== k));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await saveDeliveryPlan(order.id, rows.map((row, k) => ({ name: row.name, phone: row.phone, vehicle: row.vehicle, to: k === rows.length - 1 ? null : row.to })), pin);
    setBusy(false);
    if (!r.ok) { notify(r.error, 'error'); return; }
    rows.forEach((row, k) => {
      remember<Driver>(DRIVERS_KEY, { name: row.name, phone: row.phone, vehicle: row.vehicle }, x => x.phone === row.phone);
      if (k < rows.length - 1 && row.to) remember<RelayPoint>(POINTS_KEY, row.to, x => x.label === row.to!.label);
    });
    setEditing(false);
    const sent = r.data.sentAll.filter(x => x.result?.ok).length;
    notify(sent ? `${sent} livreur(s) ont reçu leur lien sur WhatsApp` : 'Livraison enregistrée : envoyez son lien à chaque livreur', 'success');
    onChanged();
  };

  const canPlan = onServer && order.status !== 'annulee' && order.status !== 'livree';

  return (
    <div className="space-y-4" data-testid="delivery-panel">
      <div>
        <p className="font-medium mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Point de livraison</p>
        {loc ? (
          <>
            <Suspense fallback={<div className="h-56 rounded-[1.5rem] bg-blush/30 animate-pulse" />}>
              <LiveTracking location={loc} delivery={d?.state === 'en_route' ? d : null} compact />
            </Suspense>
            <p className="mt-2">{loc.label || `${loc.lat}, ${loc.lng}`}{loc.accuracy ? <span className="text-ink/70"> · GPS ± {loc.accuracy} m</span> : null}</p>
            {loc.landmark && <p className="text-ink/70">🔎 {loc.landmark}</p>}
            <a href={googleMapsDirections(loc)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-1 text-[#1a73e8] font-semibold">
              <Navigation className="w-4 h-4" /> Ouvrir dans Google Maps
            </a>
          </>
        ) : (
          <p className="text-ink/70">Pas de point sur la carte : adresse écrite uniquement.</p>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-ivory space-y-3">
        <p className="font-medium">🛵 Livraison{d?.relay && ' en relais'}</p>
        {!onServer && <p className="text-xs text-ink/70">Commande gardée sur ce téléphone uniquement : le suivi du livreur demande le serveur.</p>}

        {d && !editing && (
          <>
            {d.relay ? <RelaySteps delivery={d} admin /> : (
              <p><strong>{d.driverName}</strong> · {d.driverPhone} · <span className="text-wine">{STATE_LABELS[legs[0]?.state ?? 'attente']}</span></p>
            )}
            {d.state === 'en_route' && d.etaMin != null && <p className="text-ink/75">{d.final ? 'Chez la cliente' : `Au relais ${d.target?.label ?? ''}`} dans ~{formatEta(d.etaMin)}</p>}
            {legs.map((l, k) => l.state !== 'remis' && l.driverLink && (
              <div key={k} className="flex flex-wrap items-center gap-2">
                <a href={buildWhatsAppLink(driverText(order, legs, k), waNumber(l.driverPhone))} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-[#1f8f4e] text-white text-sm font-semibold"><MessageCircle className="w-4 h-4" /> {legs.length > 1 ? `Envoyer le lien à ${l.driverName}` : 'Envoyer le lien au livreur'}</a>
                <button type="button" onClick={() => navigator.clipboard?.writeText(l.driverLink!).then(() => notify('Lien copié', 'success'))}
                  className="inline-flex items-center gap-1.5 px-3 h-10 rounded-full border border-ink/15 text-sm"><Copy className="w-4 h-4" /> Copier</button>
              </div>
            ))}
            {canPlan && d.state !== 'livree' && (
              <button type="button" onClick={() => openEditor()} className="px-1 h-9 text-sm underline underline-offset-4">{d.relay ? 'Modifier le relais' : 'Changer de livreur / passer en relais'}</button>
            )}
          </>
        )}

        {canPlan && !d && !editing && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => openEditor(false)} className="h-12 rounded-2xl bg-ink text-ivory text-sm font-semibold">🛵 Un livreur</button>
            <button type="button" onClick={() => openEditor(true)} className="h-12 rounded-2xl bg-white border border-ink/15 text-sm font-semibold">🔁 En relais (longue distance)</button>
          </div>
        )}

        {canPlan && editing && (
          <form onSubmit={submit} className="space-y-2" data-testid="relay-editor">
            {rows.map((row, k) => {
              const last = k === rows.length - 1;
              return (
                <React.Fragment key={k}>
                  <fieldset disabled={row.locked} className={`p-3 rounded-2xl border space-y-2 min-w-0 ${row.locked ? 'bg-white/50 border-ink/5 opacity-70' : 'bg-white border-ink/10'}`}>
                    <div className="flex items-center justify-between">
                      <legend className="text-sm font-semibold">{rows.length > 1 ? `Étape ${k + 1}` : 'Livreur'}{row.locked && ' · déjà en route'}</legend>
                      {rows.length > 1 && !last && !row.locked && <button type="button" onClick={() => removeRow(k)} aria-label={`Retirer l'étape ${k + 1}`} className="w-8 h-8 grid place-items-center text-ink/70"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    {!row.locked && drivers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {drivers.map(x => (
                          <button key={x.phone} type="button" onClick={() => update(k, { name: x.name, phone: x.phone, vehicle: x.vehicle ?? row.vehicle })}
                            className={`px-3 h-7 rounded-full text-xs border ${row.phone === x.phone ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/15'}`}>{x.name}</button>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input value={row.name} onChange={e => update(k, { name: e.target.value })} placeholder="Nom" aria-label={rows.length > 1 ? `Nom du livreur ${k + 1}` : 'Nom du livreur'} required className="px-3 h-11 rounded-xl border border-ink/15 bg-white" />
                      <input value={row.phone} onChange={e => update(k, { phone: e.target.value })} placeholder="77 123 45 67" type="tel" aria-label={rows.length > 1 ? `Téléphone du livreur ${k + 1}` : 'Téléphone du livreur'} required className="px-3 h-11 rounded-xl border border-ink/15 bg-white" />
                    </div>
                    <select value={row.vehicle} onChange={e => update(k, { vehicle: e.target.value as Vehicle })} aria-label={`Véhicule ${k + 1}`} className="w-full px-3 h-11 rounded-xl border border-ink/15 bg-white">
                      {(Object.keys(VEHICLE_LABELS) as Vehicle[]).map(v => <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>)}
                    </select>
                    {last ? <p className="text-xs text-ink/70">🏠 Jusqu'à la cliente ({loc?.label || order.customer.zone})</p>
                      : row.locked ? <p className="text-xs">🔁 Jusqu'à {row.to?.label}</p>
                        : <RelayPointField value={row.to} onChange={to => update(k, { to })} index={k} />}
                  </fieldset>
                  {!last && <ArrowDown className="w-4 h-4 mx-auto text-ink/30" />}
                </React.Fragment>
              );
            })}
            <button type="button" onClick={addRelay} className="w-full h-10 rounded-full border border-dashed border-ink/25 text-sm inline-flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" /> Ajouter un relais</button>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button disabled={busy} className="h-11 rounded-full bg-ink text-ivory font-semibold inline-flex items-center justify-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} {rows.length > 1 ? 'Enregistrer le relais' : 'Confier la livraison'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-4 h-11 rounded-full text-sm">Annuler</button>
            </div>
            <p className="text-xs text-ink/70">Chaque livreur reçoit son lien. La cliente suit le colis de main en main et reçoit un message à chaque passage de relais.</p>
          </form>
        )}
      </div>
    </div>
  );
};
