import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Globe2, Download, LogOut, Send, Users, MessageCircle, Package, Pencil, Plus, RotateCcw, Search, ShoppingCart, Trash2, Wallet, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CATEGORIES, OCCASIONS } from '../data/catalog';
import type { CategoryId, OccasionId, Order, OrderStatus, Product } from '../data/types';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { formatDate, formatPrice, slugify } from '../utils/format';
import { usePageTitle } from '../utils/usePageTitle';
import { PAYMENT_LABELS, STATUS_LABELS } from '../components/OrderTimeline';
import { ProductImage } from '../components/ProductImage';
import { StatusTab } from './AdminStatus';
import { CustomersTab } from './AdminCustomers';
import { clearStockAlerts, fetchAdminOrders, fetchCatalog, fetchStockAlerts, getServerStatus, notifyRestock, notifyStatus, patchAdminOrder, publishCatalog, removeCatalogProduct, saveCatalogProduct, type ServerStatus } from '../services/api';
import { INITIAL_PRODUCTS } from '../data/catalog';
import type { StockAlert } from '../data/types';
import { DeliveryPanel } from './AdminDelivery';
import { MarketTab, SupplierPanel } from './AdminMarket';
import { restockLink, statusLink } from '../utils/whatsappMessages';

const PIN_KEY = 'fabima_admin_pin';
const adminPin = () => { try { return sessionStorage.getItem(PIN_KEY) ?? ''; } catch { return ''; } };

/** État du serveur (assistant IA, WhatsApp automatique) pour l'espace gérant. */
function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  useEffect(() => { getServerStatus().then(setStatus); }, []);
  return status;
}

const EVENT_LABELS: Record<string, string> = { nouvelle: 'Nouvelle commande', ...STATUS_LABELS };

const SESSION_KEY = 'fabima_admin';

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
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'products' | 'market' | 'customers' | 'status'>('dashboard');

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-4 pt-24">
        <form onSubmit={e => {
          e.preventDefault();
          if (pin === SITE_CONFIG.adminPin) { try { sessionStorage.setItem(SESSION_KEY, '1'); sessionStorage.setItem(PIN_KEY, pin); } catch { /* ignore */ } setAuthed(true); } else setError(true);
        }} className="bg-white border border-ink/[0.06] rounded-[2rem] p-8 text-center">
          <h1 className="font-display text-3xl">Espace gérant</h1>
          <p className="text-sm text-ink/75 mt-2">Saisissez votre code PIN pour accéder à la gestion de la boutique.</p>
          <input value={pin} onChange={e => { setPin(e.target.value); setError(false); }} type="password" inputMode="numeric" placeholder="••••" aria-label="Code PIN"
            className={`mt-6 w-full text-center tracking-[0.5em] text-2xl px-4 py-3 rounded-xl border outline-none ${error ? 'border-wine' : 'border-ink/15 focus:border-ink'}`} />
          {error && <p className="text-xs text-wine mt-2">Code incorrect</p>}
          <button className="mt-5 w-full py-3.5 rounded-full bg-ink text-ivory font-semibold">Se connecter</button>
          <p className="text-xs text-ink/70 mt-4">Code de démonstration : {SITE_CONFIG.adminPin}</p>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><p className="eyebrow">Fabima Store</p><h1 className="font-display text-5xl mt-2">Espace gérant</h1></div>
        <button onClick={() => { try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(PIN_KEY); } catch { /* ignore */ } setAuthed(false); }}
          className="inline-flex items-center gap-2 text-sm text-ink/75 hover:text-ink"><LogOut className="w-4 h-4" /> Déconnexion</button>
      </div>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {([['dashboard', 'Tableau de bord', BarChart3], ['orders', 'Commandes', ShoppingCart], ['products', 'Produits', Package], ['market', 'Le Marché', Globe2], ['customers', 'Clientes', Users], ['status', 'Statut WhatsApp', Send]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap ${tab === id ? 'bg-ink text-ivory' : 'bg-white hover:bg-ink/5'}`}>
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
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Tableau de bord                                                    */
/* ------------------------------------------------------------------ */

const Dashboard: React.FC<{ onGoto: (t: 'orders' | 'products') => void }> = ({ onGoto }) => {
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
  const valid = orders.filter(o => o.status !== 'annulee');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter(o => o.status === 'en_attente').length;
  const lowStock = products.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    valid.forEach(o => o.items.forEach(i => {
      const cat = products.find(p => p.id === i.productId)?.category ?? 'autre';
      map[cat] = (map[cat] ?? 0) + i.price * i.quantity;
    }));
    return CATEGORIES.map(c => ({ name: c.name, value: map[c.id] ?? 0 }));
  }, [valid, products]);
  const maxCat = Math.max(1, ...byCategory.map(c => c.value));

  const kpis = [
    { label: 'Chiffre d\'affaires', value: formatPrice(revenue), Icon: Wallet },
    { label: 'Commandes', value: String(valid.length), Icon: ShoppingCart },
    { label: 'Panier moyen', value: formatPrice(valid.length ? revenue / valid.length : 0), Icon: BarChart3 },
    { label: 'À traiter', value: String(pending), Icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <ServicesCard server={server} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white border border-ink/[0.06] rounded-[2rem] p-5">
            <Icon className="w-5 h-5 text-gold-dark" />
            <p className="text-xs text-ink/70 mt-3">{label}</p>
            <p className="font-display text-2xl sm:text-3xl mt-1">{value}</p>
          </div>
        ))}
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
        <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
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
                    }} className="text-xs px-3 py-1.5 rounded-full bg-[#1f8f4e] text-white">Prévenir sur WhatsApp</button>
                  ) : contacts.map(c => {
                    const href = restockLink(product.name, product.slug, c);
                    return href && <a key={c} href={href} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full bg-[#1f8f4e] text-white">Prévenir {c}</a>;
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
  a.download = `commandes-fabima-${new Date().toISOString().slice(0, 10)}.csv`;
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
              <a href={buildWhatsAppLink(`Bonjour ${current.customer.firstName}, ici Fabima Store concernant votre commande ${current.id}.`, current.customer.phone.replace(/\D/g, '').replace(/^(?!221)/, '221'))}
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
                className="mt-1.5 w-full px-4 py-3 rounded-xl border border-ink/15 outline-none focus:border-ink">
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
                  className={`w-full py-3 rounded-full inline-flex items-center justify-center gap-2 font-semibold ${lastChange?.id === current.id ? 'bg-[#1f8f4e] text-white animate-pulse' : 'border border-[#1f8f4e] text-[#1f8f4e]'}`}>
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
  id: `FAB-${Date.now().toString(36).toUpperCase()}`,
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
                <td className="p-4"><div className="flex items-center gap-3"><ProductImage src={p.images[0]} alt={p.name} label="" className="w-10 h-12 rounded-lg shrink-0" /><div><p className="font-medium">{p.name}</p><p className="text-xs text-ink/70">{p.id}</p></div></div></td>
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

  const field = 'mt-1 w-full px-3.5 py-2.5 rounded-xl border border-ink/15 outline-none focus:border-ink text-sm';

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
      <form onSubmit={submit} className="grid grid-cols-2 gap-4 text-sm">
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
        <label className="col-span-2 p-3 rounded-2xl bg-blush/30">Si épuisé : vendre sur commande
          <span className="flex items-center gap-2 mt-1">
            <input type="number" min={0} max={90} value={p.preorderDays ?? 0} onChange={e => setP({ ...p, preorderDays: Number(e.target.value) || undefined })} className={`${field} !mt-0 w-24`} aria-label="Délai sur commande (jours)" />
            <span className="text-xs text-ink/75">jours de délai (0 = non). La cliente peut commander et paie à la commande ; vous vous réapprovisionnez.</span>
          </span>
        </label>
        <fieldset className="col-span-2">
          <legend>Occasions</legend>
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
    { label: 'Assistante IA « Fabi »', on: !!server?.assistant, onText: 'Claude activé : réponses personnalisées', offText: 'Réponses rapides sans IA (ajoutez ANTHROPIC_API_KEY au serveur)' },
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
