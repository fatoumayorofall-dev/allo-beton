import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Carte OpenStreetMap (Leaflet), gratuite et sans clé.
 * Le fond de carte se change avec VITE_MAP_TILES (ex. MapTiler, Stadia, Carto) pour la production.
 */
const TILES = (import.meta.env.VITE_MAP_TILES as string | undefined) || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) || '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/**
 * Vue satellite (Esri World Imagery) + noms des rues et des lieux par-dessus : la cliente voit les toits
 * et pose l'épingle exactement sur sa maison. Remplaçable par VITE_MAP_SATELLITE (ex. MapTiler avec clé).
 */
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const SAT_TILES = (import.meta.env.VITE_MAP_SATELLITE as string | undefined) || `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const SAT_LABELS = [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`];
const SAT_ATTRIBUTION = 'Imagerie © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics';

export interface LatLng { lat: number; lng: number }
export interface MapMarker extends LatLng {
  id: string;
  kind: 'home' | 'driver' | 'shop' | 'relay' | 'me' | 'stop' | 'poi';
  /** Bulle au toucher (sinon `label`) */
  title?: string;
  /** Arrêt de tournée : livré (vert) ou en cours (framboise) */
  tone?: 'done' | 'current' | 'next' | 'skipped';
  label?: string;
  /** Emoji du véhicule du livreur (🛵 par défaut) */
  icon?: string;
}

const ICONS: Record<MapMarker['kind'], (m: MapMarker) => L.DivIcon> = {
  // « Vous êtes ici » : point bleu qui pulse (comme dans les applis de VTC)
  // Lieu connu (mosquée, pharmacie…) : petite pastille avec son icône
  poi: m => L.divIcon({ className: 'maefa-pin', iconSize: [30, 30], iconAnchor: [15, 15], html: `<span class="maefa-poi${m.tone === 'current' ? ' is-on' : ''}">${m.icon ?? '📍'}</span>` }),
  // Arrêt numéroté d'une tournée de livraison
  stop: m => L.divIcon({ className: 'maefa-pin', iconSize: [34, 34], iconAnchor: [17, 17], html: `<span class="maefa-stop maefa-stop-${m.tone ?? 'next'}">${m.tone === 'done' ? '✓' : String(m.label ?? '').slice(0, 3)}</span>` }),
  me: () => L.divIcon({ className: 'maefa-pin', iconSize: [28, 28], iconAnchor: [14, 14], html: '<span class="maefa-me"><span class="maefa-me-pulse"></span><span class="maefa-me-dot"></span></span>' }),
  home: () => L.divIcon({
    className: 'maefa-pin', iconSize: [44, 52], iconAnchor: [22, 50],
    html: '<span class="maefa-pin-home"><span>🏠</span></span>',
  }),
  driver: m => L.divIcon({
    className: 'maefa-pin', iconSize: [52, 52], iconAnchor: [26, 26],
    html: '<span class="maefa-pin-driver"><span class="maefa-pin-pulse"></span><span class="maefa-pin-scooter">' + (m.icon ?? '🛵') + '</span></span>',
  }),
  relay: () => L.divIcon({
    className: 'maefa-pin', iconSize: [40, 40], iconAnchor: [20, 20],
    html: '<span class="maefa-pin-relay">🔁</span>',
  }),
  shop: () => L.divIcon({
    className: 'maefa-pin', iconSize: [40, 40], iconAnchor: [20, 20],
    html: '<span class="maefa-pin-shop">F</span>',
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
  /** Chemin par les rues ([lat, lng]…) dessiné entre le livreur et l'arrivée */
  path?: [number, number][] | null;
  /** Boutons + / − (par défaut si la carte est interactive) */
  zoomButtons?: boolean;
  /** Toucher un marqueur (ex. choisir un lieu connu comme repère) */
  onMarkerClick?: (id: string) => void;
  /** Épingle centrale soulevée (pendant que la carte bouge) */
  pinLifted?: boolean;
  /** La cliente commence à faire glisser la carte */
  onMoveStart?: () => void;
  /** Vue satellite au lieu du plan */
  satellite?: boolean;
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

export const MapView: React.FC<Props> = ({ center, zoom = 15, markers = [], circle, path, onCenterChange, pinCenter, fitMarkers, satellite = false, pinLifted = false, onMoveStart, onMarkerClick, zoomButtons, interactive = true, className = '', children }) => {
  const base = useRef<{ plan: L.TileLayer; sat: L.LayerGroup } | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef(new Map<string, L.Marker>());
  const circleRef = useRef<L.Circle | null>(null);
  const pathRef = useRef<L.Polyline[]>([]);
  const onChange = useRef(onCenterChange);
  onChange.current = onCenterChange;
  const onMarker = useRef(onMarkerClick);
  onMarker.current = onMarkerClick;
  const onStart = useRef(onMoveStart);
  onStart.current = onMoveStart;
  // vrai seulement quand la cliente fait glisser la carte (les déplacements faits par le code ne comptent pas)
  const dragging = useRef(false);
  const fitted = useRef(false);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      center: [center.lat, center.lng], zoom, zoomControl: zoomButtons ?? interactive, attributionControl: true,
      // avec l'épingle au centre, le zoom garde le même point sous l'épingle
      dragging: interactive, touchZoom: interactive ? (pinCenter ? 'center' : true) : false, scrollWheelZoom: interactive ? (pinCenter ? 'center' : true) : false, doubleClickZoom: interactive, boxZoom: false, keyboard: interactive,
    });
    const plan = L.tileLayer(TILES, { maxZoom: 20, maxNativeZoom: 19, attribution: ATTRIBUTION, crossOrigin: true });
    const sat = L.layerGroup([
      L.tileLayer(SAT_TILES, { maxZoom: 20, maxNativeZoom: 19, attribution: SAT_ATTRIBUTION, crossOrigin: true }),
      ...(import.meta.env.VITE_MAP_SATELLITE ? [] : SAT_LABELS.map(u => L.tileLayer(u, { maxZoom: 20, maxNativeZoom: 19, crossOrigin: true }))),
    ]);
    (satellite ? sat : plan).addTo(m);
    base.current = { plan, sat };
    m.attributionControl.setPrefix(false);
    m.on('dragstart', () => { dragging.current = true; onStart.current?.(); });
    m.on('zoomstart', () => { if (pinCenter) onStart.current?.(); });
    m.on('moveend', () => {
      // Un « moveend » peut arriver pendant que le doigt glisse encore (marqueurs mis à jour…) :
      // on attend la vraie fin du glissement pour ne pas reposer l'épingle trop tôt
      if ((m.dragging as unknown as { moving?: () => boolean })?.moving?.()) return;
      const c = m.getCenter();
      onChange.current?.({ lat: c.lat, lng: c.lng }, dragging.current);
      dragging.current = false;
    });
    map.current = m;
    // La carte peut apparaître dans un bloc qui change de taille (formulaire, fenêtre)
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; base.current = null; layers.current.clear(); circleRef.current = null; pathRef.current = []; fitted.current = false; };
  }, []); // la carte est créée une seule fois

  // Plan ↔ satellite
  useEffect(() => {
    const m = map.current, b = base.current;
    if (!m || !b) return;
    const [on, off] = satellite ? [b.sat, b.plan] : [b.plan, b.sat];
    if (m.hasLayer(off)) m.removeLayer(off);
    if (!m.hasLayer(on)) on.addTo(m);
  }, [satellite]);

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
        const tip = mk.title ?? mk.label;
        const marker = L.marker([mk.lat, mk.lng], { icon: ICONS[mk.kind](mk), keyboard: false, title: tip });
        if (tip) marker.bindTooltip(tip, { direction: 'top', offset: [0, mk.kind === 'stop' || mk.kind === 'poi' ? -16 : -40] });
        marker.on('click', () => onMarker.current?.(mk.id));
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

  // Trajet : un liseré blanc sous un trait prune, comme sur une appli de VTC
  const pathKey = path && path.length > 1 ? `${path.length}:${path[0]}:${path[path.length - 1]}` : '';
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const pts = path && path.length > 1 ? path : null;
    if (!pts) { pathRef.current.forEach(l => l.remove()); pathRef.current = []; return; }
    if (pathRef.current.length) { pathRef.current.forEach(l => l.setLatLngs(pts)); return; }
    pathRef.current = [
      L.polyline(pts, { color: '#ffffff', weight: 9, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false, className: 'maefa-route-casing' }).addTo(m),
      L.polyline(pts, { color: '#7a2e4a', weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round', interactive: false, className: 'maefa-route' }).addTo(m),
    ];
  }, [pathKey]);

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
        // Épingle « sucette » : se soulève pendant le déplacement, retombe avec un petit rebond à l'arrêt
        <div className={`maefa-cpin ${pinLifted ? 'is-lifted' : 'is-down'}`} aria-hidden data-testid="center-pin">
          <span className="maefa-cpin-head"><span className="maefa-cpin-eye" /></span>
          <span className="maefa-cpin-stick" />
          <span className="maefa-cpin-shadow" />
        </div>
      )}
      {children}
    </div>
  );
};

export default MapView;
