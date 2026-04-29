/**
 * ALLO BÉTON — ADMIN : ONGLET LIVRAISON
 * - Gestion des livreurs (CRUD)
 * - Assignation livreur aux commandes
 * - Changement de statut (avec notif WhatsApp)
 * - Copie du lien de tracking client
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, Edit, Trash2, Phone, Star, MapPin, Copy,
  CheckCircle, Clock, Package, Navigation, Link, RefreshCw,
  X, Save, AlertCircle, ExternalLink, UserCheck,
} from 'lucide-react';

const BACKEND = import.meta.env.VITE_API_URL || '';
const FRONTEND = 'https://allobeton.sn';

function getAuthHeader() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiCall(method: string, path: string, body?: object) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:          { label: 'En attente',      color: 'bg-gray-100 text-gray-600' },
  confirmed:        { label: 'Confirmée',        color: 'bg-blue-100 text-blue-700' },
  processing:       { label: 'En préparation',   color: 'bg-orange-100 text-orange-700' },
  ready_for_pickup: { label: 'Prête',            color: 'bg-yellow-100 text-yellow-700' },
  in_transit:       { label: 'En route 🚚',      color: 'bg-indigo-100 text-indigo-700' },
  delivered:        { label: 'Livrée ✅',         color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Annulée',          color: 'bg-red-100 text-red-700' },
  completed:        { label: 'Terminée',         color: 'bg-gray-100 text-gray-500' },
};

const NEXT_STATUSES: Record<string, string[]> = {
  confirmed:        ['processing', 'cancelled'],
  processing:       ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['in_transit', 'cancelled'],
  in_transit:       ['delivered', 'cancelled'],
};

// ─── TYPE ────────────────────────────────────────────────────────
interface Driver {
  id: string; name: string; phone: string; email?: string;
  vehicle_type: string; vehicle_plate?: string; vehicle_label?: string;
  avatar_url?: string; tracking_token: string;
  is_active: number; is_available: number;
  rating: number; total_deliveries: number;
  current_lat?: number; current_lng?: number; last_position_at?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export const DeliveryTab: React.FC = () => {
  const [view, setView] = useState<'orders' | 'drivers'>('orders');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setView('orders')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${view === 'orders' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            🚚 Commandes
          </button>
          <button onClick={() => setView('drivers')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${view === 'drivers' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            👤 Livreurs
          </button>
        </div>
      </div>

      {view === 'orders'  && <OrdersDeliveryView />}
      {view === 'drivers' && <DriversView />}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VUE COMMANDES
// ═══════════════════════════════════════════════════════════════
const OrdersDeliveryView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<any | null>(null);
  const [statusModal, setStatusModal] = useState<any | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ordRes, drvRes] = await Promise.all([
      apiCall('GET', '/api/ecommerce/orders/admin/list?limit=50&status=confirmed,processing,ready_for_pickup,in_transit,delivered'),
      apiCall('GET', '/api/ecommerce/admin/drivers'),
    ]);
    setOrders(ordRes.data?.orders || ordRes.orders || []);
    setDrivers(drvRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${FRONTEND}/track/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Commandes à gérer</h2>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
      </div>

      {orders.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune commande active</p>
        </div>
      )}

      <div className="grid gap-4">
        {orders.map(order => {
          const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
          const assignedDriver = drivers.find(d => d.id === order.driver_id);
          const nextSt = NEXT_STATUSES[order.status] || [];

          return (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-gray-900">#{order.order_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                    {order.tracking_token && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 font-medium flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> Tracking actif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.billing_first_name} {order.billing_last_name}
                    {order.billing_phone && <> · <a href={`tel:${order.billing_phone}`} className="text-orange-600 hover:underline">{order.billing_phone}</a></>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {order.shipping_address || order.billing_address}, {order.shipping_city || order.billing_city}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-600">{new Intl.NumberFormat('fr-FR').format(order.total)} F</p>
                  <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Livreur assigné */}
              {assignedDriver && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-orange-50 rounded-xl border border-orange-100">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-800">{assignedDriver.name}</span>
                  <span className="text-xs text-orange-600">{assignedDriver.vehicle_label || assignedDriver.vehicle_type}</span>
                  {assignedDriver.last_position_at && (
                    <span className="ml-auto text-xs text-orange-400">
                      GPS {new Date(assignedDriver.last_position_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Assigner livreur */}
                {drivers.length > 0 && (
                  <button onClick={() => setAssignModal(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition-colors">
                    <UserCheck className="w-3.5 h-3.5" />
                    {assignedDriver ? 'Changer livreur' : 'Assigner livreur'}
                  </button>
                )}

                {/* Changer statut */}
                {nextSt.length > 0 && (
                  <button onClick={() => setStatusModal(order)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Statut
                  </button>
                )}

                {/* Lien tracking */}
                {order.tracking_token && (
                  <>
                    <button onClick={() => copyLink(order.tracking_token)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors">
                      {copied === order.tracking_token ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === order.tracking_token ? 'Copié !' : 'Copier lien client'}
                    </button>
                    <a href={`${FRONTEND}/track/${order.tracking_token}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Voir tracking
                    </a>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal assignation livreur */}
      {assignModal && (
        <AssignModal
          order={assignModal}
          drivers={drivers}
          onClose={() => setAssignModal(null)}
          onDone={() => { setAssignModal(null); load(); }}
        />
      )}

      {/* Modal changement de statut */}
      {statusModal && (
        <StatusModal
          order={statusModal}
          onClose={() => setStatusModal(null)}
          onDone={() => { setStatusModal(null); load(); }}
        />
      )}
    </div>
  );
};

// ─── MODAL ASSIGNATION ────────────────────────────────────────
const AssignModal: React.FC<{ order: any; drivers: Driver[]; onClose: () => void; onDone: () => void }> = ({ order, drivers, onClose, onDone }) => {
  const [selectedDriver, setSelectedDriver] = useState(order.driver_id || '');
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedDriver) { setError('Sélectionnez un livreur'); return; }
    setLoading(true);
    const res = await apiCall('PUT', `/api/ecommerce/admin/orders/${order.id}/assign`, {
      driver_id: selectedDriver,
      estimated_delivery_at: eta || undefined,
    });
    setLoading(false);
    if (res.success) {
      onDone();
    } else {
      setError(res.error || 'Erreur lors de l\'assignation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900">Assigner un livreur</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Commande <strong>#{order.order_number}</strong> · {order.shipping_address}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Livreur</label>
            <div className="space-y-2">
              {drivers.filter(d => d.is_active).map(d => (
                <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedDriver === d.id ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" name="driver" value={d.id} checked={selectedDriver === d.id} onChange={() => setSelectedDriver(d.id)} className="hidden" />
                  <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.vehicle_label || d.vehicle_type} · {d.vehicle_plate}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-gray-600">{d.rating?.toFixed(1)}</span>
                  </div>
                  {!d.is_available && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Occupé</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Heure de livraison estimée (optionnel)</label>
            <input type="datetime-local" value={eta} onChange={e => setEta(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>

          {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
            <button onClick={handleAssign} disabled={loading}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Assigner + Notifier client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MODAL STATUT ─────────────────────────────────────────────
const StatusModal: React.FC<{ order: any; onClose: () => void; onDone: () => void }> = ({ order, onClose, onDone }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const nextStatuses = NEXT_STATUSES[order.status] || [];

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    setLoading(true);
    const res = await apiCall('PUT', `/api/ecommerce/admin/orders/${order.id}/tracking-status`, { status: selectedStatus, note });
    setLoading(false);
    if (res.success) onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-900">Changer le statut</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Commande <strong>#{order.order_number}</strong></p>

        <div className="space-y-2 mb-4">
          {nextStatuses.map(s => {
            const info = STATUS_LABELS[s];
            return (
              <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedStatus === s ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="radio" name="status" value={s} checked={selectedStatus === s} onChange={() => setSelectedStatus(s)} className="hidden" />
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${info?.color}`}>{info?.label || s}</span>
              </label>
            );
          })}
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-700 block mb-1">Note (optionnel)</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Le livreur est en route..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 text-sm transition-colors">Annuler</button>
          <button onClick={handleUpdate} disabled={!selectedStatus || loading}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Confirmer + Notifier
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// VUE LIVREURS (CRUD)
// ═══════════════════════════════════════════════════════════════
const DriversView: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiCall('GET', '/api/ecommerce/admin/drivers');
    setDrivers(res.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteDriver = async (id: string) => {
    if (!window.confirm('Supprimer ce livreur ?')) return;
    await apiCall('DELETE', `/api/ecommerce/admin/drivers/${id}`);
    load();
  };

  const copyDriverLink = (token: string) => {
    navigator.clipboard.writeText(`${FRONTEND}/driver/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Livreurs ({drivers.length})</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nouveau livreur
        </button>
      </div>

      {drivers.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Truck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun livreur enregistré</p>
          <button onClick={() => setShowForm(true)} className="mt-4 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors">
            Ajouter un livreur
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {drivers.map(d => (
          <div key={d.id} className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${d.is_active ? 'border-gray-100 hover:shadow-md' : 'border-gray-100 opacity-60'}`}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {d.avatar_url ? <img src={d.avatar_url} alt={d.name} className="w-full h-full object-cover" /> : <Truck className="w-6 h-6 text-orange-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 truncate">{d.name}</p>
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full ${d.is_active && d.is_available ? 'bg-green-500' : d.is_active ? 'bg-yellow-500' : 'bg-gray-300'}`} />
                </div>
                <p className="text-xs text-gray-500">{d.vehicle_label || d.vehicle_type} · {d.vehicle_plate}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold text-gray-600">{parseFloat(String(d.rating)).toFixed(1)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{d.total_deliveries} livraisons</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setEditing(d); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={() => deleteDriver(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>

            {d.last_position_at && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                <Navigation className="w-3 h-3 text-green-500" />
                GPS reçu à {new Date(d.last_position_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                {d.current_lat && <span className="ml-1 font-mono text-[10px]">({d.current_lat?.toFixed(4)}, {d.current_lng?.toFixed(4)})</span>}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <a href={`tel:${d.phone}`} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg transition-colors">
                <Phone className="w-3 h-3" /> Appeler
              </a>
              <button onClick={() => copyDriverLink(d.tracking_token)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors">
                {copied === d.tracking_token ? <CheckCircle className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                {copied === d.tracking_token ? 'Copié !' : 'Lien GPS'}
              </button>
              <a href={`${FRONTEND}/driver/${d.tracking_token}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition-colors">
                <ExternalLink className="w-3 h-3" /> Ouvrir
              </a>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <DriverFormModal
          driver={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onDone={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

// ─── FORMULAIRE LIVREUR ────────────────────────────────────────
const VEHICLE_TYPES = ['camion', 'fourgon', 'moto', 'voiture'];

const DriverFormModal: React.FC<{ driver: Driver | null; onClose: () => void; onDone: () => void }> = ({ driver, onClose, onDone }) => {
  const [form, setForm] = useState({
    name: driver?.name || '',
    phone: driver?.phone || '',
    email: driver?.email || '',
    vehicle_type: driver?.vehicle_type || 'camion',
    vehicle_plate: driver?.vehicle_plate || '',
    vehicle_label: driver?.vehicle_label || '',
    avatar_url: driver?.avatar_url || '',
    is_active: driver ? String(driver.is_active) : '1',
    is_available: driver ? String(driver.is_available) : '1',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.phone) { setError('Nom et téléphone obligatoires'); return; }
    setLoading(true);
    const payload = { ...form, is_active: Number(form.is_active), is_available: Number(form.is_available) };
    const res = driver
      ? await apiCall('PUT', `/api/ecommerce/admin/drivers/${driver.id}`, payload)
      : await apiCall('POST', '/api/ecommerce/admin/drivers', payload);
    setLoading(false);
    if (res.success) onDone();
    else setError(res.error || 'Erreur');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-900">{driver ? 'Modifier le livreur' : 'Nouveau livreur'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-3">
          {[
            { key: 'name', label: 'Nom complet *', placeholder: 'Mamadou Diallo' },
            { key: 'phone', label: 'Téléphone *', placeholder: '77 123 45 67' },
            { key: 'email', label: 'Email', placeholder: 'livreur@example.com' },
            { key: 'vehicle_plate', label: 'Plaque d\'immatriculation', placeholder: 'DK 1234 AB' },
            { key: 'vehicle_label', label: 'Libellé véhicule', placeholder: 'Camion benne 5T' },
            { key: 'avatar_url', label: 'URL photo', placeholder: 'https://...' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-bold text-gray-700 block mb-1">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
          ))}

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Type de véhicule</label>
            <select value={form.vehicle_type} onChange={e => set('vehicle_type', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
              {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active === '1'} onChange={e => set('is_active', e.target.checked ? '1' : '0')} className="rounded" />
              <span className="text-sm font-medium text-gray-700">Actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_available === '1'} onChange={e => set('is_available', e.target.checked ? '1' : '0')} className="rounded" />
              <span className="text-sm font-medium text-gray-700">Disponible</span>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {driver ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
};
