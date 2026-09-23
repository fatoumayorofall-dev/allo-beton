import React, { useMemo } from 'react';
import { Phone } from 'lucide-react';
import type { DeliveryInfo, DeliveryLocation } from '../data/types';
import { SHOP_LOCATION } from '../config/site';
import { VEHICLE_ICONS, formatDistance, formatEta } from '../utils/format';
import MapView, { type MapMarker } from './MapView';

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60e3));

/** Étapes d'une livraison en relais : qui a le colis, où il va, ce qui est déjà fait. */
export const RelaySteps: React.FC<{ delivery: DeliveryInfo; admin?: boolean }> = ({ delivery, admin }) => {
  const legs = delivery.legs ?? [];
  if (legs.length < 2) return null;
  return (
    <ol className="space-y-2" data-testid="relay-steps">
      {legs.map((l, k) => {
        const active = l.state === 'en_route';
        return (
          <li key={k} className={`flex items-start gap-3 p-3 rounded-2xl ${active ? 'bg-blush/50' : 'bg-ivory'}`}>
            <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 text-lg ${l.state === 'remis' ? 'bg-emerald-100' : active ? 'bg-wine text-white' : 'bg-white border border-ink/10'}`}>
              {l.state === 'remis' ? '✓' : VEHICLE_ICONS[l.vehicle]}
            </span>
            <div className="text-sm min-w-0">
              <p className="font-semibold">Étape {k + 1} · {l.driverName}{admin && <span className="font-normal text-ink/55"> · {l.driverPhone}</span>}</p>
              <p className="text-ink/60">{l.to ? `jusqu'à ${l.to.label}` : 'jusqu\'à la cliente'}</p>
              <p className={`text-xs mt-0.5 ${l.state === 'remis' ? 'text-emerald-800' : active ? 'text-wine font-semibold' : 'text-ink/45'}`}>
                {l.state === 'remis' ? (l.to ? 'Relais passé' : 'Colis remis') : active ? 'A le colis, en route' : 'En attente du colis'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/**
 * Carte du suivi en direct : la maison de la cliente et le livreur qui avance (comme un taxi Yango).
 * En relais, on suit le livreur de l'étape en cours et son point de relais.
 */
export const LiveTracking: React.FC<{ location?: DeliveryLocation | null; delivery?: DeliveryInfo | null; compact?: boolean }> = ({ location, delivery, compact }) => {
  const driver = delivery?.state === 'en_route' ? delivery.position : null;
  const relayTarget = delivery && !delivery.final && delivery.target?.lat != null && delivery.target.lng != null ? delivery.target : null;
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    if (location) list.push({ id: 'home', kind: 'home', lat: location.lat, lng: location.lng, label: 'Livraison' });
    if (relayTarget) list.push({ id: 'relay', kind: 'relay', lat: relayTarget.lat!, lng: relayTarget.lng!, label: relayTarget.label });
    if (driver) list.push({ id: 'driver', kind: 'driver', lat: driver.lat, lng: driver.lng, label: delivery?.driverName, icon: delivery?.vehicle ? VEHICLE_ICONS[delivery.vehicle] : undefined });
    if (!list.length) list.push({ id: 'shop', kind: 'shop', ...SHOP_LOCATION, label: 'Fabima Store' });
    return list;
  }, [location?.lat, location?.lng, driver?.lat, driver?.lng, delivery?.driverName, delivery?.vehicle, relayTarget?.lat, relayTarget?.lng]);

  const icon = delivery?.vehicle ? VEHICLE_ICONS[delivery.vehicle] : '🛵';
  const where = delivery && !delivery.final && delivery.target ? ` à ${delivery.target.label}` : '';

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border border-ink/10 bg-white ${compact ? '' : 'shadow-soft'}`} data-testid="live-tracking">
      <MapView center={markers[0]} zoom={16} markers={markers} fitMarkers className={compact ? 'h-56' : 'h-80 sm:h-96'} />
      {delivery && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-ink text-2xl grid place-items-center shrink-0">{icon}</span>
            <div className="flex-1 min-w-[10rem]" aria-live="polite">
              {delivery.state === 'en_route' && (
                <>
                  <p className="font-display text-2xl leading-tight">
                    {delivery.etaMin != null
                      ? (delivery.final ? (delivery.etaMin <= 1 ? 'Arrive dans 1 minute' : `Arrive dans ~${formatEta(delivery.etaMin)}`) : `Au relais${where} dans ~${formatEta(delivery.etaMin)}`)
                      : delivery.final ? 'Votre livreur est en route' : `En route vers le relais${where}`}
                  </p>
                  <p className="text-sm text-ink/60">
                    {delivery.relay && `Étape ${(delivery.current ?? 0) + 1} sur ${delivery.legs?.length} · `}
                    {delivery.driverName}{delivery.distanceM != null && ` · à ${formatDistance(delivery.distanceM)}`}
                    {driver?.stale && ` · position d'il y a ${minutesAgo(driver.at)} min`}
                    {!driver && ' · en attente du GPS'}
                  </p>
                </>
              )}
              {delivery.state === 'assignee' && <><p className="font-display text-2xl leading-tight">{delivery.relay ? 'Livraison en relais prévue' : `Livreur choisi : ${delivery.driverName}`}</p><p className="text-sm text-ink/60">Vous pourrez suivre votre colis ici dès son départ.</p></>}
              {delivery.state === 'livree' && <p className="font-display text-2xl leading-tight">Colis remis 🌸</p>}
            </div>
            {delivery.state !== 'livree' && (
              <a href={`tel:${delivery.driverPhone}`} className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-emerald-700 text-white font-semibold">
                <Phone className="w-4 h-4" /> Appeler
              </a>
            )}
          </div>
          {!compact && <RelaySteps delivery={delivery} />}
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
