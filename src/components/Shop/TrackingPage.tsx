/**
 * ALLO BÉTON — PAGE TRACKING LIVRAISON (Yango-like)
 * Map Leaflet + timeline + ETA + infos livreur
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck, Package, CheckCircle, Clock, MapPin,
  Phone, Star, RefreshCw, AlertCircle,
  Navigation, Home,
} from 'lucide-react';

// Fix Leaflet default icons (Vite/webpack issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const BACKEND = import.meta.env.VITE_API_URL || '';

const STATUSES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending:          { label: 'En attente',     icon: <Clock className="w-4 h-4" />,        color: 'text-gray-400' },
  confirmed:        { label: 'Confirmée',       icon: <CheckCircle className="w-4 h-4" />,  color: 'text-blue-500' },
  processing:       { label: 'En préparation',  icon: <Package className="w-4 h-4" />,      color: 'text-orange-500' },
  ready_for_pickup: { label: 'Prête à expédier',icon: <Package className="w-4 h-4" />,      color: 'text-yellow-500' },
  in_transit:       { label: 'En route 🚚',     icon: <Truck className="w-4 h-4" />,        color: 'text-indigo-500' },
  delivered:        { label: 'Livrée ✅',        icon: <CheckCircle className="w-4 h-4" />,  color: 'text-green-600' },
  cancelled:        { label: 'Annulée',          icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-500' },
};

const TIMELINE = ['confirmed', 'processing', 'ready_for_pickup', 'in_transit', 'delivered'];

function formatPrice(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';
}

function formatETA(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)} sec`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

// Recenter the map automatically when driver moves
function AutoCenter({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  const firstFit = useRef(false);
  useEffect(() => {
    if (!pos) return;
    if (!firstFit.current) { map.setView(pos, 14, { animate: true }); firstFit.current = true; }
    else { map.panTo(pos, { animate: true, duration: 1 }); }
  }, [pos, map]);
  return null;
}

interface TrackingData {
  order: any;
  driver: any;
  history: any[];
  items: any[];
  timeline: string[];
}

interface Props {
  token: string;
  onBack?: () => void;
}

export const TrackingPage: React.FC<Props> = ({ token, onBack }) => {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/ecommerce/tracking/${token}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Commande introuvable'); return; }
      setData(json.data);
      setLastRefresh(new Date());
      setError(null);
    } catch {
      setError('Impossible de charger le suivi. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch OSRM route when driver + destination positions are available
  const fetchRoute = useCallback(async (
    driverLat: number, driverLng: number,
    destLat: number, destLng: number
  ) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 'Ok' && json.routes[0]) {
        const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );
        setRoute(coords);
        setEta(json.routes[0].duration);
      }
    } catch { /* OSRM optionnel */ }
  }, []);

  useEffect(() => {
    fetchTracking();
    intervalRef.current = setInterval(fetchTracking, 15000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchTracking]);

  useEffect(() => {
    if (!data) return;
    const { driver, order } = data;
    if (driver?.current_lat && driver?.current_lng && order?.delivery_lat && order?.delivery_lng) {
      fetchRoute(driver.current_lat, driver.current_lng, order.delivery_lat, order.delivery_lng);
    }
  }, [data, fetchRoute]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Suivi introuvable</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'Le lien de suivi est invalide ou expiré.'}</p>
          {onBack && (
            <button onClick={onBack} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors">
              Retour à la boutique
            </button>
          )}
        </div>
      </div>
    );
  }

  const { order, driver, history, items } = data;
  const st = STATUSES[order.status] || STATUSES.pending;
  const currentIdx = TIMELINE.indexOf(order.status);
  const driverPos: [number, number] | null = driver?.current_lat ? [driver.current_lat, driver.current_lng] : null;
  const destPos: [number, number] | null = order.delivery_lat ? [order.delivery_lat, order.delivery_lng] : null;
  const defaultCenter: [number, number] = driverPos || destPos || [14.6937, -17.4441]; // Dakar
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl">
              <Home className="w-5 h-5 text-gray-500" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-400">Suivi de commande</p>
            <h1 className="font-black text-gray-900">#{order.order_number}</h1>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-sm font-bold ${st.color}`}>
            {st.icon} {st.label}
          </div>
          <button onClick={fetchTracking} className="p-2 hover:bg-gray-100 rounded-xl" title="Actualiser">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ─── CARTE ─────────────────────────────────────────── */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <div style={{ height: 320 }}>
              <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {driverPos && (
                  <Marker position={driverPos} icon={driverIcon}>
                    <Popup><b>{driver.name}</b><br />{driver.vehicle_label || driver.vehicle_type}</Popup>
                  </Marker>
                )}
                {destPos && (
                  <Marker position={destPos} icon={destIcon}>
                    <Popup><b>Adresse de livraison</b><br />{order.shipping_address}</Popup>
                  </Marker>
                )}
                {route && route.length > 1 && (
                  <Polyline positions={route} color="#f97316" weight={4} opacity={0.8} />
                )}
                {driverPos && <AutoCenter pos={driverPos} />}
              </MapContainer>
            </div>
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Navigation className="w-4 h-4 text-orange-500" />
                {driverPos
                  ? eta !== null
                    ? <span>ETA : <strong className="text-gray-900">{formatETA(eta)}</strong></span>
                    : <span>Position livreur disponible</span>
                  : <span className="text-gray-400">Position en attente...</span>
                }
              </div>
              <span className="text-xs text-gray-400">
                Mis à jour {formatDate(lastRefresh.toISOString())}
              </span>
            </div>
          </div>
        )}

        {/* ─── TIMELINE ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Suivi de la commande</h2>
          <div className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
            <div className="space-y-4">
              {TIMELINE.map((s, i) => {
                const done = currentIdx >= i;
                const active = currentIdx === i;
                const info = STATUSES[s];
                const histEntry = history.find(h => h.status === s);
                return (
                  <div key={s} className="relative flex items-start gap-4 pl-10">
                    <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                      active ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200'
                      : done  ? 'bg-green-500 border-green-500 text-white'
                               : 'bg-white border-gray-200 text-gray-300'
                    }`}>
                      {done && !active ? <CheckCircle className="w-4 h-4" /> : info.icon}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-sm font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{info.label}</p>
                      {histEntry && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(histEntry.created_at)}
                          {histEntry.note ? ` · ${histEntry.note}` : ''}
                        </p>
                      )}
                    </div>
                    {active && (
                      <span className="flex-shrink-0 mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full animate-pulse">
                        Actif
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── LIVREUR ───────────────────────────────────────── */}
        {driver && !isCancelled && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Votre livreur</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {driver.avatar_url
                  ? <img src={driver.avatar_url} alt={driver.name} className="w-full h-full object-cover" />
                  : <Truck className="w-7 h-7 text-orange-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{driver.name}</p>
                <p className="text-sm text-gray-500">{driver.vehicle_label || driver.vehicle_type} · {driver.vehicle_plate}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-bold text-gray-700">{driver.rating?.toFixed(1)}</span>
                </div>
              </div>
              {driver.phone && (
                <a href={`tel:${driver.phone}`}
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors">
                  <Phone className="w-5 h-5 text-green-600" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ─── ADRESSE ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Adresse de livraison</h2>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-gray-900">
                {order.shipping_first_name} {order.shipping_last_name}
              </p>
              <p className="text-sm text-gray-600">{order.shipping_address}</p>
              <p className="text-sm text-gray-600">{order.shipping_city}</p>
              {order.shipping_instructions && (
                <p className="text-xs text-gray-400 mt-1 italic">"{order.shipping_instructions}"</p>
              )}
            </div>
          </div>
          {order.estimated_delivery_at && !isDelivered && (
            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-50">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">
                Livraison estimée : <strong className="text-gray-900">{formatDate(order.estimated_delivery_at)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ─── RÉCAPITULATIF COMMANDE ─────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Récapitulatif</h2>
          <div className="space-y-2.5">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                {item.image_url
                  ? <img src={item.image_url} alt={item.product_name} className="w-10 h-10 rounded-lg object-cover bg-gray-50" />
                  : <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-400">Qté : {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatPrice(parseFloat(item.total_price))}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>TVA 18%</span><span>{formatPrice(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Livraison</span><span>{formatPrice(order.shipping_amount)}</span>
            </div>
            <div className="flex justify-between font-black text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span><span className="text-orange-600">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {isDelivered && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="font-bold text-green-800">Commande livrée !</p>
            <p className="text-sm text-green-600 mt-1">Livrée le {formatDate(order.delivered_at)}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Actualisation automatique toutes les 15s · {formatDate(lastRefresh.toISOString())}
        </p>
      </div>
    </div>
  );
};

export default TrackingPage;
