/**
 * ALLO BÉTON — Onglets admin e-commerce additionnels
 * Promotions, Clients, Avis, Paiements
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Star, CreditCard, Plus, Edit, Trash2, X, Save,
  Search, RefreshCw, CheckCircle, XCircle, Eye,
  Mail, Phone, Building2, Percent, Gift,
  ShieldCheck, Ban
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ECOM = `${API}/ecommerce`;
const getToken = () => localStorage.getItem('auth_token') || '';
const hdrs = (json = true) => {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const fmt = (n: number | string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(Number(n) || 0);

const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d?: string | null) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/* ════════════════════════════════════════════════════════════
   PROMOTIONS TAB
   ════════════════════════════════════════════════════════════ */
interface Promotion {
  id: string; code: string; description: string;
  discount_type: 'percent' | 'fixed' | 'free_shipping';
  discount_value: number; min_amount: number;
  max_uses: number | null; max_uses_per_customer: number | null;
  starts_at: string | null; ends_at: string | null;
  applies_to: 'all' | 'category' | 'product' | 'customer_type';
  target_ids: any; is_active: number; uses_count: number;
  created_at: string;
}

export const PromotionsTab: React.FC = () => {
  const [list, setList] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${ECOM}/promotions`, { headers: hdrs() });
      const d = await r.json();
      setList(d.data || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    await fetch(`${ECOM}/promotions/${id}`, { method: 'DELETE', headers: hdrs() });
    load();
  };

  const toggleActive = async (p: Promotion) => {
    await fetch(`${ECOM}/promotions/${p.id}`, {
      method: 'PUT', headers: hdrs(),
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    load();
  };

  const filtered = list.filter(p =>
    !search || p.code.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (p: Promotion) => p.ends_at && new Date(p.ends_at) < new Date();
  const isFuture = (p: Promotion) => p.starts_at && new Date(p.starts_at) > new Date();

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Codes promo & promotions</h2>
          <p className="text-sm text-gray-500 mt-1">{list.length} code{list.length > 1 ? 's' : ''} · {list.filter(p => p.is_active && !isExpired(p)).length} actif{list.filter(p => p.is_active && !isExpired(p)).length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un code..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 w-56" />
          </div>
          <button onClick={load}
            className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all">
            <Plus className="w-4 h-4" /> Nouveau code
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-gray-700 font-bold">Aucun code promo</p>
          <p className="text-gray-500 text-sm mt-1">Créez votre premier code pour offrir des réductions à vos clients</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl">
            <Plus className="w-4 h-4" /> Créer un code
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => {
            const expired = isExpired(p);
            const future = isFuture(p);
            const exhausted = p.max_uses != null && p.uses_count >= p.max_uses;
            const status = !p.is_active ? 'paused' : expired ? 'expired' : future ? 'upcoming' : exhausted ? 'exhausted' : 'active';
            const statusCfg: Record<string, { label: string; cls: string }> = {
              active:    { label: 'Actif',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              paused:    { label: 'En pause',  cls: 'bg-gray-100 text-gray-600 border-gray-200' },
              expired:   { label: 'Expiré',    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
              upcoming:  { label: 'À venir',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              exhausted: { label: 'Épuisé',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
            };
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="font-mono text-base font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">{p.code}</code>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusCfg[status].cls}`}>{statusCfg[status].label}</span>
                    </div>
                    {p.description && <p className="text-sm text-gray-600 truncate">{p.description}</p>}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  {p.discount_type === 'percent' && (
                    <><span className="text-2xl font-black text-orange-600">{p.discount_value}</span><Percent className="w-5 h-5 text-orange-600" /></>
                  )}
                  {p.discount_type === 'fixed' && (
                    <span className="text-2xl font-black text-orange-600">−{fmt(p.discount_value)}</span>
                  )}
                  {p.discount_type === 'free_shipping' && (
                    <span className="text-lg font-black text-emerald-600">Livraison offerte</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 mb-3">
                  {p.min_amount > 0 && <div>Min : <strong className="text-gray-700">{fmt(p.min_amount)}</strong></div>}
                  {p.max_uses && <div>Max : <strong className="text-gray-700">{p.uses_count}/{p.max_uses}</strong></div>}
                  {p.starts_at && <div>Du <strong className="text-gray-700">{fmtDate(p.starts_at)}</strong></div>}
                  {p.ends_at && <div>Au <strong className="text-gray-700">{fmtDate(p.ends_at)}</strong></div>}
                </div>

                <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                  <button onClick={() => toggleActive(p)}
                    className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 inline-flex items-center justify-center gap-1">
                    {p.is_active ? <><Ban className="w-3 h-3" /> Pause</> : <><CheckCircle className="w-3 h-3" /> Activer</>}
                  </button>
                  <button onClick={() => { setEditing(p); setShowForm(true); }}
                    className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 inline-flex items-center justify-center gap-1">
                    <Edit className="w-3 h-3" /> Modifier
                  </button>
                  <button onClick={() => remove(p.id)}
                    className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PromotionForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

const PromotionForm: React.FC<{ editing: Promotion | null; onClose: () => void; onSaved: () => void }> = ({ editing, onClose, onSaved }) => {
  const [form, setForm] = useState({
    code: editing?.code || '',
    description: editing?.description || '',
    discount_type: editing?.discount_type || 'percent',
    discount_value: editing?.discount_value || 10,
    min_amount: editing?.min_amount || 0,
    max_uses: editing?.max_uses ?? '',
    max_uses_per_customer: editing?.max_uses_per_customer ?? '',
    starts_at: editing?.starts_at ? editing.starts_at.slice(0, 10) : '',
    ends_at: editing?.ends_at ? editing.ends_at.slice(0, 10) : '',
    applies_to: editing?.applies_to || 'all',
    is_active: editing ? !!editing.is_active : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        min_amount: Number(form.min_amount) || 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_customer: form.max_uses_per_customer ? Number(form.max_uses_per_customer) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      };
      const url = editing ? `${ECOM}/promotions/${editing.id}` : `${ECOM}/promotions`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: hdrs(), body: JSON.stringify(payload) });
      const d = await r.json();
      if (!d.success) { setError(d.error || 'Erreur'); setSaving(false); return; }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Modifier le code' : 'Nouveau code promo'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Code *</label>
              <input value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="BIENVENUE10"
                required maxLength={40}
                className="w-full font-mono uppercase border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Description</label>
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex : 10 % offerts pour les nouveaux clients"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Type *</label>
              <select value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
                <option value="free_shipping">Livraison gratuite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Valeur *</label>
              <input type="number" min={0}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                disabled={form.discount_type === 'free_shipping'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm disabled:bg-gray-50" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Montant minimum panier</label>
              <input type="number" min={0}
                value={form.min_amount}
                onChange={e => setForm(f => ({ ...f, min_amount: Number(e.target.value) }))}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">S'applique à</label>
              <select value={form.applies_to}
                onChange={e => setForm(f => ({ ...f, applies_to: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white">
                <option value="all">Tous les produits</option>
                <option value="category">Catégorie spécifique</option>
                <option value="product">Produit spécifique</option>
                <option value="customer_type">Type de client</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Date de début</label>
              <input type="date" value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Date d'expiration</label>
              <input type="date" value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Utilisations max</label>
              <input type="number" min={0}
                value={form.max_uses as any}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value as any }))}
                placeholder="Illimité"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Max par client</label>
              <input type="number" min={0}
                value={form.max_uses_per_customer as any}
                onChange={e => setForm(f => ({ ...f, max_uses_per_customer: e.target.value as any }))}
                placeholder="Illimité"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-orange-600" />
                <span className="text-sm text-gray-700">Code actif</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   CUSTOMERS TAB
   ════════════════════════════════════════════════════════════ */
export const CustomersTab: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      const r = await fetch(`${ECOM}/customers/admin/list?${params}`, { headers: hdrs() });
      const d = await r.json();
      setList(d.data?.customers || d.data || []);
      setTotal(d.data?.total || 0);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [page, search, type]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients e-commerce</h2>
          <p className="text-sm text-gray-500 mt-1">{total || list.length} client{(total || list.length) > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Email, nom, téléphone..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500/20" />
          </div>
          <select value={type}
            onChange={e => { setType(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Tous types</option>
            <option value="particulier">Particulier</option>
            <option value="professionnel">Professionnel</option>
            <option value="entreprise">Entreprise</option>
          </select>
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Inscrit le</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Chargement…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun client</p>
                </td></tr>
              ) : list.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center font-bold text-orange-600 text-xs">
                        {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{c.first_name} {c.last_name}</div>
                        {c.company_name && <div className="text-[11px] text-gray-500">{c.company_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    <div className="text-xs"><Mail className="inline w-3 h-3 mr-1" />{c.email}</div>
                    {c.phone && <div className="text-xs mt-0.5"><Phone className="inline w-3 h-3 mr-1" />{c.phone}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      c.customer_type === 'entreprise' ? 'bg-violet-50 text-violet-700' :
                      c.customer_type === 'professionnel' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {c.customer_type === 'entreprise' ? <><Building2 className="w-3 h-3" />Entreprise</> :
                       c.customer_type === 'professionnel' ? 'Pro' : 'Particulier'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
                  <td className="px-5 py-3">
                    {c.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3" />Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                        <Ban className="w-3 h-3" />Suspendu
                      </span>
                    )}
                    {c.email_verified_at && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700">
                        <ShieldCheck className="w-2.5 h-2.5" />Vérifié
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => setDetail(c)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>Page {page} / {Math.ceil(total / 20)}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Préc.</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Suiv.</button>
            </div>
          </div>
        )}
      </div>

      {detail && <CustomerDetailModal customer={detail} onClose={() => setDetail(null)} onUpdated={load} />}
    </div>
  );
};

const CustomerDetailModal: React.FC<{ customer: any; onClose: () => void; onUpdated: () => void }> = ({ customer, onClose, onUpdated }) => {
  const [full, setFull] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ECOM}/customers/admin/${customer.id}`, { headers: hdrs() })
      .then(r => r.json()).then(d => setFull(d.data || customer))
      .finally(() => setLoading(false));
  }, [customer.id]);

  const toggleActive = async () => {
    await fetch(`${ECOM}/customers/admin/${customer.id}`, {
      method: 'PUT', headers: hdrs(),
      body: JSON.stringify({ is_active: !customer.is_active })
    });
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{customer.first_name} {customer.last_name}</h3>
            <p className="text-xs text-gray-500">{customer.email || customer.phone || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Chargement…</div>
          ) : full ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Commandes', value: full.stats?.total_orders || 0 },
                  { label: 'Total dépensé', value: fmt(full.stats?.total_spent || 0) },
                  { label: 'Panier moyen', value: fmt(full.stats?.avg_order || 0) },
                  { label: 'Dernière cmd', value: fmtDate(full.stats?.last_order_date) },
                ].map((s, i) => (
                  <div key={i} className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-100 rounded-xl p-3">
                    <div className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">{s.label}</div>
                    <div className="text-lg font-black text-gray-900 mt-1">{s.value}</div>
                  </div>
                ))}
              </div>

              {full.recent_orders?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Commandes récentes</h4>
                  <div className="border border-gray-200 rounded-xl divide-y">
                    {full.recent_orders.slice(0, 5).map((o: any) => (
                      <div key={o.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <div className="font-semibold">#{o.order_number}</div>
                          <div className="text-xs text-gray-500">{fmtDate(o.created_at)}</div>
                        </div>
                        <div className="font-bold">{fmt(o.total)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}

          <div className="flex gap-2 pt-4 border-t">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
              Fermer
            </button>
            <button onClick={toggleActive}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                customer.is_active
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}>
              {customer.is_active ? <><Ban className="w-4 h-4" />Suspendre</> : <><CheckCircle className="w-4 h-4" />Réactiver</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   REVIEWS TAB
   ════════════════════════════════════════════════════════════ */
export const ReviewsTab: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const r = await fetch(`${ECOM}/reviews/admin/all${params}`, { headers: hdrs() });
      const d = await r.json();
      setList(d.data || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  const moderate = async (id: string, status: string) => {
    await fetch(`${ECOM}/reviews/admin/${id}`, {
      method: 'PATCH', headers: hdrs(), body: JSON.stringify({ status })
    });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    await fetch(`${ECOM}/reviews/admin/${id}`, { method: 'DELETE', headers: hdrs() });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Modération des avis</h2>
          <p className="text-sm text-gray-500 mt-1">{list.length} avis dans la vue actuelle</p>
        </div>
        <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {([
          { v: 'pending', label: 'En attente', cls: 'bg-amber-100 text-amber-800', activeCls: 'bg-amber-500 text-white' },
          { v: 'approved', label: 'Approuvés', cls: 'bg-emerald-100 text-emerald-800', activeCls: 'bg-emerald-600 text-white' },
          { v: 'rejected', label: 'Rejetés', cls: 'bg-rose-100 text-rose-800', activeCls: 'bg-rose-600 text-white' },
          { v: 'all', label: 'Tous', cls: 'bg-gray-100 text-gray-700', activeCls: 'bg-gray-700 text-white' },
        ] as const).map(opt => (
          <button key={opt.v} onClick={() => setStatusFilter(opt.v)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              statusFilter === opt.v ? opt.activeCls : opt.cls + ' hover:opacity-80'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Star className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700 font-bold">Aucun avis {statusFilter !== 'all' ? statusFilter : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(r => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-gray-900">{r.customer_name || 'Anonyme'}</div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                      r.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>{r.status}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3">
                    <span>{r.product_name || r.product_id}</span>
                    <span>•</span>
                    <span>{fmtDateTime(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= (r.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
              </div>
              {r.title && <div className="font-semibold text-gray-900 text-sm mb-1">{r.title}</div>}
              <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">{r.comment}</p>
              <div className="flex gap-2">
                {r.status !== 'approved' && (
                  <button onClick={() => moderate(r.id, 'approved')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />Approuver
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button onClick={() => moderate(r.id, 'rejected')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                    <XCircle className="w-3 h-3" />Rejeter
                  </button>
                )}
                {r.status !== 'pending' && (
                  <button onClick={() => moderate(r.id, 'pending')}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200">
                    Remettre en attente
                  </button>
                )}
                <button onClick={() => remove(r.id)}
                  className="ml-auto px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   PAYMENTS TAB
   ════════════════════════════════════════════════════════════ */
export const PaymentsTab: React.FC = () => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (methodFilter) params.set('method', methodFilter);
      const r = await fetch(`${ECOM}/payments/admin/list?${params}`, { headers: hdrs() });
      const d = await r.json();
      setList(d.data?.payments || d.data || []);
      setTotal(d.data?.total || 0);
    } catch { setList([]); }
    finally { setLoading(false); }
  }, [page, statusFilter, methodFilter]);
  useEffect(() => { load(); }, [load]);

  const validate = async (id: string, status: string) => {
    await fetch(`${ECOM}/payments/${id}/validate`, {
      method: 'PUT', headers: hdrs(),
      body: JSON.stringify({ status })
    });
    load();
  };

  const totals = list.reduce(
    (acc, p) => {
      const a = Number(p.amount) || 0;
      acc.total += a;
      if (p.status === 'completed' || p.status === 'success') acc.success += a;
      if (p.status === 'pending') acc.pending += a;
      return acc;
    },
    { total: 0, success: 0, pending: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paiements</h2>
          <p className="text-sm text-gray-500 mt-1">{total || list.length} transaction{(total || list.length) > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="completed">Réussi</option>
            <option value="failed">Échoué</option>
            <option value="refunded">Remboursé</option>
          </select>
          <select value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">Toutes méthodes</option>
            <option value="wave">Wave</option>
            <option value="orange_money">Orange Money</option>
            <option value="free_money">Free Money</option>
            <option value="card">Carte</option>
            <option value="cash">Espèces</option>
          </select>
          <button onClick={load} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'Total volume', value: fmt(totals.total), bg: 'from-indigo-50 to-violet-50', clr: 'text-indigo-600' },
          { label: 'Encaissé', value: fmt(totals.success), bg: 'from-emerald-50 to-teal-50', clr: 'text-emerald-600' },
          { label: 'En attente', value: fmt(totals.pending), bg: 'from-amber-50 to-orange-50', clr: 'text-amber-600' },
        ].map((k, i) => (
          <div key={i} className={`bg-gradient-to-br ${k.bg} border border-gray-200 rounded-2xl p-4`}>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{k.label}</div>
            <div className={`text-xl font-black mt-1 ${k.clr}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Référence</th>
                <th className="px-5 py-3">Commande</th>
                <th className="px-5 py-3">Méthode</th>
                <th className="px-5 py-3">Montant</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Chargement…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center">
                  <CreditCard className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Aucun paiement</p>
                </td></tr>
              ) : list.map(p => {
                const statusCls: Record<string, string> = {
                  completed: 'bg-emerald-50 text-emerald-700',
                  success: 'bg-emerald-50 text-emerald-700',
                  pending: 'bg-amber-50 text-amber-700',
                  failed: 'bg-rose-50 text-rose-700',
                  refunded: 'bg-gray-100 text-gray-700',
                };
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{p.transaction_ref || p.id?.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-xs">
                      <div className="font-semibold">#{p.order_number || '—'}</div>
                      <div className="text-[10px] text-gray-500">{p.customer_email}</div>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <span className="font-semibold capitalize">{(p.method || '').replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">{fmt(p.amount)}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{fmtDateTime(p.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusCls[p.status] || 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.status === 'pending' && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => validate(p.id, 'completed')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />Valider
                          </button>
                          <button onClick={() => validate(p.id, 'failed')}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700">
                            Rejeter
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > 20 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div>Page {page} / {Math.ceil(total / 20)}</div>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Préc.</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Suiv.</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
