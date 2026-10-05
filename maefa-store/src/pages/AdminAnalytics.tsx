import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { API_BASE } from '../services/api';
import { useStore } from '../context/StoreContext';

interface Report {
  genereLe: string;
  dureeMs: number;
  fichiers: number;
  volume: {
    lignes: number;
    gardees: number;
    illisibles: number;
    invalides: number;
    doublons: number;
    inconnues: number;
  };
  indicateurs: { jour: string; visiteuses: number; vues: number; favoris: number; paniers: number; demandes: number }[];
  entonnoir: { visiteuses: number; ajoutPanier: number; demandes: number; tauxPanier: number; tauxDemande: number };
  topProduits: { id: string; vues: number }[];
  heures: number[];
  modele: { pieces: number; visiteuses: number };
  evaluation: { users: number; k: number; hitRate: number | null; baselineHitRate: number | null };
}
interface CacheStats {
  backend: string;
  entries: number;
  hits: number;
  redisHits: number;
  misses: number;
}

const n = (v: number) => v.toLocaleString('fr-FR');
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10} %`);

const Tile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-[1.5rem] border border-ink/[0.06] p-5">
    <p className="text-xs uppercase tracking-[0.16em] text-ink/60">{label}</p>
    <p className="font-display text-3xl mt-2">{value}</p>
    {hint && <p className="text-xs text-ink/60 mt-1">{hint}</p>}
  </div>
);

/**
 * « Données & IA » : rapport du pipeline (collecte anonyme → nettoyage → indicateurs) et
 * qualité du modèle de recommandation, mesurée hors ligne.
 */
export const AnalyticsTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { products } = useStore();
  const [report, setReport] = useState<Report | null>(null);
  const [cache, setCache] = useState<CacheStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      setBusy(true);
      setError('');
      try {
        const r = await fetch(`${API_BASE}/api/admin/analytics${refresh ? '?refresh=1' : ''}`, {
          headers: { 'x-admin-pin': pin },
        });
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error || 'Erreur');
        setReport(body.report);
        setCache(body.cache);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [pin],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (!report)
    return (
      <div className="py-20 grid place-items-center text-sm text-ink/70">
        {error || <Loader2 className="w-6 h-6 animate-spin text-ink/40" />}
      </div>
    );

  const name = (id: string) => products.find(p => p.id === id)?.name ?? id;
  const maxHour = Math.max(1, ...report.heures);
  const last = report.indicateurs.slice(-14);
  const maxDay = Math.max(1, ...last.map(d => d.vues));
  const e = report.evaluation;

  return (
    <div className="space-y-6" data-testid="analytics-tab">
      <div className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Données & IA</h2>
          <p className="text-sm text-ink/70 mt-2 max-w-2xl">
            Parcours anonymes des visiteuses (articles vus, favoris, paniers, demandes), nettoyés puis analysés. Le même
            traitement entraîne le modèle « Vous aimerez aussi ».
          </p>
          <p className="text-xs text-ink/55 mt-2">
            Dernier calcul : {new Date(report.genereLe).toLocaleString('fr-FR')} · {n(report.volume.lignes)} lignes lues
            en {n(report.dureeMs)} ms · cache : {cache?.backend}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={busy}
          className="px-4 h-11 rounded-full border border-ink/15 text-sm inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Recalculer
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="analytics-funnel">
        <Tile label="Visiteuses" value={n(report.entonnoir.visiteuses)} />
        <Tile
          label="Ajout au panier"
          value={`${report.entonnoir.tauxPanier} %`}
          hint={`${n(report.entonnoir.ajoutPanier)} visiteuses`}
        />
        <Tile
          label="Demandes WhatsApp"
          value={`${report.entonnoir.tauxDemande} %`}
          hint={`${n(report.entonnoir.demandes)} visiteuses`}
        />
        <Tile
          label="Lignes écartées"
          value={n(report.volume.lignes - report.volume.gardees)}
          hint={`doublons ${n(report.volume.doublons)} · invalides ${n(report.volume.invalides + report.volume.illisibles)}`}
        />
      </div>

      <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6" data-testid="analytics-model">
        <h3 className="font-display text-2xl">Modèle de recommandation</h3>
        <p className="text-sm text-ink/70 mt-2">
          Filtrage collaboratif (similarité cosinus entre pièces), entraîné sur {n(report.modele.visiteuses)} parcours
          et {report.modele.pieces} pièces. Test : on cache la dernière pièce regardée de chaque parcours et on vérifie
          si elle fait partie des {e.k} suggestions.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 max-w-md">
          <Tile label="Modèle" value={pct(e.hitRate)} hint={`sur ${n(e.users)} parcours`} />
          <Tile label="Référence « populaires »" value={pct(e.baselineHitRate)} />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
          <h3 className="font-display text-2xl">Vues par jour</h3>
          <div className="mt-4 flex items-end gap-1 h-36" role="img" aria-label="Vues des 14 derniers jours">
            {last.map(d => (
              <div
                key={d.jour}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${d.jour} : ${n(d.vues)} vues`}
              >
                <div className="w-full rounded-t-md bg-wine/80" style={{ height: `${(d.vues / maxDay) * 100}%` }} />
                <span className="text-[9px] text-ink/50">{d.jour.slice(8)}</span>
              </div>
            ))}
            {!last.length && <p className="text-sm text-ink/60">Pas encore de données.</p>}
          </div>
        </section>
        <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
          <h3 className="font-display text-2xl">Heures de visite</h3>
          <div className="mt-4 flex items-end gap-[3px] h-36" role="img" aria-label="Activité selon l'heure">
            {report.heures.map((v, h) => (
              <div key={h} className="flex-1 flex flex-col items-center gap-1" title={`${h} h : ${n(v)}`}>
                <div className="w-full rounded-t-sm bg-gold/80" style={{ height: `${(v / maxHour) * 100}%` }} />
                <span className="text-[8px] text-ink/50">{h % 6 === 0 ? `${h}h` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6">
        <h3 className="font-display text-2xl">Pièces les plus regardées</h3>
        <ol className="mt-3 space-y-1 text-sm">
          {report.topProduits.map((p, i) => (
            <li key={p.id} className="flex justify-between gap-3">
              <span>
                {i + 1}. {name(p.id)}
              </span>
              <span className="text-ink/60">{n(p.vues)} vues</span>
            </li>
          ))}
          {!report.topProduits.length && <li className="text-ink/60">Pas encore de données.</li>}
        </ol>
      </section>
    </div>
  );
};

export default AnalyticsTab;
