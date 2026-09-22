import React, { useMemo } from 'react';
import { Phone } from 'lucide-react';
import type { DeliveryInfo, DeliveryLocation } from '../data/types';
import { SHOP_LOCATION } from '../config/site';
import MapView, { type MapMarker } from './MapView';

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60e3));
const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

/**
 * Carte du suivi en direct : la maison de la cliente et le livreur qui avance (comme un taxi Yango).
 * Sans livreur en route, affiche simplement le point de livraison.
 */
export const LiveTracking: React.FC<{ location?: DeliveryLocation | null; delivery?: DeliveryInfo | null; compact?: boolean }> = ({ location, delivery, compact }) => {
  const driver = delivery?.state === 'en_route' ? delivery.position : null;
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (location) list.push({ id: 'home', kind: 'home', lat: location.lat, lng: location.lng, label: 'Livraison' });
    if (driver) list.push({ id: 'driver', kind: 'driver', lat: driver.lat, lng: driver.lng, label: delivery?.driverName });
    if (!list.length) list.push({ id: 'shop', kind: 'shop', ...SHOP_LOCATION, label: 'Fabima Store' });
    return list;
  }, [location?.lat, location?.lng, driver?.lat, driver?.lng, delivery?.driverName]);

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white ${compact ? '' : 'shadow-soft'}`} data-testid="live-tracking">
      <MapView center={markers[0]} zoom={16} markers={markers} fitMarkers className={compact ? 'h-56' : 'h-80 sm:h-96'} />
      {delivery && (
        <div className="p-4 sm:p-5 flex flex-wrap items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-ink text-2xl grid place-items-center shrink-0">🛵</span>
          <div className="flex-1 min-w-[10rem]" aria-live="polite">
            {delivery.state === 'en_route' && (
              <>
                <p className="font-display text-2xl leading-tight">
                  {delivery.etaMin != null ? (delivery.etaMin <= 1 ? 'Arrive dans 1 minute' : `Arrive dans ~${delivery.etaMin} min`) : 'Votre livreur est en route'}
                </p>
                <p className="text-sm text-ink/60">
                  {delivery.driverName}{delivery.distanceM != null && ` · à ${km(delivery.distanceM)}`}
                  {driver?.stale && ` · position d'il y a ${minutesAgo(driver.at)} min`}
                  {!driver && ' · en attente du GPS'}
                </p>
              </>
            )}
            {delivery.state === 'assignee' && <><p className="font-display text-2xl leading-tight">Livreur choisi : {delivery.driverName}</p><p className="text-sm text-ink/60">Vous pourrez le suivre ici dès son départ.</p></>}
            {delivery.state === 'livree' && <p className="font-display text-2xl leading-tight">Colis remis 🌸</p>}
          </div>
          {delivery.state !== 'livree' && (
            <a href={`tel:${delivery.driverPhone}`} className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-emerald-700 text-white font-semibold">
              <Phone className="w-4 h-4" /> Appeler
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
