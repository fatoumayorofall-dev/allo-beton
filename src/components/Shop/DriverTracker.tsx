/**
 * ALLO BÉTON — PAGE TRACKER LIVREUR
 * Ouverte sur le téléphone du livreur — partage sa position GPS en temps réel
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck, Play, Square, MapPin, Package, Phone,
  Navigation, CheckCircle, AlertCircle, Wifi, WifiOff,
} from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BACKEND = import.meta.env.VITE_API_URL || '';
const HEARTBEAT_INTERVAL = 15000; // 15 secondes

interface Props { driverToken: string; }

export const DriverTracker: React.FC<Props> = ({ driverToken }) => {
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [sentCount, setSentCount] = useState(0);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Charger les données du livreur
  useEffect(() => {
    fetch(`${BACKEND}/api/ecommerce/drivers/me/${driverToken}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) setError(json.error || 'Token invalide');
        else setDriverData(json.data);
      })
      .catch(() => setError('Connexion impossible'))
      .finally(() => setLoading(false));
  }, [driverToken]);

  const sendPosition = useCallback(async (lat: number, lng: number) => {
    if (!online) return;
    try {
      await fetch(`${BACKEND}/api/ecommerce/drivers/${driverToken}/position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat, lng,
          order_id: driverData?.active_order?.id || null,
        }),
      });
      setSentCount(c => c + 1);
      setLastSent(new Date());
    } catch { /* retry next heartbeat */ }
  }, [driverToken, driverData, online]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas disponible sur cet appareil.');
      return;
    }
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setPosition({ lat, lng });
        setAccuracy(acc);
        latestPosRef.current = { lat, lng };
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Impossible d\'obtenir la position GPS. Activez la localisation.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (latestPosRef.current) {
        sendPosition(latestPosRef.current.lat, latestPosRef.current.lng);
      }
    }, HEARTBEAT_INTERVAL);
  }, [sendPosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (heartbeatRef.current)        clearInterval(heartbeatRef.current);
    watchIdRef.current = null;
    heartbeatRef.current = null;
    setTracking(false);
  }, []);

  useEffect(() => () => stopTracking(), [stopTracking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !driverData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold mb-2">Erreur</p>
          <p className="text-gray-400 text-sm">{error || 'Lien invalide'}</p>
        </div>
      </div>
    );
  }

  const { driver, active_order } = driverData;
  const pos: [number, number] | null = position ? [position.lat, position.lng] : null;
  const centerPos: [number, number] = pos || [14.6937, -17.4441];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">{driver.name}</p>
            <p className="text-xs text-gray-400">{driver.vehicle_label || driver.vehicle_type} · {driver.vehicle_plate}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${online ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
            {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {online ? 'En ligne' : 'Hors ligne'}
          </div>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: 300 }}>
        <MapContainer center={centerPos} zoom={pos ? 15 : 12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pos && (
            <Marker position={pos}>
              <Popup><b>Votre position</b>{accuracy && <><br />Précision : {Math.round(accuracy)}m</>}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Commande active */}
        {active_order ? (
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-white">Commande active</span>
            </div>
            <p className="text-orange-400 font-bold text-lg">#{active_order.order_number}</p>
            <div className="mt-2 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-300">
                  {active_order.shipping_first_name} {active_order.shipping_last_name}
                </p>
                <p className="text-sm text-gray-400">{active_order.shipping_address}</p>
                <p className="text-sm text-gray-400">{active_order.shipping_city}</p>
              </div>
            </div>
            {active_order.shipping_phone && (
              <a href={`tel:${active_order.shipping_phone}`}
                className="mt-3 flex items-center gap-2 text-sm text-green-400 hover:text-green-300">
                <Phone className="w-4 h-4" /> {active_order.shipping_phone}
              </a>
            )}
            {active_order.shipping_instructions && (
              <p className="mt-2 text-xs text-gray-500 italic">
                Note : "{active_order.shipping_instructions}"
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 text-center">
            <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune commande assignée</p>
          </div>
        )}

        {/* Position actuelle */}
        {position && (
          <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold">Position GPS</span>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
            {accuracy && (
              <p className="text-xs text-gray-500 mt-0.5">Précision : ±{Math.round(accuracy)}m</p>
            )}
            {lastSent && (
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Envoyé {sentCount} fois · dernière à {lastSent.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
        )}

        {/* Bouton Start/Stop */}
        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${
            tracking
              ? 'bg-red-600 hover:bg-red-700 shadow-red-900'
              : 'bg-orange-600 hover:bg-orange-700 shadow-orange-900'
          }`}
        >
          {tracking ? (
            <><Square className="w-6 h-6" /> Arrêter le suivi</>
          ) : (
            <><Play className="w-6 h-6" /> Démarrer le suivi GPS</>
          )}
        </button>

        {tracking && (
          <p className="text-center text-xs text-gray-500">
            Position envoyée toutes les {HEARTBEAT_INTERVAL / 1000}s · {sentCount} envoi{sentCount > 1 ? 's' : ''}
          </p>
        )}

        <p className="text-center text-xs text-gray-600 pb-4">
          Allo Béton · Suivi livreur sécurisé
        </p>
      </div>
    </div>
  );
};

export default DriverTracker;
