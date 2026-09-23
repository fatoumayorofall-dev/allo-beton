import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe2, Link2, Loader2, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import type { Currency, MarketProduct, MarketSettings, Order, SupplierStatus } from '../data/types';
import { useStore } from '../context/StoreContext';
import { deleteMarketProduct, fetchAdminMarket, fetchAdminOrders, importMarketProduct, patchSupplier, saveMarketProduct, saveMarketSettings } from '../services/api';
import { formatPrice } from '../utils/format';
import { costInXof, delayLabel, marketCategoryOnSale, refreshMarket, suggestedPrice } from '../utils/market';
import { CATEGORIES } from '../data/catalog';
import { SUPPLIER_LABELS } from '../components/SupplierSteps';
import { ProductImage } from '../components/ProductImage';

const CURRENCIES: { id: Currency; label: string }[] = [
  { id: 'XOF', label: 'FCFA' }, { id: 'EUR', label: '€ Euro' }, { id: 'USD', label: '$ Dollar' }, { id: 'CNY', label: '¥ Yuan' },
];
const input = 'w-full px-3 h-11 rounded-xl border border-ink/15 bg-white outline-none focus:border-ink';
const label = 'block text-[11px] uppercase tracking-[0.16em] font-semibold text-ink/60 mb-1.5';

/** Montant des articles du Marché dans une commande (ce que la cliente a payé pour eux). */
const marketRevenue = (o: Order) => o.items.filter(i => i.productId.startsWith('MK-')).reduce((s, i) => s + i.price * i.quantity, 0);

/* ------------------------------------------------------------------ */
/*  Commande chez le fournisseur (utilisé aussi dans le détail commande) */
/* ------------------------------------------------------------------ */
export const SupplierPanel: React.FC<{ order: Order; pin: string }> = ({ order, pin }) => {
  const { syncOrders, notify } = useStore();
  const sup = order.supplier!;
  const [form, setForm] = useState({ status: sup.status, ref: sup.ref ?? '', tracking: sup.tracking ?? '', trackingUrl: sup.trackingUrl ?? '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ status: sup.status, ref: sup.ref ?? '', tracking: sup.tracking ?? '', trackingUrl: sup.trackingUrl ?? '' }), [sup.status, sup.ref, sup.tracking, sup.trackingUrl]);
  const revenue = marketRevenue(order);
  const profit = revenue - (sup.cost ?? 0);

  const save = async () => {
    setBusy(true);
    const r = await patchSupplier(order.id, form, pin);
    setBusy(false);
    if (!r.ok) { notify(r.error, 'error'); return; }
    syncOrders([{ ...r.data.order, delivery: order.delivery }]);
    notify(r.data.sent?.ok ? `${order.customer.firstName} a été prévenue sur WhatsApp` : 'Suivi fournisseur enregistré', 'success');
  };

  return (
    <div className="p-4 rounded-2xl bg-blush/25 border border-wine/10 space-y-3 text-sm" data-testid="supplier-panel">
      <p className="font-medium flex items-center gap-2"><Globe2 className="w-4 h-4 text-wine" /> Le Marché · à commander chez le fournisseur</p>
      <ul className="space-y-2">
        {(sup.lines ?? []).map((l, i) => (
          <li key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white">
            <span className="min-w-0">
              <strong className="block">{l.quantity} × {l.name}</strong>
              {l.variant && <span className="block text-xs text-ink/55">{l.variant}</span>}
              <span className="block text-xs text-ink/55">Coût ≈ {formatPrice(l.unitCost)} / pièce{l.supplierName && ` · ${l.supplierName}`}</span>
            </span>
            {l.supplierUrl && (
              <a href={l.supplierUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 px-3 h-9 rounded-full bg-ink text-ivory text-xs font-semibold">
                Commander <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink/60">Vendu {formatPrice(revenue)} · coût ≈ {formatPrice(sup.cost ?? 0)} · <strong className={profit >= 0 ? 'text-emerald-800' : 'text-wine'}>bénéfice ≈ {formatPrice(profit)}</strong></p>
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2"><span className={label}>Étape</span>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SupplierStatus }))} className={input} aria-label="Étape fournisseur">
            {(Object.keys(SUPPLIER_LABELS) as SupplierStatus[]).map(s => <option key={s} value={s}>{SUPPLIER_LABELS[s]}</option>)}
          </select>
        </label>
        <label><span className={label}>N° commande fournisseur</span><input value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} className={input} aria-label="Numéro de commande fournisseur" /></label>
        <label><span className={label}>N° de suivi colis</span><input value={form.tracking} onChange={e => setForm(f => ({ ...f, tracking: e.target.value }))} className={input} aria-label="Numéro de suivi" /></label>
        <label className="col-span-2"><span className={label}>Lien de suivi (facultatif)</span><input value={form.trackingUrl} onChange={e => setForm(f => ({ ...f, trackingUrl: e.target.value }))} placeholder="https://…" className={input} aria-label="Lien de suivi" /></label>
      </div>
      <button onClick={save} disabled={busy} className="w-full h-11 rounded-full bg-wine text-white font-semibold inline-flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer {form.status !== sup.status && '· prévenir la cliente'}
      </button>
      <p className="text-[11px] text-ink/50">Une fois arrivé à Dakar, confiez la livraison à un livreur ci-dessous comme d'habitude.</p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Fiche produit du Marché                                            */
/* ------------------------------------------------------------------ */
type Draft = Omit<MarketProduct, 'id' | 'slug' | 'createdAt' | 'supplier'> & { id?: string; supplier: NonNullable<MarketProduct['supplier']>; imagesText: string; optionsText: { name: string; values: string }[] };

const emptyDraft = (s: MarketSettings): Draft => ({
  name: '', description: '', category: CATEGORIES[0].name, images: [], imagesText: '', price: 0, options: [], optionsText: [{ name: '', values: '' }],
  delayMin: s.delayMin, delayMax: s.delayMax, active: true, supplier: { name: '', url: '', cost: 0, currency: 'USD', shipping: 0, note: '' },
});
const toDraft = (p: MarketProduct): Draft => ({
  ...p, imagesText: p.images.join('\n'), optionsText: p.options.length ? p.options.map(o => ({ name: o.name, values: o.values.join(', ') })) : [{ name: '', values: '' }],
  supplier: p.supplier ?? { name: '', url: '', cost: 0, currency: 'USD', shipping: 0, note: '' },
});

const ProductEditor: React.FC<{ initial: Draft; settings: MarketSettings; pin: string; onClose: () => void; onSaved: () => void }> = ({ initial, settings, pin, onClose, onSaved }) => {
  const { notify } = useStore();
  const [d, setD] = useState<Draft>(initial);
  const [link, setLink] = useState(initial.supplier.url);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }));
  const setSup = (patch: Partial<Draft['supplier']>) => setD(x => ({ ...x, supplier: { ...x.supplier, ...patch } }));

  const cost = costInXof(d.supplier.cost, d.supplier.shipping, d.supplier.currency, settings);
  const suggestion = suggestedPrice(cost, settings);
  const profit = d.price - cost;
  const images = d.imagesText.split(/\s+/).filter(u => /^https?:\/\//.test(u));

  const doImport = async () => {
    if (!link.trim()) return;
    setImporting(true);
    const r = await importMarketProduct(link.trim(), pin);
    setImporting(false);
    if (!r.ok) { notify(r.error, 'error'); setSup({ url: link.trim() }); return; }
    const g = r.data.draft;
    setD(x => ({
      ...x,
      name: g.name || x.name,
      description: g.description || x.description,
      imagesText: g.images.length ? g.images.join('\n') : x.imagesText,
      supplier: { ...x.supplier, url: g.url, name: g.supplierName || x.supplier.name, cost: g.cost ?? x.supplier.cost, currency: g.currency ?? x.supplier.currency },
    }));
    notify('Fiche préremplie : vérifiez le nom, les photos et le coût', 'success');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await saveMarketProduct({
      id: d.id, name: d.name, description: d.description, category: d.category, images, price: d.price, oldPrice: d.oldPrice,
      options: d.optionsText.map(o => ({ name: o.name.trim(), values: o.values.split(',').map(v => v.trim()).filter(Boolean) })).filter(o => o.name && o.values.length),
      delayMin: d.delayMin, delayMax: d.delayMax, active: d.active, supplier: { ...d.supplier, url: d.supplier.url || link.trim() },
    }, pin);
    setSaving(false);
    if (!r.ok) { notify(r.error, 'error'); return; }
    notify(d.id ? 'Produit mis à jour' : 'Produit ajouté au Marché', 'success');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form onSubmit={save} role="dialog" aria-label="Produit du Marché" className="relative w-full max-w-3xl max-h-[100svh] sm:max-h-[92vh] overflow-y-auto bg-ivory sm:rounded-[2rem] p-5 sm:p-8 space-y-6" data-testid="market-editor">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-3xl">{d.id ? 'Modifier le produit' : 'Nouveau produit du Marché'}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-10 h-10 rounded-full bg-white grid place-items-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-ink/10">
          <span className={label}>Lien du produit chez le fournisseur</span>
          <div className="flex gap-2">
            <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://fr.aliexpress.com/item/… , CJ, Alibaba, boutique…" className={input} aria-label="Lien fournisseur" />
            <button type="button" onClick={doImport} disabled={importing || !link.trim()} className="shrink-0 inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-ink text-ivory text-sm font-semibold disabled:opacity-40">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Importer
            </button>
          </div>
          <p className="text-xs text-ink/50 mt-2">Le nom, les photos et le prix sont lus sur la page quand le site le permet. Sinon, remplissez la fiche à la main.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2"><span className={label}>Nom affiché *</span><input value={d.name} onChange={e => set('name', e.target.value)} required className={input} aria-label="Nom du produit" /></label>
          <label><span className={label}>Catégorie</span>
            <select value={d.category} onChange={e => set('category', e.target.value)} className={input} aria-label="Catégorie">
              {!marketCategoryOnSale(d.category) && d.category && <option value={d.category}>{d.category} (hors boutique)</option>}
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label><span className={label}>Délai min (j)</span><input type="number" min={1} value={d.delayMin} onChange={e => set('delayMin', Number(e.target.value))} className={input} aria-label="Délai minimum" /></label>
            <label><span className={label}>Délai max (j)</span><input type="number" min={1} value={d.delayMax} onChange={e => set('delayMax', Number(e.target.value))} className={input} aria-label="Délai maximum" /></label>
          </div>
          <label className="sm:col-span-2"><span className={label}>Photos (un lien par ligne) *</span>
            <textarea value={d.imagesText} onChange={e => set('imagesText', e.target.value)} rows={3} className={`${input} h-auto py-2`} aria-label="Photos" />
          </label>
          {images.length > 0 && (
            <div className="sm:col-span-2 flex gap-2 overflow-x-auto no-scrollbar">
              {images.map(u => <ProductImage key={u} src={u} alt="" label="" className="w-16 h-20 rounded-xl shrink-0" />)}
            </div>
          )}
          <label className="sm:col-span-2"><span className={label}>Description</span>
            <textarea value={d.description} onChange={e => set('description', e.target.value)} rows={4} className={`${input} h-auto py-2`} aria-label="Description" />
          </label>
        </div>

        <div>
          <span className={label}>Choix proposés à la cliente</span>
          <div className="space-y-2">
            {d.optionsText.map((o, i) => (
              <div key={i} className="grid grid-cols-[8rem_1fr_auto] gap-2">
                <input value={o.name} onChange={e => set('optionsText', d.optionsText.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Couleur" className={input} aria-label={`Nom du choix ${i + 1}`} />
                <input value={o.values} onChange={e => set('optionsText', d.optionsText.map((x, k) => (k === i ? { ...x, values: e.target.value } : x)))} placeholder="Noir, Rose, Blanc" className={input} aria-label={`Valeurs du choix ${i + 1}`} />
                <button type="button" onClick={() => set('optionsText', d.optionsText.filter((_, k) => k !== i))} aria-label="Retirer" className="w-11 h-11 grid place-items-center text-ink/40"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {d.optionsText.length < 3 && <button type="button" onClick={() => set('optionsText', [...d.optionsText, { name: '', values: '' }])} className="text-sm underline underline-offset-4">+ Ajouter un choix (taille, pointure…)</button>}
          </div>
        </div>

        {/* Fournisseur et prix */}
        <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-4">
          <p className="font-medium">Fournisseur & prix</p>
          <div className="grid sm:grid-cols-4 gap-3">
            <label className="sm:col-span-2"><span className={label}>Fournisseur</span><input value={d.supplier.name} onChange={e => setSup({ name: e.target.value })} placeholder="AliExpress, CJ…" className={input} aria-label="Nom du fournisseur" /></label>
            <label><span className={label}>Devise</span>
              <select value={d.supplier.currency} onChange={e => setSup({ currency: e.target.value as Currency })} className={input} aria-label="Devise">
                {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <span />
            <label><span className={label}>Prix fournisseur</span><input type="number" step="0.01" min={0} value={d.supplier.cost || ''} onChange={e => setSup({ cost: Number(e.target.value) })} className={input} aria-label="Coût fournisseur" /></label>
            <label><span className={label}>Frais de port</span><input type="number" step="0.01" min={0} value={d.supplier.shipping || ''} onChange={e => setSup({ shipping: Number(e.target.value) })} className={input} aria-label="Frais de port fournisseur" /></label>
            <div className="sm:col-span-2 p-3 rounded-xl bg-ivory text-sm">
              Coût : <strong>{formatPrice(cost)}</strong><br />
              Prix conseillé (+{settings.margin} %) : <strong>{formatPrice(suggestion)}</strong>
              {suggestion > 0 && d.price !== suggestion && <button type="button" onClick={() => set('price', suggestion)} className="ml-2 underline underline-offset-4 text-wine">utiliser</button>}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <label><span className={label}>Prix de vente (FCFA) *</span><input type="number" min={0} step={50} value={d.price || ''} onChange={e => set('price', Number(e.target.value))} required className={input} aria-label="Prix de vente" /></label>
            <label><span className={label}>Ancien prix (barré)</span><input type="number" min={0} step={50} value={d.oldPrice || ''} onChange={e => set('oldPrice', Number(e.target.value) || undefined)} className={input} aria-label="Ancien prix" /></label>
            <p className={`h-11 grid place-items-center rounded-xl font-semibold ${profit > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-wine'}`} data-testid="editor-profit">
              {d.price ? `Bénéfice : ${formatPrice(profit)}` : 'Bénéfice : —'}
            </p>
          </div>
          <label><span className={label}>Note interne</span><input value={d.supplier.note ?? ''} onChange={e => setSup({ note: e.target.value })} placeholder="Ex. choisir la livraison AliExpress Standard" className={input} aria-label="Note interne" /></label>
        </div>

        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={d.active} onChange={e => set('active', e.target.checked)} className="accent-ink w-4 h-4" /> En ligne sur le Marché</label>
        <button disabled={saving} className="w-full h-12 rounded-full bg-ink text-ivory font-semibold inline-flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} {d.id ? 'Enregistrer' : 'Ajouter au Marché'}
        </button>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Onglet « Le Marché »                                               */
/* ------------------------------------------------------------------ */
export const MarketTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { orders, notify, syncOrders } = useStore();
  const [data, setData] = useState<{ products: MarketProduct[]; settings: MarketSettings } | null>(null);
  const [offline, setOffline] = useState(false);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<MarketSettings | null>(null);

  const load = useCallback(() => fetchAdminMarket(pin).then(r => { if (r) { setData(r); setSettingsForm(r.settings); } else setOffline(true); }), [pin]);
  useEffect(() => { load(); fetchAdminOrders(pin).then(list => list && syncOrders(list)); }, [load, pin, syncOrders]);

  const marketOrders = useMemo(() => orders.filter(o => o.supplier && o.status !== 'annulee'), [orders]);
  const toOrder = marketOrders.filter(o => o.supplier!.status === 'a_commander');
  const profit = marketOrders.reduce((s, o) => s + marketRevenue(o) - (o.supplier!.cost ?? 0), 0);

  if (offline) return <p className="bg-white rounded-[2rem] p-10 text-center text-ink/60">Le Marché demande le serveur de la boutique (lancez <code>npm run server</code>).</p>;
  if (!data || !settingsForm) return <div className="h-40 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-ink/40" /></div>;
  const s = data.settings;

  const saved = () => { setEditing(null); refreshMarket(); load(); };
  const remove = async (p: MarketProduct) => {
    if (!window.confirm(`Retirer « ${p.name} » du Marché ?`)) return;
    const r = await deleteMarketProduct(p.id, pin);
    if (r.ok) { notify('Produit retiré', 'success'); saved(); } else notify(r.error, 'error');
  };
  const toggle = async (p: MarketProduct) => {
    const r = await saveMarketProduct({ ...p, active: !p.active }, pin);
    if (r.ok) saved(); else notify(r.error, 'error');
  };
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await saveMarketSettings(settingsForm, pin);
    if (r.ok) { notify('Réglages enregistrés', 'success'); setShowSettings(false); load(); } else notify(r.error, 'error');
  };

  return (
    <div className="space-y-6" data-testid="market-tab">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Produits en ligne', String(data.products.filter(p => p.active).length)],
          ['À commander chez les fournisseurs', String(toOrder.length)],
          ['Commandes du Marché', String(marketOrders.length)],
          ['Bénéfice estimé', formatPrice(profit)],
        ].map(([l, v]) => (
          <div key={l} className="p-5 rounded-[1.5rem] bg-white border border-ink/[0.06]"><p className="text-xs text-ink/55">{l}</p><p className="font-display text-3xl mt-1">{v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setEditing(emptyDraft(s))} className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-ink text-ivory text-sm font-semibold"><Plus className="w-4 h-4" /> Ajouter un produit</button>
        <button onClick={() => setShowSettings(v => !v)} className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-white border border-ink/10 text-sm"><Settings2 className="w-4 h-4" /> Marge & devises</button>
        <a href="/marche" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-white border border-ink/10 text-sm"><Globe2 className="w-4 h-4" /> Voir le Marché</a>
      </div>

      {showSettings && (
        <form onSubmit={saveSettings} className="p-5 rounded-[1.5rem] bg-white border border-ink/[0.06] grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end" data-testid="market-settings">
          <label><span className={label}>Marge %</span><input type="number" min={0} value={settingsForm.margin} onChange={e => setSettingsForm(f => f && { ...f, margin: Number(e.target.value) })} className={input} aria-label="Marge" /></label>
          {(['EUR', 'USD', 'CNY'] as const).map(c => (
            <label key={c}><span className={label}>1 {c} = FCFA</span><input type="number" step="0.001" min={0} value={settingsForm.rates[c]} onChange={e => setSettingsForm(f => f && { ...f, rates: { ...f.rates, [c]: Number(e.target.value) } })} className={input} aria-label={`Taux ${c}`} /></label>
          ))}
          <label><span className={label}>Arrondi</span>
            <select value={settingsForm.roundTo} onChange={e => setSettingsForm(f => f && { ...f, roundTo: Number(e.target.value) })} className={input} aria-label="Arrondi">
              {[50, 100, 250, 500, 1000].map(v => <option key={v} value={v}>{v} FCFA</option>)}
            </select>
          </label>
          <button className="h-11 rounded-xl bg-ink text-ivory text-sm font-semibold">Enregistrer</button>
          <p className="sm:col-span-3 lg:col-span-6 text-xs text-ink/50">Prix conseillé = (prix fournisseur + port) × taux × (1 + marge), arrondi au palier supérieur. L'euro a une parité fixe avec le FCFA (655,957).</p>
        </form>
      )}

      {toOrder.length > 0 && (
        <section>
          <h3 className="font-display text-2xl mb-3">À commander maintenant</h3>
          <div className="grid lg:grid-cols-2 gap-3">
            {toOrder.map(o => (
              <div key={o.id} className="space-y-2">
                <p className="text-sm"><strong>{o.id}</strong> · {o.customer.firstName} {o.customer.lastName} · payé {formatPrice(o.total)}</p>
                <SupplierPanel order={o} pin={pin} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-display text-2xl mb-3">Produits du Marché ({data.products.length})</h3>
        {data.products.length === 0 ? (
          <p className="bg-white rounded-[2rem] p-10 text-center text-ink/55">Aucun produit pour l'instant. Touchez « Ajouter un produit » et collez le lien d'un article trouvé chez un fournisseur.</p>
        ) : (
          <div className="bg-white border border-ink/[0.06] rounded-[1.5rem] overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left text-ink/50 border-b border-ink/10">
                <tr><th className="p-4 font-medium">Produit</th><th className="p-4 font-medium">Prix</th><th className="p-4 font-medium">Coût</th><th className="p-4 font-medium">Bénéfice</th><th className="p-4 font-medium">Délai</th><th className="p-4 font-medium">En ligne</th><th className="p-4" /></tr>
              </thead>
              <tbody>
                {data.products.map(p => {
                  const c = p.supplier ? costInXof(p.supplier.cost, p.supplier.shipping, p.supplier.currency, s) : 0;
                  return (
                    <tr key={p.id} className="border-b border-ink/5">
                      <td className="p-4"><span className="flex items-center gap-3"><ProductImage src={p.images[0]} alt="" label="" className="w-12 h-14 rounded-xl shrink-0" />
                        <span className="min-w-0"><strong className="block line-clamp-1">{p.name}</strong><span className="text-xs text-ink/50">{p.category}{p.supplier?.name && ` · ${p.supplier.name}`}</span>{!marketCategoryOnSale(p.category) && <span className="block text-xs text-amber-800">Masqué : catégorie pas en vente</span>}</span></span></td>
                      <td className="p-4 font-semibold">{formatPrice(p.price)}</td>
                      <td className="p-4 text-ink/60">{formatPrice(c)}</td>
                      <td className={`p-4 font-semibold ${p.price - c > 0 ? 'text-emerald-800' : 'text-wine'}`}>{formatPrice(p.price - c)}</td>
                      <td className="p-4 text-ink/60">{delayLabel(p.delayMin, p.delayMax)}</td>
                      <td className="p-4"><button onClick={() => toggle(p)} aria-label={p.active ? 'Mettre hors ligne' : 'Mettre en ligne'} className={`w-11 h-6 rounded-full relative transition-colors ${p.active ? 'bg-emerald-600' : 'bg-ink/20'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${p.active ? 'left-[22px]' : 'left-0.5'}`} /></button></td>
                      <td className="p-4 whitespace-nowrap text-right">
                        {p.supplier?.url && <a href={p.supplier.url} target="_blank" rel="noopener noreferrer" aria-label="Page fournisseur" className="inline-grid place-items-center w-9 h-9 rounded-full hover:bg-ink/5"><ExternalLink className="w-4 h-4" /></a>}
                        <button onClick={() => setEditing(toDraft(p))} aria-label={`Modifier ${p.name}`} className="w-9 h-9 rounded-full hover:bg-ink/5 inline-grid place-items-center"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(p)} aria-label={`Supprimer ${p.name}`} className="w-9 h-9 rounded-full hover:bg-ink/5 inline-grid place-items-center text-wine"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <ProductEditor initial={editing} settings={s} pin={pin} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
};
