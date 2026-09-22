import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Carte OpenStreetMap (Leaflet), gratuite et sans clé.
 * Le fond de carte se change avec VITE_MAP_TILES (ex. MapTiler, Stadia, Carto) pour la production.
 */
const TILES = (import.meta.env.VITE_MAP_TILES as string | undefined) || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface LatLng { lat: number; lng: number }
export interface MapMarker extends LatLng {
  id: string;
  kind: 'home' | 'driver' | 'shop';
  label?: string;
}

const ICONS: Record<MapMarker['kind'], (m: MapMarker) => L.DivIcon> = {
  home: () => L.divIcon({
    className: 'fabima-pin', iconSize: [44, 52], iconAnchor: [22, 50],
    html: '<span class="fabima-pin-home"><span>🏠</span></span>',
  }),
  driver: () => L.divIcon({
    className: 'fabima-pin', iconSize: [52, 52], iconAnchor: [26, 26],
    html: '<span class="fabima-pin-driver"><span class="fabima-pin-pulse"></span><span class="fabima-pin-scooter">🛵</span></span>',
  }),
  shop: () => L.divIcon({
    className: 'fabima-pin', iconSize: [40, 40], iconAnchor: [20, 20],
    html: '<span class="fabima-pin-shop">F</span>',
  }),
};

interface Props {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  /** Cercle de précision du GPS */
  circle?: LatLng & { radius: number };
  /** Épingle fixe au centre : la cliente déplace la carte sous l'épingle (comme Yango) */
  pinCenter?: boolean;
  onCenterChange?: (c: LatLng, byUser: boolean) => void;
  /** Recadrer automatiquement sur tous les marqueurs */
  fitMarkers?: boolean;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/** Déplacement fluide d'un marqueur (le livreur glisse au lieu de sauter). */
function glide(marker: L.Marker, to: L.LatLng) {
  const from = marker.getLatLng();
  if (from.distanceTo(to) > 2000) { marker.setLatLng(to); return; }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1200);
    const e = t * (2 - t);
    marker.setLatLng([from.lat + (to.lat - from.lat) * e, from.lng + (to.lng - from.lng) * e]);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export const MapView: React.FC<Props> = ({ center, zoom = 15, markers = [], circle, pinCenter, onCenterChange, fitMarkers, interactive = true, className = '', children }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef(new Map<string, L.Marker>());
  const circleRef = useRef<L.Circle | null>(null);
  const onChange = useRef(onCenterChange);
  onChange.current = onCenterChange;
  // vrai seulement quand la cliente fait glisser la carte (les déplacements faits par le code ne comptent pas)
  const dragging = useRef(false);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      center: [center.lat, center.lng], zoom, zoomControl: interactive, attributionControl: true,
      // avec l'épingle au centre, le zoom garde le même point sous l'épingle
      dragging: interactive, touchZoom: interactive ? (pinCenter ? 'center' : true) : false, scrollWheelZoom: interactive ? (pinCenter ? 'center' : true) : false, doubleClickZoom: interactive, boxZoom: false, keyboard: interactive,
    });
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION, crossOrigin: true }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.on('dragstart', () => { dragging.current = true; });
    m.on('moveend', () => {
      const c = m.getCenter();
      onChange.current?.({ lat: c.lat, lng: c.lng }, dragging.current);
      dragging.current = false;
    });
    map.current = m;
    // La carte peut apparaître dans un bloc qui change de taille (formulaire, fenêtre)
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layers.current.clear(); circleRef.current = null; fitted.current = false; };
  }, []); // la carte est créée une seule fois

  // Recentrer quand le centre change depuis le code
  useEffect(() => {
    const m = map.current;
    if (!m || fitMarkers) return;
    const c = m.getCenter();
    if (Math.abs(c.lat - center.lat) < 1e-6 && Math.abs(c.lng - center.lng) < 1e-6) return;
    m.setView([center.lat, center.lng], Math.max(m.getZoom(), zoom), { animate: true });
  }, [center.lat, center.lng]);

  // Marqueurs
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const seen = new Set<string>();
    for (const mk of markers) {
      seen.add(mk.id);
      const existing = layers.current.get(mk.id);
      if (existing) {
        existing.setIcon(ICONS[mk.kind](mk));
        glide(existing, L.latLng(mk.lat, mk.lng));
      } else {
        const marker = L.marker([mk.lat, mk.lng], { icon: ICONS[mk.kind](mk), keyboard: false, title: mk.label });
        if (mk.label) marker.bindTooltip(mk.label, { direction: 'top', offset: [0, -40] });
        marker.addTo(m);
        layers.current.set(mk.id, marker);
      }
    }
    for (const [id, marker] of layers.current) {
      if (!seen.has(id)) { marker.remove(); layers.current.delete(id); }
    }
    if (fitMarkers && markers.length) {
      const bounds = L.latLngBounds(markers.map(mk => [mk.lat, mk.lng] as [number, number]));
      if (markers.length === 1) m.setView(bounds.getCenter(), zoom, { animate: fitted.current });
      else m.fitBounds(bounds.pad(0.35), { maxZoom: 17, animate: fitted.current });
      fitted.current = true;
    }
  }, [markers, fitMarkers]);

  // Cercle de précision
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    circleRef.current?.remove();
    circleRef.current = circle
      ? L.circle([circle.lat, circle.lng], { radius: circle.radius, color: '#9c4a63', weight: 1, fillColor: '#e8b4c1', fillOpacity: 0.18, interactive: false }).addTo(m)
      : null;
  }, [circle?.lat, circle?.lng, circle?.radius]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div ref={el} className="absolute inset-0 bg-[#efe9e3]" role="application" aria-label="Carte" />
      {pinCenter && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full" aria-hidden>
          <span className="fabima-pin-home fabima-pin-lift"><span>🏠</span></span>
          <span className="block mx-auto w-2 h-2 rounded-full bg-ink/40 blur-[1px] -mt-0.5" />
        </div>
      )}
      {children}
    </div>
  );
};

export default MapView;
