import React, { useEffect, useState } from 'react';
import { Download, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import type { Dashboard, DashboardDays, MpOrder, Result } from './api';
import { F, PAYMENT_LABELS, STATUS_LABELS } from './format';

const PERIODS: [DashboardDays, string][] = [
  [7, '7 jours'],
  [30, '30 jours'],
  [90, '3 mois'],
  [365, '12 mois'],
];
const MODES: Record<string, string> = { vendeur: 'Par moi', express: 'Livreur express', partagee: 'Moitié-moitié' };
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const label = (key: string, monthly: boolean) =>
  monthly ? MONTHS[Number(key.slice(5, 7)) - 1] : `${Number(key.slice(8, 10))}/${Number(key.slice(5, 7))}`;
const pct = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('fr-FR')} %`);

/** Export des ventes pour la comptabilité (Excel) : jamais le numéro ni l'adresse des clientes */
function exportCsv(sales: MpOrder[], from: string, name: string) {
  const rows = sales
    .filter(o => o.createdAt >= from)
    .map(o => [
      new Date(o.createdAt).toLocaleDateString('fr-FR'),
      o.id,
      STATUS_LABELS[o.status],
      o.lines.map(l => `${l.qty} × ${l.title}${l.variant ? ` (${l.variant})` : ''}`).join(' + '),
      o.lines.reduce((t, l) => t + l.qty, 0),
      o.subtotal,
      o.delivery.fee,
      o.platformFee ?? 0,
      o.subtotal - (o.platformFee ?? 0),
      PAYMENT_LABELS[o.payment],
      MODES[o.delivery.mode ?? 'vendeur'] ?? '',
    ]);
  const head = [
    'Date',
    'Commande',
    'Étape',
    'Articles',
    'Quantité',
    'Montant articles (F)',
    'Livraison (F)',
    'Commission (F)',
    'Je garde (F)',
    'Paiement',
    'Livraison',
  ];
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : `"${v.replace(/"/g, '""')}"`);
  // Point-virgule et BOM : Excel en français ouvre le fichier directement, avec les accents
  const csv = '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `ventes-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

const Card: React.FC<{ title: string; value: string; note?: React.ReactNode; testId?: string }> = ({
  title,
  value,
  note,
  testId,
}) => (
  <div className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid={testId}>
    <p className="text-xs text-ink/60">{title}</p>
    <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    {note && <p className="text-xs text-ink/60 mt-1">{note}</p>}
  </div>
);

/** Courbe des ventes : une barre par jour (ou par mois), la hauteur suit le montant livré */
const Chart: React.FC<{ d: Dashboard }> = ({ d }) => {
  const max = Math.max(1, ...d.series.map(b => b.revenue));
  const n = d.series.length;
  const step = Math.ceil(n / 7);
  return (
    <figure className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid="mp-dash-chart">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">Ventes livrées {d.monthly ? 'par mois' : 'par jour'}</span>
        <span className="text-xs text-ink/60">plus haut : {F(max)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${n * 10} 110`}
        className="mt-3 w-full h-40"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Ventes livrées : ${F(d.revenue)} sur la période`}
      >
        <line x1="0" y1="100" x2={n * 10} y2="100" stroke="currentColor" className="text-ink/15" strokeWidth="0.5" />
        {d.series.map((b, i) => {
          const h = (b.revenue / max) * 95;
          return (
            <rect
              key={b.key}
              x={i * 10 + 1.5}
              y={100 - h}
              width="7"
              height={Math.max(h, b.revenue ? 1.5 : 0)}
              rx="1.5"
              className="fill-ink"
            >
              <title>{`${label(b.key, d.monthly)} : ${F(b.revenue)} (${b.orders} commande${b.orders > 1 ? 's' : ''})`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-ink/55 mt-1">
        {d.series
          .filter((_, i) => i % step === 0 || i === n - 1)
          .map(b => (
            <span key={b.key}>{label(b.key, d.monthly)}</span>
          ))}
      </div>
    </figure>
  );
};

/**
 * Tableau de bord des ventes d'une boutique : la vendeuse le voit dans son espace, la gérante peut
 * l'ouvrir pour l'aider. `sales` (vendeuse seulement) sert à l'export pour la comptabilité.
 */
export const SellerDashboard: React.FC<{
  load: (days: DashboardDays) => Promise<Result<{ dashboard: Dashboard }>>;
  sales?: MpOrder[];
  name?: string;
}> = ({ load, sales, name = 'boutique' }) => {
  const [days, setDays] = useState<DashboardDays>(30);
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    setD(null);
    load(days).then(r => {
      if (!alive) return;
      if (r.ok) setD(r.data.dashboard);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [days, load]);

  const channels = d ? d.channels.live + d.channels.negocie + d.channels.affiche : 0;
  return (
    <section className="space-y-4" data-testid="mp-dashboard">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl mr-auto">Tableau de bord</h2>
        <div className="flex gap-1 bg-white rounded-full border border-ink/10 p-1" role="tablist" aria-label="Période">
          {PERIODS.map(([n, text]) => (
            <button
              key={n}
              role="tab"
              aria-selected={days === n}
              onClick={() => setDays(n)}
              className={`h-8 px-3 rounded-full text-xs font-semibold ${days === n ? 'bg-ink text-ivory' : ''}`}
            >
              {text}
            </button>
          ))}
        </div>
        {sales && d && (
          <button
            onClick={() => exportCsv(sales, d.from, name)}
            className="h-10 px-4 rounded-full border border-ink/15 text-sm font-semibold inline-flex items-center gap-2"
            data-testid="mp-dash-export"
          >
            <Download className="w-4 h-4" /> Exporter (Excel)
          </button>
        )}
      </div>
      {error && <p className="text-sm text-wine">{error}</p>}
      {!d && !error && (
        <div className="py-16 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
        </div>
      )}
      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card
              title="Ventes livrées"
              value={F(d.revenue)}
              testId="mp-dash-revenue"
              note={
                d.change === null ? (
                  'rien sur la période d’avant'
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 ${d.change >= 0 ? 'text-emerald-800' : 'text-wine'}`}
                  >
                    {d.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {d.change > 0 ? '+' : ''}
                    {d.change.toLocaleString('fr-FR')} % par rapport à avant
                  </span>
                )
              }
            />
            <Card
              title={`Je garde (commission ${Math.round(d.rate * 100)} %)`}
              value={F(d.net)}
              note={`commission : ${F(d.commission)}`}
              testId="mp-dash-net"
            />
            <Card
              title="Commandes reçues"
              value={String(d.orders.created)}
              note={`${d.orders.delivered} livrée(s) · ${d.orders.inProgress} en cours · ${d.orders.cancelled} annulée(s)`}
              testId="mp-dash-orders"
            />
            <Card title="Panier moyen" value={F(d.avgBasket)} note="par commande livrée" />
            <Card
              title="Visites de mes articles"
              value={d.views.toLocaleString('fr-FR')}
              note={`${pct(d.conversion)} des visites deviennent une commande`}
              testId="mp-dash-views"
            />
            <Card
              title="Clientes"
              value={String(d.buyers)}
              note={`${d.loyal} fidèle(s) (2 commandes ou plus) · ${d.followers} abonnée(s)`}
              testId="mp-dash-buyers"
            />
            <Card
              title="Commandes réussies"
              value={pct(d.successRate)}
              note={`${d.orders.failed} livraison(s) ratée(s)`}
            />
            <Card
              title="Note des clientes"
              value={d.rating.average === null ? '—' : `${d.rating.average.toLocaleString('fr-FR')} ★`}
              note={`${d.rating.count} avis vérifié(s)`}
            />
          </div>

          <Chart d={d} />

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid="mp-dash-top">
              <p className="font-semibold">Articles les plus vendus</p>
              {!d.top.length && <p className="text-sm text-ink/60 mt-2">Aucune vente livrée sur la période.</p>}
              <ol className="mt-2 space-y-2">
                {d.top.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-ink/50">{i + 1}</span>
                    {a.photo && <img src={a.photo} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{a.title}</span>
                      <span className="text-xs text-ink/60">
                        {a.qty} vendu(s) · {a.views} visite(s)
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{F(a.amount ?? 0)}</span>
                  </li>
                ))}
              </ol>
              {d.toImprove.length > 0 && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3" data-testid="mp-dash-improve">
                  <p className="text-sm font-semibold text-amber-950">Vus mais pas vendus : à revoir</p>
                  <p className="text-xs text-amber-950/80">
                    Changez la photo, précisez la description ou le prix, ou montrez-les en live.
                  </p>
                  <ul className="mt-1 text-sm">
                    {d.toImprove.map(a => (
                      <li key={a.id}>
                        {a.title} · {a.views} visites
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-ink/[0.06] p-4 space-y-4">
              <div data-testid="mp-dash-channels">
                <p className="font-semibold">D'où viennent mes ventes</p>
                {channels > 0 ? (
                  <>
                    <div className="mt-2 flex h-3 rounded-full overflow-hidden bg-ink/10">
                      <span className="bg-red-600" style={{ width: `${(d.channels.live / channels) * 100}%` }} />
                      <span className="bg-emerald-600" style={{ width: `${(d.channels.negocie / channels) * 100}%` }} />
                      <span className="bg-ink" style={{ width: `${(d.channels.affiche / channels) * 100}%` }} />
                    </div>
                    <ul className="mt-2 text-sm space-y-0.5">
                      <li>
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 mr-1.5" />
                        Lives : {F(d.channels.live)}
                      </li>
                      <li>
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1.5" />
                        Prix négocié en discutant : {F(d.channels.negocie)}
                      </li>
                      <li>
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-ink mr-1.5" />
                        Prix affiché : {F(d.channels.affiche)}
                      </li>
                    </ul>
                  </>
                ) : (
                  <p className="text-sm text-ink/60 mt-1">Pas encore de vente livrée sur la période.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold">Paiements</p>
                  {Object.entries(d.payments).map(([k, n]) => (
                    <p key={k}>
                      {PAYMENT_LABELS[k as keyof typeof PAYMENT_LABELS] ?? k} : {n}
                    </p>
                  ))}
                  {!Object.keys(d.payments).length && <p className="text-ink/60">—</p>}
                </div>
                <div>
                  <p className="font-semibold">Livraisons</p>
                  {Object.entries(d.deliveryModes).map(([k, n]) => (
                    <p key={k}>
                      {MODES[k] ?? k} : {n}
                    </p>
                  ))}
                  {!Object.keys(d.deliveryModes).length && <p className="text-ink/60">—</p>}
                </div>
              </div>
            </div>
          </div>

          {d.lives.length > 0 && (
            <div className="bg-white rounded-2xl border border-ink/[0.06] p-4" data-testid="mp-dash-lives">
              <p className="font-semibold">Mes lives</p>
              <ul className="mt-2 divide-y divide-ink/[0.06] text-sm">
                {d.lives.map(l => (
                  <li key={l.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="font-semibold flex-1 min-w-[10rem] truncate">{l.title}</span>
                    <span className="text-ink/60">{new Date(l.startedAt).toLocaleDateString('fr-FR')}</span>
                    <span>{l.sales} commande(s)</span>
                    <span className="font-bold">{F(l.amount)}</span>
                    <span className="text-ink/60">{l.peak} spectatrice(s)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
