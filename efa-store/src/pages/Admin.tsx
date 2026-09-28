import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Check, Film, Globe2, Download, Loader2, LogOut, Send, ShieldCheck, Users, MessageCircle, Package, Pencil, Plus, RotateCcw, Search, ShoppingCart, Trash2, Wallet, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, OCCASIONS } from '../data/catalog';
import type { CategoryId, OccasionId, Order, OrderStatus, Product } from '../data/types';
import { buildWhatsAppLink } from '../config/site';
import { formatDate, formatPrice, slugify } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { PAYMENT_LABELS, STATUS_LABELS } from '../components/OrderTimeline';
import { ProductImage } from '../components/ProductImage';
import { StatusTab } from './AdminStatus';
import { CustomersTab } from './AdminCustomers';
import { MAX_VIDEO_MB, adminLogin, clearStockAlerts, fetchAdminOrders, fetchCatalog, fetchStockAlerts, getServerStatus, notifyRestock, notifyStatus, patchAdminOrder, publishCatalog, removeCatalogProduct, saveCatalogProduct, uploadVideo, type ServerStatus } from '../services/api';
import { INITIAL_PRODUCTS } from '../data/catalog';
import type { StockAlert } from '../data/types';
import { DeliveryPanel } from './AdminDelivery';
import { MarketTab, SupplierPanel } from './AdminMarket';
import { AuthenticityTab } from './AdminAuthenticity';
import { restockLink, statusLink } from '../utils/whatsappMessages';
import { mediaUrl, normalizeVideoInput, staticMode } from '../utils/media';

const PIN_KEY = 'efa_admin_pin';
/** Code de démonstration, seulement pour la version sans serveur (WAMP) : ailleurs, le code est
 *  vérifié par le serveur (variable ADMIN_PIN) et n'apparaît nulle part dans le site. */
const DEMO_PIN = import.meta.env.VITE_ROUTER === 'hash' ? '2026' : '';
const adminPin = () => { try { return sessionStorage.getItem(PIN_KEY) ?? ''; } catch { return ''; } };

/** État du serveur (assistant IA, WhatsApp automatique) pour l'espace gérant. */
function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  useEffect(() => { getServerStatus().then(setStatus); }, []);
  return status;
}

const EVENT_LABELS: Record<string, string> = { nouvelle: 'Nouvelle commande', ...STATUS_LABELS };

const SESSION_KEY = 'efa_admin';
type Tab = 'dashboard' | 'orders' | 'products' | 'market' | 'customers' | 'status' | 'authenticity';

const STATUS_STYLES: Record<OrderStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-800',
  confirmee: 'bg-sky-100 text-sky-800',
  en_preparation: 'bg-violet-100 text-violet-800',
  expediee: 'bg-indigo-100 text-indigo-800',
  livree: 'bg-emerald-100 text-emerald-800',
  annulee: 'bg-red-100 text-red-800',
};

export const Admin: React.FC = () => {
  usePageTitle('Espace gérant');
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | false>(false);
  const [busy, setBusy] = useState(false);
  const enter = (credential: string) => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); sessionStorage.setItem(PIN_KEY, credential); } catch { /* ignore */ }
    setAuthed(true);
  };
  const login = async () => {
    setBusy(true);
    const r = await adminLogin(pin.trim());
    setBusy(false);
    if (r && 'token' in r) return enter(r.token);
    // Sans serveur (version WAMP) : code de démonstration vérifié sur place
    if (!r && DEMO_PIN) return pin.trim() === DEMO_PIN ? enter(pin.trim()) : setError('Code incorrect');
    setError(r ? r.error : 'Serveur injoignable : réessayez dans un instant');
  };
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 pt-24">
        <form onSubmit={e => { e.preventDefault(); if (!busy) login(); }} className="bg-white border border-ink/[0.06] rounded-[2rem] p-8 text-center">
          <h1 className="font-display text-3xl">Espace gérant</h1>
          <p className="text-sm text-ink/75 mt-2">Saisissez votre code PIN pour accéder à la gestion de la boutique.</p>
          <input value={pin} onChange={e => { setPin(e.target.value); setError(false); }} type="password" inputMode="numeric" placeholder="••••" aria-label="Code PIN"
            aria-invalid={!!error} className="field mt-6 !h-16 text-center !text-2xl tracking-[0.5em]" />
          {error && <p className="text-xs text-wine mt-2" role="alert">{error}</p>}
          <button className="btn-dark mt-5 w-full" disabled={busy || !pin.trim()}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Se connecter'}</button>
          {DEMO_PIN && <p className="text-xs text-ink/70 mt-4">Code de démonstration : {DEMO_PIN}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div><p className="eyebrow">EFA Store</p><h1 className="font-display text-4xl sm:text-5xl mt-2">Espace gérant</h1></div>
        <button onClick={() => { try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(PIN_KEY); } catch { /* ignore */ } setAuthed(false); }}
          className="inline-flex items-center gap-2 text-sm text-ink/75 hover:text-ink"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>
      <div className="sticky top-14 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 py-3 mb-6 bg-ivory/95 backdrop-blur flex gap-2 overflow-x-auto no-scrollbar border-b border-ink/[0.06]" role="navigation" aria-label="Rubriques">
        {([['dashboard', 'Tableau de bord', BarChart3], ['orders', 'Commandes', ShoppingCart], ['products', 'Produits', Package], ['market', 'Le Marché', Globe2], ['customers', 'Clientes', Users], ['status', 'Statut WhatsApp', Send], ['authenticity', 'Authenticité', ShieldCheck]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }} aria-current={tab === id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${tab === id ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/[0.07] hover:border-ink/25'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'dashboard' && <Dashboard onGoto={setTab} />}
      {tab === 'orders' && <Orders />}
      {tab === 'products' && <Products />}
      {tab === 'market' && <MarketTab pin={adminPin()} />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'status' && <StatusTab />}
      {tab === 'authenticity' && <AuthenticityTab pin={adminPin()} />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Tableau de bord                                                    */
/* ------------------------------------------------------------------ */

const Dashboard: React.FC<{ onGoto: (t: Tab) => void }> = ({ onGoto }) => {
  const { orders, products, stockAlerts: localAlerts, removeStockAlerts: removeLocalAlerts, notify } = useStore();
  const server = useServerStatus();
  const autoWhatsApp = !!(server?.whatsapp && server.adminApi);
  // Alertes laissées par les clientes sur leur téléphone (serveur) + celles de cet appareil
  const [serverAlerts, setServerAlerts] = useState<StockAlert[]>([]);
  useEffect(() => { fetchStockAlerts(adminPin()).then(a => a && setServerAlerts(a)); }, []);
  const stockAlerts = useMemo(() => {
    const all = [...serverAlerts, ...localAlerts];
    return all.filter((a, i) => all.findIndex(b => b.productId === a.productId && b.contact === a.contact) === i);
  }, [serverAlerts, localAlerts]);
  const removeStockAlerts = (id: string) => {
    removeLocalAlerts(id);
    setServerAlerts(list => list.filter(a => a.productId !== id));
    clearStockAlerts(id, adminPin());
  };
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const since = Date.now() - days * 864e5;
  const inPeriod = (o: Order, from: number, to: number) => { const t = new Date(o.createdAt).getTime(); return t >= from && t < to; };
  const valid = orders.filter(o => o.status !== 'annulee' && inPeriod(o, since, Infinity));
  const before = orders.filter(o => o.status !== 'annulee' && inPeriod(o, since - days * 864e5, since));
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const revenueBefore = before.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'en_attente').length;
  const toShip = orders.filter(o => o.status === 'confirmee' || o.status === 'en_preparation').length;
  const lowStock = products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);
  const top = useMemo(() => {
    const map = new Map<string, { name: string; image?: string; qty: number; value: number }>();
    valid.forEach(o => o.items.forEach(i => {
      const row = map.get(i.productId) ?? { name: i.name, image: i.image, qty: 0, value: 0 };
      row.qty += i.quantity; row.value += i.price * i.quantity; map.set(i.productId, row);
    }));
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [valid]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach(o => o.items.forEach(i => {
      const cat = products.find(p => p.id === i.productId)?.category ?? 'autre';
      map[cat] = (map[cat] ?? 0) + i.price * i.quantity;
    }));
    return CATEGORIES.map(c => ({ name: c.name, value: map[c.id] ?? 0 }));
  }, [valid, products]);
  const maxCat = Math.max(1, ...byCategory.map(c => c.value));

  const change = (now: number, prev: number) => (prev > 0 ? Math.round(((now - prev) / prev) * 100) : null);
  const kpis = [
    { label: 'Chiffre d\'affaires', value: formatPrice(revenue), Icon: Wallet, delta: change(revenue, revenueBefore) },
    { label: 'Commandes', value: String(valid.length), Icon: ShoppingCart, delta: change(valid.length, before.length) },
    { label: 'Panier moyen', value: formatPrice(valid.length ? revenue / valid.length : 0), Icon: BarChart3, delta: null },
    { label: 'À traiter', value: String(pending), Icon: AlertTriangle, delta: null, alert: pending > 0 },
  ];
  const todo = [
    pending > 0 && { label: `${pending} commande${pending > 1 ? 's' : ''} à confirmer`, tab: 'orders' as Tab, tone: 'bg-amber-100 text-amber-900' },
    toShip > 0 && { label: `${toShip} commande${toShip > 1 ? 's' : ''} à préparer ou livrer`, tab: 'orders' as Tab, tone: 'bg-sky-100 text-sky-900' },
    lowStock.length > 0 && { label: `${lowStock.length} pièce${lowStock.length > 1 ? 's' : ''} bientôt épuisée${lowStock.length > 1 ? 's' : ''}`, tab: 'products' as Tab, tone: 'bg-wine/10 text-wine' },
    stockAlerts.length > 0 && { label: `${stockAlerts.length} cliente${stockAlerts.length > 1 ? 's' : ''} à prévenir (retour en stock)`, tab: 'dashboard' as Tab, tone: 'bg-violet-100 text-violet-900' },
  ].filter(Boolean) as { label: string; tab: Tab; tone: string }[];
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Bonjour + période */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink/70 first-letter:uppercase">{today}</p>
          <h2 className="font-display text-3xl mt-1">Bonjour, voici votre boutique</h2>
        </div>
        <div className="inline-flex p-1 rounded-full bg-white border border-ink/[0.08]" role="group" aria-label="Période">
          {([7, 30, 90] as const).map(d => (
            <button key={d} onClick={() => setDays(d)} aria-pressed={days === d}
              className={`px-4 h-9 rounded-full text-xs font-semibold tabular-nums transition-colors ${days === d ? 'bg-ink text-ivory' : 'text-ink/70 hover:text-ink'}`}>{d} jours</button>
          ))}
        </div>
      </div>

      {/* À faire aujourd'hui + raccourcis */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-ink/70">À faire</h3>
          {todo.length === 0 ? <p className="mt-3 text-sm text-emerald-800 flex items-center gap-2"><Check className="w-4 h-4" /> Tout est à jour. Belle journée !</p> : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {todo.map(t => <li key={t.label}><button onClick={() => (t.tab === 'dashboard' ? document.getElementById('alertes')?.scrollIntoView({ behavior: 'smooth' }) : onGoto(t.tab))} className={`px-3.5 h-9 rounded-full text-xs font-semibold inline-flex items-center gap-2 ${t.tone}`}>{t.label} <ArrowRight className="w-3.5 h-3.5" /></button></li>)}
            </ul>
          )}
        </div>
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-ink/70">Raccourcis</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
            <button onClick={() => onGoto('products')} className="h-10 rounded-xl bg-ivory-deep/70 hover:bg-ivory-deep inline-flex items-center gap-2 px-3"><Plus className="w-4 h-4 text-gold-dark" /> Ajouter une pièce</button>
            <button onClick={() => onGoto('status')} className="h-10 rounded-xl bg-ivory-deep/70 hover:bg-ivory-deep inline-flex items-center gap-2 px-3"><Send className="w-4 h-4 text-gold-dark" /> Publier un statut</button>
            <button onClick={() => onGoto('authenticity')} className="h-10 rounded-xl bg-ivory-deep/70 hover:bg-ivory-deep inline-flex items-center gap-2 px-3"><ShieldCheck className="w-4 h-4 text-gold-dark" /> Imprimer des étiquettes</button>
            <button onClick={() => exportOrdersCsv(orders)} disabled={!orders.length} className="h-10 rounded-xl bg-ivory-deep/70 hover:bg-ivory-deep inline-flex items-center gap-2 px-3 disabled:opacity-40"><Download className="w-4 h-4 text-gold-dark" /> Exporter (Excel)</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, Icon, delta, alert }) => (
          <div key={label} className={`bg-white border rounded-[2rem] p-5 ${alert ? 'border-amber-300' : 'border-ink/[0.06]'}`}>
            <div className="flex items-center justify-between">
              <Icon className={`w-5 h-5 ${alert ? 'text-amber-700' : 'text-gold-dark'}`} />
              {delta !== null && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${delta >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`} title={`par rapport aux ${days} jours précédents`}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} %
                </span>
              )}
            </div>
            <p className="text-xs text-ink/70 mt-3">{label}</p>
            <p className="font-display text-2xl sm:text-3xl mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <SalesChart orders={valid} days={days} />
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <h2 className="font-display text-xl">Meilleures ventes</h2>
          <p className="text-xs text-ink/70 mt-1 mb-4">Sur les {days} derniers jours</p>
          {top.length === 0 ? <p className="text-sm text-ink/70">Pas encore de vente sur cette période.</p> : (
            <ol className="divide-y divide-ink/5" data-testid="top-sales">
              {top.map((t, i) => (
                <li key={t.name} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-xs text-ink/60 tabular-nums">{i + 1}</span>
                  <ProductImage src={t.image} alt="" label="" className="w-10 h-12 rounded-lg shrink-0" />
                  <span className="flex-1 min-w-0"><span className="block text-sm line-clamp-1">{t.name}</span><span className="text-xs text-ink/70">{t.qty} vendue{t.qty > 1 ? 's' : ''}</span></span>
                  <span className="text-sm font-medium tabular-nums">{formatPrice(t.value)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <h2 className="font-display text-xl mb-5">Ventes par catégorie</h2>
          <ul className="space-y-4">
            {byCategory.map(c => (
              <li key={c.name}>
                <div className="flex justify-between text-sm mb-1.5"><span>{c.name}</span><span className="font-medium">{formatPrice(c.value)}</span></div>
                <div className="h-2 rounded-full bg-ink/5"><div className="h-full rounded-full bg-gold" style={{ width: `${(c.value / maxCat) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
          {valid.length === 0 && <p className="text-sm text-ink/70 mt-4">Aucune vente pour le moment. Passez une commande test depuis la boutique.</p>}
        </div>
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-display text-xl">Stock faible</h2>
            <button onClick={() => onGoto('products')} className="text-sm underline underline-offset-4">Gérer</button>
          </div>
          {lowStock.length === 0 ? <p className="text-sm text-ink/70">Tous les stocks sont suffisants.</p> : (
            <ul className="divide-y divide-ink/5">
              {lowStock.slice(0, 6).map(p => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <ProductImage src={p.images[0]} alt={p.name} label="" className="w-10 h-12 rounded-lg" />
                  <span className="flex-1 text-sm line-clamp-1">{p.name}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{p.stock === 0 ? 'Épuisé' : `${p.stock} restants`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {stockAlerts.length > 0 && (
        <div id="alertes" className="bg-white border border-ink/[0.06] rounded-[2rem] p-6 scroll-mt-32">
          <h2 className="font-display text-xl">Alertes de retour en stock</h2>
          <p className="text-xs text-ink/70 mt-1 mb-4">Clientes à prévenir quand la pièce revient. Réapprovisionnez, contactez-les, puis marquez l'alerte comme traitée.</p>
          <ul className="divide-y divide-ink/5 text-sm">
            {[...new Set(stockAlerts.map(a => a.productId))].map(id => {
              const product = products.find(p => p.id === id);
              const contacts = stockAlerts.filter(a => a.productId === id).map(a => a.contact);
              return (
                <li key={id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex-1 min-w-[160px] font-medium">{product?.name ?? id} <span className="text-ink/70 font-normal">· stock {product?.stock ?? 0}</span></span>
                  <span className="text-xs text-ink/75 flex-[2] min-w-[200px]">{contacts.join(' · ')}</span>
                  {product && product.stock > 0 && (autoWhatsApp ? (
                    <button onClick={async () => {
                      const r = await notifyRestock(product, contacts, adminPin());
                      notify(r ? `${r.sent}/${r.total} cliente(s) prévenue(s) sur WhatsApp` : 'Envoi impossible, utilisez l\'envoi manuel', r ? 'success' : 'error');
                    }} className="text-xs px-3 py-1.5 rounded-full bg-[#177a41] text-white">Prévenir sur WhatsApp</button>
                  ) : contacts.map(c => {
                    const href = restockLink(product.name, product.slug, c);
                    return href && <a key={c} href={href} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-[#177a41] text-white">Prévenir {c}</a>;
                  }))}
                  <button onClick={() => removeStockAlerts(id)} className="text-xs px-3 py-1.5 rounded-full bg-ink/5 hover:bg-ink hover:text-ivory">Traitée ({contacts.length})</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {orders.length > 0 && (
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-xl">Dernières commandes</h2>
            <button onClick={() => onGoto('orders')} className="text-sm underline underline-offset-4">Tout voir</button>
          </div>
          <ul className="divide-y divide-ink/5 text-sm">
            {orders.slice(0, 5).map(o => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                <strong className="w-28">{o.id}</strong>
                <span className="flex-1">{o.customer.firstName} {o.customer.lastName}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                <span className="w-28 text-right font-medium">{formatPrice(o.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ServicesCard server={server} />
    </div>
  );
};

/** Graduation « ronde » de l'axe (1, 2 ou 5 × 10ⁿ). */
const niceMax = (v: number) => {
  if (v <= 0) return 10_000;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find(m => m * p >= v) ?? 10) * p;
};
const shortPrice = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(n));

/**
 * Ventes jour par jour sur la période : une colonne par jour (framboise), survol = date, montant et nombre de commandes.
 * Le tableau des mêmes chiffres est accessible juste en dessous.
 */
const SalesChart: React.FC<{ orders: Order[]; days: number }> = ({ orders, days }) => {
  const [hover, setHover] = useState<number | null>(null);
  const series = useMemo(() => {
    const key = (d: Date) => d.toLocaleDateString('fr-CA');
    const list = Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - i));
      return { key: key(d), date: d, value: 0, count: 0 };
    });
    const index = new Map(list.map((x, i) => [x.key, i]));
    orders.forEach(o => { const i = index.get(key(new Date(o.createdAt))); if (i !== undefined) { list[i].value += o.total; list[i].count += 1; } });
    return list;
  }, [orders, days]);
  const max = niceMax(Math.max(...series.map(s => s.value)));
  const ticks = [max, max / 2, 0];
  const label = (d: Date, long = false) => d.toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' });
  const every = days <= 7 ? 1 : days <= 30 ? 7 : 15;
  const h = hover !== null ? series[hover] : null;
  const total = series.reduce((s, x) => s + x.value, 0);
  return (
    <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6" data-testid="sales-chart">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">Ventes par jour</h2>
          <p className="text-xs text-ink/70 mt-1">Chiffre d'affaires des commandes, hors annulées · {days} jours</p>
        </div>
        <p className="font-display text-2xl tabular-nums">{formatPrice(total)}</p>
      </div>
      <div className="relative mt-6 pl-10 select-none">
        {/* grille et graduations */}
        <div className="absolute inset-y-0 left-0 right-0 bottom-6 pointer-events-none" aria-hidden>
          {ticks.map((t, i) => (
            <div key={t} className="absolute left-0 right-0 flex items-center" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
              <span className="w-10 -translate-y-1/2 pr-2 text-right text-[10px] text-ink/60 tabular-nums">{shortPrice(t)}</span>
              <span className="flex-1 h-px bg-ink/[0.07]" />
            </div>
          ))}
        </div>
        <div className="relative h-52 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img"
          aria-label={`Ventes par jour sur ${days} jours : ${formatPrice(total)} au total`}>
          {series.map((d, i) => (
            <button key={d.key} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`${label(d.date, true)} : ${formatPrice(d.value)}, ${d.count} commande${d.count > 1 ? 's' : ''}`}
              className="relative flex-1 h-full flex items-end justify-center group outline-none">
              <span className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${d.value ? (hover === i ? 'bg-[#8e2a4f]' : 'bg-wine') : 'bg-ink/[0.06]'}`}
                style={{ height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : '2px' }} />
            </button>
          ))}
          {h && (
            <div className="absolute z-10 -translate-x-1/2 px-3 py-2 rounded-xl bg-ink text-ivory text-xs whitespace-nowrap shadow-soft pointer-events-none" data-testid="chart-tooltip"
              style={{ left: `${Math.min(86, Math.max(14, ((hover! + 0.5) / series.length) * 100))}%`, bottom: `calc(${Math.min(78, (h.value / max) * 100)}% + 10px)` }} role="status">
              <span className="block text-ivory/70 first-letter:uppercase">{label(h.date, true)}</span>
              <span className="font-semibold tabular-nums">{formatPrice(h.value)}</span> · {h.count} commande{h.count > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex gap-[2px] h-6 items-end text-[10px] text-ink/60" aria-hidden>
          {series.map((d, i) => <span key={d.key} className="flex-1 text-center whitespace-nowrap overflow-visible">{i === series.length - 1 ? 'auj.' : i % every === 0 && series.length - 1 - i >= every / 2 ? label(d.date) : ''}</span>)}
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-ink/70 hover:text-ink">Voir le tableau des ventes</summary>
        <table className="mt-2 w-full tabular-nums">
          <thead><tr className="text-left text-ink/60"><th className="py-1 font-medium">Jour</th><th className="py-1 font-medium text-right">Commandes</th><th className="py-1 font-medium text-right">Montant</th></tr></thead>
          <tbody>{series.filter(d => d.count).reverse().map(d => <tr key={d.key} className="border-t border-ink/5"><td className="py-1">{label(d.date, true)}</td><td className="py-1 text-right">{d.count}</td><td className="py-1 text-right">{formatPrice(d.value)}</td></tr>)}</tbody>
        </table>
        {!series.some(d => d.count) && <p className="mt-2 text-ink/70">Aucune vente sur cette période.</p>}
      </details>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Commandes                                                          */
/* ------------------------------------------------------------------ */

/** Export CSV (séparateur « ; » pour Excel en français, BOM UTF-8 pour les accents). */
function exportOrdersCsv(orders: Order[]) {
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['Commande', 'Date', 'Client', 'Téléphone', 'Zone', 'Adresse', 'Articles', 'Sous-total', 'Réduction', 'Livraison', 'Cadeau', 'Total', 'Paiement', 'Payé', 'Statut'];
  const rows = orders.map(o => [
    o.id, new Date(o.createdAt).toLocaleString('fr-FR'), `${o.customer.firstName} ${o.customer.lastName}`, o.customer.phone, o.customer.zone, o.customer.address,
    o.items.map(i => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ''}`).join(' | '),
    o.subtotal, o.discount, o.deliveryFee, o.giftFee ?? 0, o.total, PAYMENT_LABELS[o.paymentMethod], o.paymentStatus === 'paye' ? 'oui' : 'non', STATUS_LABELS[o.status],
  ]);
  const csv = '\ufeff' + [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `commandes-efa-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const Orders: React.FC = () => {
  const { orders, updateOrderStatus, markOrderPaid, logNotification, notify, syncOrders } = useStore();
  const server = useServerStatus();
  const autoWhatsApp = !!(server?.whatsapp && server.adminApi);
  const serverOrders = !!(server?.orders && server.adminApi);
  const [lastChange, setLastChange] = useState<{ id: string; status: OrderStatus } | null>(null);

  // Commandes de toutes les clientes (enregistrées sur le serveur), actualisées toutes les 15 s
  const refresh = React.useCallback(() => { fetchAdminOrders(adminPin()).then(list => list && syncOrders(list)); }, [syncOrders]);
  useEffect(() => {
    if (!serverOrders) return;
    refresh();
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);
    return () => clearInterval(t);
  }, [serverOrders, refresh]);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    updateOrderStatus(order.id, status);
    setLastChange({ id: order.id, status });
    // Commande du serveur : il enregistre le statut et prévient la cliente lui-même
    if (serverOrders && order.delivery !== undefined) {
      const r = await patchAdminOrder(order.id, { status }, adminPin());
      if (r.ok) {
        syncOrders([{ ...r.data.order, delivery: order.delivery }]);
        refresh();
        if (r.data.sent && !r.data.sent.simulated) notify(r.data.sent.ok ? `${order.customer.firstName} a été prévenue sur WhatsApp` : 'Message WhatsApp non envoyé : utilisez l\'envoi manuel', r.data.sent.ok ? 'success' : 'error');
        return;
      }
    }
    if (!autoWhatsApp || status === 'en_attente') return;
    const r = await notifyStatus(order, status, adminPin());
    logNotification(order.id, { event: status, to: 'cliente', channel: r?.ok ? 'auto' : 'echec' });
    notify(r?.ok ? `${order.customer.firstName} a été prévenue sur WhatsApp` : 'Message WhatsApp non envoyé : utilisez l\'envoi manuel', r?.ok ? 'success' : 'error');
  };
  const [filter, setFilter] = useState<OrderStatus | ''>('');
  const [selected, setSelected] = useState<Order | null>(null);
  const list = filter ? orders.filter(o => o.status === filter) : orders;
  const current = selected ? orders.find(o => o.id === selected.id) ?? null : null;

  return (
    <div>
      <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
        <button onClick={() => exportOrdersCsv(list)} disabled={list.length === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap bg-gold text-white disabled:opacity-40">
          <Download className="w-4 h-4" /> Exporter (CSV)
        </button>
        <button onClick={() => setFilter('')} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${!filter ? 'bg-ink text-ivory' : 'bg-white'}`}>Toutes ({orders.length})</button>
        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === s ? 'bg-ink text-ivory' : 'bg-white'}`}>
            {STATUS_LABELS[s]} ({orders.filter(o => o.status === s).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="bg-white border border-ink/[0.06] rounded-[2rem] p-10 text-center text-ink/70">Aucune commande.</p>
      ) : (
        <div className="bg-white border border-ink/[0.06] overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-ink/70 border-b border-ink/10">
              <tr><th className="p-4 font-medium">Commande</th><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">Paiement</th><th className="p-4 font-medium">Statut</th><th className="p-4 font-medium text-right">Total</th></tr>
            </thead>
            <tbody>
              {list.map(o => (
                <tr key={o.id} onClick={() => setSelected(o)} className="border-b border-ink/5 hover:bg-ivory cursor-pointer">
                  <td className="p-4"><strong>{o.id}</strong><br /><span className="text-xs text-ink/70">{formatDate(o.createdAt)}</span></td>
                  <td className="p-4">{o.customer.firstName} {o.customer.lastName}<br /><span className="text-xs text-ink/70">{o.supplier && <span title="Article du Marché" className="text-wine">🌍 {o.supplier.status === 'a_commander' ? 'à commander · ' : ''}</span>}{o.customer.location && <span title="Point GPS">📍 </span>}{o.customer.zone}{o.delivery?.relay && <span title="Livraison en relais"> · 🔁</span>}{o.delivery?.state === 'en_route' && <span className="text-wine"> · 🛵 en route</span>}</span></td>
                  <td className="p-4">{PAYMENT_LABELS[o.paymentMethod]}<br /><span className={`text-xs ${o.paymentStatus === 'paye' ? 'text-emerald-700' : 'text-amber-700'}`}>{o.paymentStatus === 'paye' ? 'Payé' : 'En attente'}</span></td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                  <td className="p-4 text-right font-semibold">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {current && (
        <Modal title={`Commande ${current.id}`} onClose={() => setSelected(null)}>
          <div className="space-y-5 text-sm">
            <div className="p-4 rounded-2xl bg-ivory">
              <p className="font-semibold">{current.customer.firstName} {current.customer.lastName}</p>
              <p>{current.customer.phone}{current.customer.email && ` · ${current.customer.email}`}</p>
              <p className="text-ink/75">{[current.customer.address, current.customer.zone].filter(Boolean).join(', ')}</p>
              {current.customer.notes && <p className="mt-2 italic text-ink/75">« {current.customer.notes} »</p>}
              {current.giftFee > 0 && <p className="mt-2 text-gold-dark">🎁 Emballage cadeau{current.giftMessage && ` — « ${current.giftMessage} »`}</p>}
              <a href={buildWhatsAppLink(`Bonjour ${current.customer.firstName}, ici EFA Store concernant votre commande ${current.id}.`, current.customer.phone.replace(/\D/g, '').replace(/^(?!221)/, '221'))}
                target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-[#128C7E] font-semibold"><MessageCircle className="w-4 h-4" /> Contacter sur WhatsApp</a>
            </div>
            <ul className="divide-y divide-ink/5">
              {current.items.map(i => (
                <li key={i.key} className="flex justify-between py-2"><span>{i.name} <span className="text-ink/70">{[i.color, i.size].filter(Boolean).join(' / ')} × {i.quantity}</span>{i.preorder && <span className="ml-1 text-xs text-wine font-semibold">⏳ sur commande · {i.preorder.days} j</span>}{i.market && <span className="ml-1 text-xs text-wine font-semibold">🌍 Marché</span>}</span><span>{formatPrice(i.price * i.quantity)}</span></li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-base border-t border-ink/10 pt-3"><span>Total</span><span>{formatPrice(current.total)}</span></div>
            <label className="block">
              <span className="font-medium">Statut</span>
              <select value={current.status} onChange={e => changeStatus(current, e.target.value as OrderStatus)}
                className="field mt-1.5">
                {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            {(() => {
              // Envoi manuel proposé après un changement de statut quand l'envoi automatique n'a pas eu lieu
              const autoSent = current.notifications?.some(n => n.event === current.status && n.to === 'cliente' && n.channel === 'auto');
              const href = statusLink(current, current.status);
              if (!href || autoSent || (autoWhatsApp && lastChange?.id !== current.id)) return null;
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => logNotification(current.id, { event: current.status, to: 'cliente', channel: 'manuel' })}
                  className={`w-full py-3 rounded-full inline-flex items-center justify-center gap-2 font-semibold ${lastChange?.id === current.id ? 'bg-[#177a41] text-white animate-pulse' : 'border border-[#177a41] text-[#177a41]'}`}>
                  <MessageCircle className="w-4 h-4" /> Prévenir {current.customer.firstName} : « {STATUS_LABELS[current.status]} »
                </a>
              );
            })()}
            {current.paymentStatus !== 'paye' && (
              <button onClick={() => { markOrderPaid(current.id); if (current.delivery !== undefined) patchAdminOrder(current.id, { paymentStatus: 'paye' }, adminPin()); }} className="w-full py-3 rounded-full bg-emerald-700 text-white font-semibold">Marquer comme payée</button>
            )}
            {current.supplier && <SupplierPanel order={current} pin={adminPin()} />}
            <DeliveryPanel order={current} pin={adminPin()} onChanged={refresh} />
            {!!current.notifications?.length && (
              <div>
                <p className="font-medium mb-2">Messages WhatsApp</p>
                <ul className="space-y-1.5 text-xs">
                  {current.notifications.map((n, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <span>{EVENT_LABELS[n.event]} → {n.to === 'gerante' ? 'boutique' : 'cliente'}</span>
                      <span className={`px-2 py-0.5 rounded-full ${n.channel === 'auto' ? 'bg-emerald-100 text-emerald-800' : n.channel === 'manuel' ? 'bg-sky-100 text-sky-800' : 'bg-red-100 text-red-800'}`}>
                        {n.channel === 'auto' ? 'envoyé auto' : n.channel === 'manuel' ? 'ouvert manuellement' : 'échec'} · {new Date(n.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Produits                                                           */
/* ------------------------------------------------------------------ */

const emptyProduct = (): Product => ({
  id: `EFA-${Date.now().toString(36).toUpperCase()}`,
  slug: '', name: '', category: 'chaussures', subcategory: '', occasions: ['quotidien'], material: '', care: '', styleTip: '', price: 0, images: [''], colors: [], sizes: [],
  stock: 10, description: '', details: [], rating: 5, reviewCount: 0, isNew: true, createdAt: new Date().toISOString(),
});

const Products: React.FC = () => {
  const { products, saveProduct, deleteProduct, resetCatalog, notify, catalogLive, reloadCatalog } = useStore();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const list = products.filter(p => `${p.name} ${p.id} ${p.subcategory}`.toLowerCase().includes(q.toLowerCase()));
  const server = useServerStatus();
  const online = !!(server?.catalog && server.adminApi);

  // Première fois : le catalogue de cet appareil devient le catalogue en ligne, visible par toutes les clientes
  useEffect(() => {
    if (!online || catalogLive) return;
    fetchCatalog().then(async r => {
      if (!r || r.products !== null) return;
      const res = await publishCatalog(products, adminPin());
      if (res.ok) { await reloadCatalog(); notify('Catalogue publié : toutes vos clientes voient les mêmes pièces', 'success'); }
    });
  }, [online, catalogLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (p: Product) => {
    saveProduct(p);
    setEditing(null);
    if (!online) { notify('Produit enregistré sur cet appareil'); return; }
    const r = await saveCatalogProduct(p, adminPin());
    if (r.ok) { saveProduct(r.data.product); notify('Produit enregistré et visible par toutes vos clientes', 'success'); }
    else notify(`Non publié : ${r.error}`, 'error');
  };
  const remove = async (p: Product) => {
    deleteProduct(p.id);
    if (online) await removeCatalogProduct(p.id, adminPin());
    notify('Produit supprimé', 'info');
  };
  const reset = async () => {
    resetCatalog();
    if (online) { const r = await publishCatalog(INITIAL_PRODUCTS, adminPin()); if (r.ok) await reloadCatalog(); }
    notify('Catalogue restauré', 'info');
  };

  return (
    <div>
      <p className={`mb-4 text-sm px-4 py-3 rounded-2xl ${catalogLive ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} data-testid="catalog-status">
        {catalogLive ? '✓ Catalogue en ligne : chaque modification est visible tout de suite par toutes vos clientes.' : '⚠ Catalogue hors ligne : les modifications restent sur cet appareil (serveur de la boutique injoignable).'}
      </p>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-4 rounded-full bg-white">
          <Search className="w-4 h-4 text-ink/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" className="flex-1 py-3 outline-none bg-transparent text-sm" />
        </div>
        <button onClick={() => setEditing(emptyProduct())} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ink text-ivory text-sm font-semibold"><Plus className="w-4 h-4" /> Nouveau produit</button>
        <button onClick={() => { if (confirm('Restaurer le catalogue d\'origine ? Vos modifications de produits seront perdues.')) reset(); }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-sm"><RotateCcw className="w-4 h-4" /> Restaurer</button>
      </div>
      <div className="bg-white border border-ink/[0.06] overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="text-left text-ink/70 border-b border-ink/10">
            <tr><th className="p-4 font-medium">Produit</th><th className="p-4 font-medium">Catégorie</th><th className="p-4 font-medium">Prix</th><th className="p-4 font-medium">Stock</th><th className="p-4" /></tr>
          </thead>
          <tbody>
            {list.map(p => (
              <tr key={p.id} className="border-b border-ink/5">
                <td className="p-4"><div className="flex items-center gap-3"><ProductImage src={p.images[0]} alt={p.name} label="" className="w-10 h-12 rounded-lg shrink-0" /><div><p className="font-medium">{p.name}{p.video && <Film className="inline w-3.5 h-3.5 ml-1.5 -mt-0.5 text-gold-dark" aria-label="avec vidéo" />}</p><p className="text-xs text-ink/70">{p.id}</p></div></div></td>
                <td className="p-4">{CATEGORIES.find(c => c.id === p.category)?.name}<br /><span className="text-xs text-ink/70">{p.subcategory}</span></td>
                <td className="p-4">{formatPrice(p.price)}{p.oldPrice && <><br /><span className="text-xs text-ink/70 line-through">{formatPrice(p.oldPrice)}</span></>}</td>
                <td className="p-4"><span className={p.stock === 0 ? 'text-red-700 font-semibold' : p.stock <= 5 ? 'text-amber-700 font-semibold' : ''}>{p.stock}</span>
                  {p.preorderDays ? <span className="block text-xs text-wine">sur commande · {p.preorderDays} j</span> : null}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button onClick={() => setEditing(p)} aria-label="Modifier" className="p-2 rounded-full hover:bg-ink/5"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => { if (confirm(`Supprimer « ${p.name} » ?`)) remove(p); }}
                    aria-label="Supprimer" className="p-2 rounded-full hover:bg-red-50 text-red-700"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm product={editing} onClose={() => setEditing(null)}
          onSave={save} />
      )}
    </div>
  );
};

const ProductForm: React.FC<{ product: Product; onClose: () => void; onSave: (p: Product) => void }> = ({ product, onClose, onSave }) => {
  const [p, setP] = useState<Product>(product);
  const [imagesText, setImagesText] = useState(product.images.filter(Boolean).join('\n'));
  const [sizesText, setSizesText] = useState(product.sizes.join(', '));
  const [colorsText, setColorsText] = useState(product.colors.map(c => `${c.name}:${c.hex}`).join(', '));
  const [detailsText, setDetailsText] = useState(product.details.join('\n'));

  const field = 'field-sm mt-1';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.name.trim() || p.price <= 0) return;
    onSave({
      ...p,
      slug: p.slug || slugify(p.name),
      subcategory: p.subcategory || CATEGORIES.find(c => c.id === p.category)!.name,
      oldPrice: p.oldPrice && p.oldPrice > p.price ? p.oldPrice : undefined,
      images: imagesText.split('\n').map(s => s.trim()).filter(Boolean),
      sizes: sizesText.split(',').map(s => s.trim()).filter(Boolean),
      colors: colorsText.split(',').map(s => s.trim()).filter(Boolean).map(s => {
        const [name, hex] = s.split(':');
        return { name: name.trim(), hex: (hex ?? '#999999').trim() };
      }),
      details: detailsText.split('\n').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <Modal title={product.name ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm [&>label]:text-[10px] [&>label]:uppercase [&>label]:tracking-[0.2em] [&>label]:font-semibold [&>label]:text-ink/65">
        <label className="col-span-2">Nom *<input required value={p.name} onChange={e => setP({ ...p, name: e.target.value })} className={field} /></label>
        <label>Catégorie
          <select value={p.category} onChange={e => setP({ ...p, category: e.target.value as CategoryId })} className={field}>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Type<input value={p.subcategory} onChange={e => setP({ ...p, subcategory: e.target.value })} placeholder="Ex : Escarpins" className={field} /></label>
        <label>Prix (FCFA) *<input required type="number" min={1} value={p.price || ''} onChange={e => setP({ ...p, price: Number(e.target.value) })} className={field} /></label>
        <label>Ancien prix<input type="number" min={0} value={p.oldPrice ?? ''} onChange={e => setP({ ...p, oldPrice: e.target.value ? Number(e.target.value) : undefined })} className={field} /></label>
        <label>Stock<input type="number" min={0} value={p.stock} onChange={e => setP({ ...p, stock: Number(e.target.value) })} className={field} /></label>
        <label className="col-span-2 p-4 rounded-2xl border border-ink/10 bg-ivory/60">Si épuisé : vendre sur commande
          <span className="flex items-center gap-2 mt-1">
            <input type="number" min={0} max={90} value={p.preorderDays ?? 0} onChange={e => setP({ ...p, preorderDays: Number(e.target.value) || undefined })} className={`${field} !mt-0 w-24`} aria-label="Délai sur commande (jours)" />
            <span className="text-xs text-ink/75 normal-case tracking-normal font-normal">jours de délai (0 = non). La cliente peut commander et paie à la commande ; vous vous réapprovisionnez.</span>
          </span>
        </label>
        <fieldset className="col-span-2">
          <legend className="text-[10px] uppercase tracking-[0.2em] font-semibold text-ink/65 mb-1">Occasions</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {OCCASIONS.map(o => {
              const on = p.occasions.includes(o.id);
              return (
                <button type="button" key={o.id} aria-pressed={on}
                  onClick={() => setP({ ...p, occasions: on ? p.occasions.filter(x => x !== o.id) : [...p.occasions, o.id as OccasionId] })}
                  className={`px-3 py-1.5 rounded-full text-xs border ${on ? 'bg-ink text-ivory border-ink' : 'border-ink/15'}`}>{o.name}</button>
              );
            })}
          </div>
        </fieldset>
        <label className="col-span-2">Images (une URL par ligne)<textarea rows={2} value={imagesText} onChange={e => setImagesText(e.target.value)} className={field} /></label>
        <VideoField value={p.video} poster={imagesText.split('\n')[0]?.trim()} onChange={video => setP(prev => ({ ...prev, video }))} />
        <label className="col-span-2">Tailles (séparées par des virgules)<input value={sizesText} onChange={e => setSizesText(e.target.value)} placeholder="38, 39, 40 — vide si taille unique" className={field} /></label>
        <label className="col-span-2">Couleurs (nom:code, …)<input value={colorsText} onChange={e => setColorsText(e.target.value)} placeholder="Noir:#111111, Camel:#b5835a" className={field} /></label>
        <label className="col-span-2">Matière<input value={p.material} onChange={e => setP({ ...p, material: e.target.value })} placeholder="Ex : cuir grainé, doublure suédine" className={field} /></label>
        <label className="col-span-2">Entretien<input value={p.care} onChange={e => setP({ ...p, care: e.target.value })} className={field} /></label>
        <label className="col-span-2">Conseil de style<textarea rows={2} value={p.styleTip} onChange={e => setP({ ...p, styleTip: e.target.value })} placeholder="Comment le porter ?" className={field} /></label>
        <label className="col-span-2">Description<textarea rows={3} value={p.description} onChange={e => setP({ ...p, description: e.target.value })} className={field} /></label>
        <label className="col-span-2">Détails (un par ligne)<textarea rows={3} value={detailsText} onChange={e => setDetailsText(e.target.value)} className={field} /></label>
        <div className="col-span-2 flex gap-5">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!p.isNew} onChange={e => setP({ ...p, isNew: e.target.checked })} className="accent-ink" /> Nouveauté</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!p.isBestseller} onChange={e => setP({ ...p, isBestseller: e.target.checked })} className="accent-ink" /> Best-seller</label>
        </div>
        <div className="col-span-2 flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full border border-ink/20 font-semibold">Annuler</button>
          <button className="flex-1 py-3 rounded-full bg-ink text-ivory font-semibold">Enregistrer</button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Vidéo d'une pièce : filmée au téléphone, envoyée d'un toucher, avec l'avancement de l'envoi,
 * un aperçu et un avertissement si ce téléphone ou cet ordinateur ne sait pas la lire.
 */
const VideoField: React.FC<{ value?: string; poster?: string; onChange: (url?: string) => void }> = ({ value, poster, onChange }) => {
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [unplayable, setUnplayable] = useState(false);
  const [link, setLink] = useState('');
  const applyLink = () => {
    const url = normalizeVideoInput(link);
    if (!url) { setError('Écrivez le nom du fichier (ex. sandales.mp4) ou un lien qui commence par https://'); return; }
    setError(''); setUnplayable(false); setLink(''); onChange(url);
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(''); setUnplayable(false);
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Vidéo trop lourde (${Math.round(file.size / 1048576)} Mo, ${MAX_VIDEO_MB} Mo au maximum) : raccourcissez-la (10 à 20 secondes suffisent) ou envoyez-la en qualité réduite.`);
      return;
    }
    setPct(0);
    const r = await uploadVideo(file, adminPin(), setPct);
    setPct(null);
    if ('error' in r) setError(staticMode || /connexion/.test(r.error) ? 'Sans le serveur EFA, la vidéo ne peut pas être envoyée d\'ici. Copiez-la dans le dossier « videos » du site, puis écrivez son nom ci-dessous.' : r.error);
    else onChange(r.url);
  };

  return (
    <div className="col-span-2" data-testid="video-field">
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-ink/65">Vidéo <span className="text-ink/45">(facultatif)</span></p>
      {value ? (
        <div className="mt-1 flex items-center gap-4 p-3 rounded-2xl bg-ivory-deep/60">
          <video src={mediaUrl(value)} poster={poster || undefined} muted loop autoPlay playsInline onError={() => setUnplayable(true)}
            className="w-20 h-28 rounded-xl object-cover bg-ink/10 shrink-0" data-testid="video-preview" />
          <div className="text-xs text-ink/75 space-y-2">
            <p>Elle remplace la photo sur la carte de la pièce et passe en premier sur sa fiche : en boucle, sans le son.</p>
            <button type="button" onClick={() => { onChange(undefined); setUnplayable(false); }} className="inline-flex items-center gap-1.5 text-wine font-semibold">
              <Trash2 className="w-3.5 h-3.5" /> Retirer la vidéo
            </button>
          </div>
        </div>
      ) : (
        <label className={`mt-1 flex items-center justify-center gap-2 min-h-14 px-4 py-3 rounded-2xl border border-dashed border-ink/25 text-center cursor-pointer hover:border-ink transition-colors ${pct !== null ? 'pointer-events-none opacity-70' : ''}`}>
          <Film className="w-4 h-4 shrink-0" />
          {pct !== null ? <span>Envoi de la vidéo… {pct} %</span> : <span>Ajouter une vidéo <span className="text-ink/70">(MP4 ou MOV, {MAX_VIDEO_MB} Mo max.)</span></span>}
          <input type="file" accept="video/mp4,video/quicktime,video/webm,video/*" onChange={pick} className="sr-only" data-testid="video-input" />
        </label>
      )}
      {!value && (
        <div className="mt-2">
          <p className="text-xs text-ink/70">
            {staticMode
              ? <>Version sans serveur (WAMP) : copiez la vidéo dans le dossier <strong>efa\videos</strong>, puis écrivez son nom ici.</>
              : <>Ou une vidéo déjà en ligne : écrivez son lien (https://…), ou le nom d'un fichier du dossier « videos ».</>}
          </p>
          <div className="mt-1.5 flex gap-2">
            <input value={link} onChange={e => setLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
              placeholder="sandales.mp4 ou https://…" aria-label="Nom ou lien de la vidéo" className="field-sm flex-1 min-w-0" data-testid="video-link" />
            <button type="button" onClick={applyLink} className="px-4 rounded-xl bg-ink text-ivory text-xs font-semibold">Utiliser</button>
          </div>
        </div>
      )}
      {pct !== null && <div className="mt-2 h-1 rounded-full bg-ink/10 overflow-hidden"><div className="h-full bg-gold-dark transition-[width]" style={{ width: `${pct}%` }} /></div>}
      {error && <p role="alert" className="mt-2 text-xs text-wine">{error}</p>}
      {unplayable && (
        <p role="alert" className="mt-2 text-xs text-amber-800">
          Cet appareil ne sait pas lire cette vidéo : certaines clientes risquent de ne voir que la photo.
          Sur iPhone : Réglages › Appareil photo › Formats › « Le plus compatible », puis filmez à nouveau.
        </p>
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
    <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
    <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:border border-ink/[0.06] p-6 animate-fade-up" role="dialog" aria-label={title}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-2xl">{title}</h2>
        <button onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-ink/5"><X className="w-5 h-5" /></button>
      </div>
      {children}
    </div>
  </div>
);

/** Carte d'état : assistant IA et notifications WhatsApp. */
const ServicesCard: React.FC<{ server: ServerStatus | null }> = ({ server }) => {
  const rows = [
    { label: 'Assistante IA « Éfa »', on: !!server?.assistant, onText: 'Claude activé : réponses personnalisées', offText: 'Réponses rapides sans IA (ajoutez ANTHROPIC_API_KEY au serveur)' },
    { label: 'Alerte WhatsApp nouvelle commande', on: !!server?.ownerNotifications, onText: 'Vous recevez chaque commande sur WhatsApp', offText: 'Manuel : la cliente vous envoie son récapitulatif (configurez Twilio + OWNER_WHATSAPP)' },
    { label: 'Messages de suivi aux clientes', on: !!(server?.whatsapp && server.adminApi), onText: 'Envoyés automatiquement à chaque changement de statut', offText: 'En un clic depuis chaque commande (configurez Twilio + ADMIN_PIN)' },
  ];
  return (
    <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
      <h2 className="font-display text-xl mb-4">Assistante & WhatsApp</h2>
      <ul className="grid md:grid-cols-3 gap-3">
        {rows.map(r => (
          <li key={r.label} className={`p-4 rounded-2xl text-sm ${r.on ? 'bg-emerald-50' : 'bg-ivory-deep/60'}`}>
            <p className="font-semibold flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${r.on ? 'bg-emerald-500' : 'bg-gold'}`} />{r.label}</p>
            <p className="text-xs text-ink/75 mt-1.5">{server ? (r.on ? r.onText : r.offText) : 'Vérification…'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};
