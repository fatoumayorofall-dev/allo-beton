/**
 * ALLO BÉTON — Onglet Paramètres (admin e-commerce)
 *
 * 3 sous-sections :
 *   1. Paramètres boutique (TVA, livraison, mentions, etc.)
 *   2. Matrice de permissions (lecture seule)
 *   3. Journal d'audit
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, RefreshCw, ShieldCheck, FileText,
  Building2, Truck, CreditCard, Receipt, AlertCircle, CheckCircle, Info, Lock,
  Plus, Trash2, Edit, X, MapPin, Clock, Weight, Wrench, ShoppingCart
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ECOM = `${API}/ecommerce`;
const getToken = () => localStorage.getItem('auth_token') || '';
const hdrs = (json = true) => {
  const h: Record<string, string> = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

type SettingValue = any;
type SettingsMap = Record<string, { value: SettingValue; is_public: boolean; updated_at?: string; updated_by?: string }>;

type SubTab = 'general' | 'shipping' | 'permissions' | 'logs' | 'maintenance';

type ShippingZone = {
  id: string;
  name: string;
  regions: string[] | null;
  base_fee: number;
  per_ton_fee: number;
  free_threshold: number | null;
  eta_hours: number;
  max_weight_tons: number | null;
  sort_order: number;
  is_active: boolean;
};

export const SettingsTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('general');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-600" /> Paramètres
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configuration boutique, droits d'accès, journal d'audit
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {[
            { key: 'general' as SubTab,     label: 'Général',        icon: Building2 },
            { key: 'shipping' as SubTab,    label: 'Livraison',      icon: Truck },
            { key: 'permissions' as SubTab, label: 'Permissions',    icon: ShieldCheck },
            { key: 'logs' as SubTab,        label: 'Journal',        icon: FileText },
            { key: 'maintenance' as SubTab, label: 'Maintenance',    icon: Wrench },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                sub === key
                  ? 'border-orange-600 text-orange-700 bg-orange-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {sub === 'general' && <GeneralSettings />}
          {sub === 'shipping' && <ShippingZonesView />}
          {sub === 'permissions' && <PermissionsView />}
          {sub === 'logs' && <AdminLogsView />}
          {sub === 'maintenance' && <MaintenanceView />}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   1. PARAMÈTRES BOUTIQUE
   ═══════════════════════════════════════════════════════════════ */
const GeneralSettings: React.FC = () => {
  const [data, setData] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ECOM}/settings`, { headers: hdrs() });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setFlash({ type: 'err', msg: json.error || 'Erreur de chargement' });
    } catch (e: any) {
      setFlash({ type: 'err', msg: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const get = (key: string, fallback: any = '') => {
    if (key in dirty) return dirty[key];
    const v = data?.[key]?.value;
    if (v == null) return fallback;
    if (typeof v === 'object' && 'value' in v) return v.value;
    return v;
  };

  const set = (key: string, val: any) => {
    setDirty(d => ({ ...d, [key]: { value: val } }));
  };

  const save = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    setFlash(null);
    try {
      const res = await fetch(`${ECOM}/settings`, {
        method: 'PUT', headers: hdrs(), body: JSON.stringify(dirty)
      });
      const json = await res.json();
      if (json.success) {
        setFlash({ type: 'ok', msg: `${json.updated} paramètre(s) enregistré(s)` });
        setDirty({});
        load();
      } else {
        setFlash({ type: 'err', msg: json.error || 'Erreur' });
      }
    } catch (e: any) {
      setFlash({ type: 'err', msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Chargement…</div>;
  if (!data) return <div className="py-12 text-center text-red-500 text-sm">Impossible de charger les paramètres</div>;

  const section = (title: string, icon: React.ElementType, children: React.ReactNode) => {
    const Icon = icon;
    return (
      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-orange-600" /> {title}
        </h3>
        <div className="space-y-3">{children}</div>
      </div>
    );
  };

  const text = (key: string, label: string, placeholder?: string) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1 block">{label}</span>
      <input
        type="text"
        value={get(key) ?? ''}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none"
      />
    </label>
  );

  const number = (key: string, label: string, suffix?: string) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1 block">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={get(key, 0)}
          onChange={e => set(key, Number(e.target.value))}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none"
        />
        {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </div>
    </label>
  );

  const toggle = (key: string, label: string, hint?: string) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={!!get(key, false)}
        onChange={e => set(key, e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
      />
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
    </label>
  );

  return (
    <div className="space-y-4">
      {flash && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          flash.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {flash.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {flash.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {section('Société', Building2, <>
          {text('company_name', 'Nom de la société')}
          {text('company_ninea', 'NINEA')}
          {text('company_rccm', 'RCCM')}
          {text('company_address', 'Adresse')}
          {text('company_phone', 'Téléphone')}
          {text('company_email', 'Email contact')}
        </>)}

        {section('Fiscalité & devise', Receipt, <>
          {text('currency', 'Devise (code ISO)', 'XOF')}
          {number('vat_rate', 'Taux de TVA', '%')}
          {toggle('vat_included', 'Prix TTC (incluant TVA)', 'Désactivé = prix HT, TVA ajoutée')}
          {number('min_order_amount', 'Montant minimum de commande', 'FCFA')}
        </>)}

        {section('Livraison', Truck, <>
          {number('free_shipping_threshold', 'Seuil livraison gratuite', 'FCFA')}
          <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 text-blue-600" />
            Les zones de livraison se gèrent dans l'onglet dédié (à venir).
          </div>
        </>)}

        {section('Paiement', CreditCard, <>
          {text('payment_bank_name', 'Banque')}
          {text('payment_iban', 'IBAN (privé)')}
          <div className="text-xs text-gray-500">
            Méthodes activées : <span className="font-semibold">Wave, Orange Money, Free Money, Carte, Cash</span>
          </div>
        </>)}

        {section('Boutique', Settings, <>
          {toggle('shop_active', 'Boutique en ligne active', 'Décoche pour mode maintenance')}
          {text('maintenance_message', 'Message de maintenance')}
          {text('terms_url', 'URL CGV')}
          {text('privacy_url', 'URL Confidentialité')}
        </>)}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {Object.keys(dirty).length > 0
            ? <span className="text-orange-600 font-semibold">{Object.keys(dirty).length} modification(s) non enregistrée(s)</span>
            : 'Aucune modification'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setDirty({}); load(); }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Réinitialiser
          </button>
          <button
            onClick={save}
            disabled={saving || Object.keys(dirty).length === 0}
            className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-40 flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   2. MATRICE DE PERMISSIONS (read-only)
   ═══════════════════════════════════════════════════════════════ */
const PermissionsView: React.FC = () => {
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>> | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ECOM}/admin-logs/permissions`, { headers: hdrs() })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setMatrix(j.data.matrix);
          setRoles(Array.from(new Set(j.data.roles)));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Chargement…</div>;
  if (!matrix) return <div className="py-12 text-center text-red-500 text-sm">Erreur de chargement</div>;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex gap-2">
        <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold mb-0.5">Matrice de permissions (lecture seule)</div>
          <div className="text-xs">
            Source unique de vérité. Modification dans <code className="bg-white px-1 rounded">backend/config/permissions.js</code>.
            Le rôle <strong>admin</strong> a tous les droits par défaut.
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Ressource</th>
              <th className="px-3 py-2 text-left font-semibold">Action</th>
              {roles.map(r => (
                <th key={r} className="px-3 py-2 text-center font-semibold">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(matrix).flatMap(([resource, actions]) =>
              Object.entries(actions).map(([action, allowed], idx) => (
                <tr key={`${resource}-${action}`} className={idx === 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-100'}>
                  {idx === 0 ? (
                    <td className="px-3 py-2 font-bold text-gray-900" rowSpan={Object.keys(actions).length}>
                      {resource}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-gray-700">{action}</td>
                  {roles.map(r => (
                    <td key={r} className="px-3 py-2 text-center">
                      {r === 'admin' || (allowed as string[]).includes(r) ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 inline-block" />
                      ) : (
                        <span className="text-gray-300">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   3. JOURNAL D'AUDIT
   ═══════════════════════════════════════════════════════════════ */
type AdminLog = {
  id: string;
  admin_email: string | null;
  admin_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  created_at: string;
};

const AdminLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set('action', filterAction);
      if (filterResource) params.set('resourceType', filterResource);
      const res = await fetch(`${ECOM}/admin-logs?${params}`, { headers: hdrs() });
      const json = await res.json();
      if (json.success) setLogs(json.rows || []);
    } finally { setLoading(false); }
  }, [filterAction, filterResource]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Toutes actions</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="validate">validate</option>
        </select>
        <select
          value={filterResource}
          onChange={e => setFilterResource(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Toutes ressources</option>
          <option value="promotion">promotion</option>
          <option value="payment">payment</option>
          <option value="review">review</option>
          <option value="customer">customer</option>
          <option value="product">product</option>
          <option value="settings">settings</option>
        </select>
        <button onClick={load} className="ml-auto p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Chargement…</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          Aucune entrée dans le journal pour ces filtres
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Ressource</th>
                <th className="px-3 py-2 text-left">Détails</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900 font-semibold">{l.admin_email || '—'}</div>
                    <div className="text-xs text-gray-500">{l.admin_role}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                      l.action === 'delete' ? 'bg-red-50 text-red-700' :
                      l.action === 'create' ? 'bg-emerald-50 text-emerald-700' :
                      l.action === 'update' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{l.action}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{l.resource_type}</div>
                    {l.resource_id && <div className="text-xs text-gray-400 font-mono">{l.resource_id.slice(0, 8)}…</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                    {l.details ? JSON.stringify(l.details) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400 font-mono">{l.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   4. ZONES DE LIVRAISON
   ═══════════════════════════════════════════════════════════════ */
const EMPTY_ZONE: Partial<ShippingZone> = {
  name: '', regions: [], base_fee: 0, per_ton_fee: 0,
  free_threshold: null, eta_hours: 24, max_weight_tons: null,
  sort_order: 0, is_active: true,
};

const ShippingZonesView: React.FC = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<ShippingZone> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ECOM}/shipping-zones/admin`, { headers: hdrs() });
      const json = await res.json();
      if (json.success) setZones(json.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => Number(n).toLocaleString('fr-FR');

  const save = async () => {
    if (!editing?.name) return;
    setSaving(true); setFlash(null);
    try {
      const url = isNew
        ? `${ECOM}/shipping-zones/admin`
        : `${ECOM}/shipping-zones/admin/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method, headers: hdrs(),
        body: JSON.stringify({
          ...editing,
          regions: typeof editing.regions === 'string'
            ? (editing.regions as string).split(',').map(s => s.trim()).filter(Boolean)
            : editing.regions,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFlash({ type: 'ok', msg: isNew ? 'Zone créée' : 'Zone modifiée' });
        setEditing(null);
        load();
      } else {
        setFlash({ type: 'err', msg: json.error });
      }
    } catch (e: any) {
      setFlash({ type: 'err', msg: e.message });
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`Supprimer la zone "${name}" ?`)) return;
    try {
      await fetch(`${ECOM}/shipping-zones/admin/${id}`, { method: 'DELETE', headers: hdrs() });
      load();
    } catch { /* ignore */ }
  };

  const toggle = async (z: ShippingZone) => {
    await fetch(`${ECOM}/shipping-zones/admin/${z.id}`, {
      method: 'PUT', headers: hdrs(),
      body: JSON.stringify({ is_active: !z.is_active }),
    });
    load();
  };

  const field = (label: string, children: React.ReactNode) => (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  );

  const inp = (key: keyof ShippingZone, type = 'text', placeholder = '') => (
    <input
      type={type}
      value={(editing?.[key] ?? '') as string | number}
      onChange={e => setEditing(ed => ({
        ...ed,
        [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value,
      }))}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none"
    />
  );

  return (
    <div className="space-y-4">
      {flash && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          flash.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {flash.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {flash.msg}
        </div>
      )}

      {/* Formulaire édition */}
      {editing && (
        <div className="border border-orange-200 bg-orange-50/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{isNew ? 'Nouvelle zone' : 'Modifier la zone'}</h3>
            <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field('Nom de la zone *', inp('name', 'text', 'Ex: Dakar centre'))}
            {field('Délai de livraison (heures)', inp('eta_hours', 'number', '24'))}
            {field('Frais de base (FCFA)', inp('base_fee', 'number', '0'))}
            {field('Frais par tonne (FCFA/t)', inp('per_ton_fee', 'number', '0'))}
            {field('Seuil livraison gratuite (FCFA)', inp('free_threshold', 'number', 'laisser vide = jamais gratuit'))}
            {field('Poids max (tonnes)', inp('max_weight_tons', 'number', 'laisser vide = illimité'))}
            {field('Ordre d\'affichage', inp('sort_order', 'number', '0'))}
            {field('Régions couvertes (séparées par virgule)',
              <textarea
                rows={2}
                value={Array.isArray(editing.regions) ? editing.regions.join(', ') : (editing.regions ?? '')}
                onChange={e => setEditing(ed => ({ ...ed, regions: e.target.value as unknown as string[] }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-200 outline-none resize-none"
                placeholder="Plateau, Médina, Mermoz…"
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editing.is_active}
                onChange={e => setEditing(ed => ({ ...ed, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-orange-600"
              />
              <span className="text-sm font-semibold text-gray-800">Zone active</span>
            </label>
            <div className="ml-auto flex gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={save} disabled={saving || !editing.name}
                className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-40 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton nouveau */}
      {!editing && (
        <button
          onClick={() => { setEditing({ ...EMPTY_ZONE }); setIsNew(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700"
        >
          <Plus className="w-4 h-4" /> Nouvelle zone
        </button>
      )}

      {/* Tableau zones */}
      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Chargement…</div>
      ) : zones.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">Aucune zone configurée — cliquez sur "Nouvelle zone"</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Zone</th>
                <th className="px-3 py-2 text-left hidden md:table-cell">Régions</th>
                <th className="px-3 py-2 text-right">Base</th>
                <th className="px-3 py-2 text-right hidden sm:table-cell">/tonne</th>
                <th className="px-3 py-2 text-center hidden lg:table-cell">Délai</th>
                <th className="px-3 py-2 text-center">Statut</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(z => (
                <tr key={z.id} className={`border-t border-gray-100 hover:bg-gray-50/50 ${!z.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-semibold text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      {z.name}
                    </div>
                    {z.free_threshold != null && (
                      <div className="text-xs text-emerald-600">Gratuit dès {fmt(z.free_threshold)} FCFA</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 hidden md:table-cell max-w-xs">
                    {z.regions?.length ? z.regions.slice(0, 4).join(', ') + (z.regions.length > 4 ? '…' : '') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(z.base_fee)}</td>
                  <td className="px-3 py-2 text-right hidden sm:table-cell text-gray-600">{fmt(z.per_ton_fee)}</td>
                  <td className="px-3 py-2 text-center hidden lg:table-cell">
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <Clock className="w-3.5 h-3.5" /> {z.eta_hours}h
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => toggle(z)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        z.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {z.is_active ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing({ ...z }); setIsNew(false); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => del(z.id, z.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Simulateur de devis */}
      <QuoteSimulator zones={zones} />
    </div>
  );
};

/* Simulateur de frais de port (outil rapide) */
const QuoteSimulator: React.FC<{ zones: ShippingZone[] }> = ({ zones }) => {
  const [zoneId, setZoneId] = useState('');
  const [tons, setTons] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    if (!zoneId) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${ECOM}/shipping-zones/quote`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ zone_id: zoneId, weight_tons: Number(tons) || 0, order_amount: Number(amount) || 0 }),
      });
      const json = await res.json();
      setResult(json);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  if (zones.filter(z => z.is_active).length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4" /> Simulateur de frais de port
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select value={zoneId} onChange={e => { setZoneId(e.target.value); setResult(null); }}
          className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white">
          <option value="">Zone…</option>
          {zones.filter(z => z.is_active).map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <input type="number" value={tons} onChange={e => setTons(e.target.value)}
          placeholder="Poids (tonnes)"
          className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="Montant commande (FCFA)"
          className="px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white" />
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button onClick={calculate} disabled={!zoneId || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
          {loading ? 'Calcul…' : 'Calculer'}
        </button>
        {result?.success && (
          <div className="text-sm">
            {result.data.free_shipping
              ? <span className="text-emerald-700 font-bold">🎉 Livraison gratuite</span>
              : <span className="text-gray-900">
                  Frais : <strong>{Number(result.data.total_fee).toLocaleString('fr-FR')} FCFA</strong>
                  {' '}— Délai : <strong>{result.data.eta_hours}h</strong>
                </span>
            }
          </div>
        )}
        {result?.success === false && (
          <span className="text-red-600 text-sm">{result.error}</span>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   5. MAINTENANCE
   ═══════════════════════════════════════════════════════════════ */
const MaintenanceView: React.FC = () => {
  const [days, setDays] = useState(30);
  const [preview, setPreview] = useState<{
    total_carts: number; stale_anonymous: number;
    stale_items: number; empty_carts: number; days_threshold: number;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState<{ deleted_carts: number; deleted_items: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${ECOM}/admin-logs/maintenance/carts?days=${days}`, { headers: hdrs() });
      const j = await res.json();
      if (j.success) setPreview(j.data);
      else setError(j.error || 'Erreur');
    } catch (e: any) { setError(e.message); }
    finally { setPreviewLoading(false); }
  };

  const doPurge = async () => {
    if (!window.confirm(`Supprimer ${preview?.stale_anonymous ?? '?'} paniers anonymes + ${preview?.empty_carts ?? '?'} paniers vides ?`)) return;
    setPurging(true);
    setError(null);
    try {
      const res = await fetch(`${ECOM}/admin-logs/maintenance/carts?days=${days}`, { method: 'DELETE', headers: hdrs() });
      const j = await res.json();
      if (j.success) { setResult(j); setPreview(null); }
      else setError(j.error || 'Erreur');
    } catch (e: any) { setError(e.message); }
    finally { setPurging(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-1">
          <ShoppingCart className="w-4 h-4 text-orange-600" /> Purge des paniers abandonnés
        </h3>
        <p className="text-sm text-gray-500">
          Supprime les paniers anonymes inactifs et les paniers vides de plus de 7 jours.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Ancienneté (jours) :
        </label>
        <input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={e => { setDays(Number(e.target.value)); setPreview(null); setResult(null); }}
          className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
        />
        <button
          onClick={loadPreview}
          disabled={previewLoading}
          className="px-4 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
          Aperçu
        </button>
      </div>

      {preview && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-2">Résumé ({days} jours)</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total paniers en base', value: preview.total_carts },
              { label: 'Paniers anonymes inactifs', value: preview.stale_anonymous, warn: preview.stale_anonymous > 0 },
              { label: 'Articles concernés', value: preview.stale_items, warn: preview.stale_items > 0 },
              { label: 'Paniers vides (+7j)', value: preview.empty_carts, warn: preview.empty_carts > 0 },
            ].map(({ label, value, warn }) => (
              <div key={label} className={`rounded-lg p-3 border ${warn ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold ${warn ? 'text-orange-700' : 'text-gray-800'}`}>{value}</p>
              </div>
            ))}
          </div>
          {(preview.stale_anonymous > 0 || preview.empty_carts > 0) ? (
            <button
              onClick={doPurge}
              disabled={purging}
              className="mt-3 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {purging ? 'Suppression en cours…' : `Purger ${preview.stale_anonymous + preview.empty_carts} paniers`}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mt-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Aucun panier à purger.</span>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Purge effectuée</p>
            <p>{result.deleted_carts} panier(s) supprimé(s), {result.deleted_items} article(s) nettoyé(s).</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
