import React, { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Printer, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { createAuthCodes, fetchAuthCodes, fetchSecureMark, type AuthCode } from '../services/api';
import { formatDate } from '../utils/format';

const SUSPICIOUS_AFTER = 5;

/**
 * Espace gérant · Authenticité : une étiquette numérotée par pièce vendue.
 * Chaque étiquette porte l'écrin sécurisé (guilloché, micro-texte, marques secrètes de la boutique),
 * un code unique et un QR qui mène à la page de vérification.
 */
export const AuthenticityTab: React.FC<{ pin: string }> = ({ pin }) => {
  const { products } = useStore();
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [orderId, setOrderId] = useState('');
  const [batch, setBatch] = useState<AuthCode[]>([]);
  const [codes, setCodes] = useState<AuthCode[] | null>(null);
  const [mark, setMark] = useState<{ url: string; marks: string[] } | null>(null);
  const [showMarks, setShowMarks] = useState(false);
  const [qr, setQr] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchAuthCodes(pin).then(setCodes);
    let url = '';
    fetchSecureMark(pin).then(r => { if (r) { url = URL.createObjectURL(new Blob([r.svg], { type: 'image/svg+xml' })); setMark({ url, marks: r.marks }); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [pin]);

  // QR codes des étiquettes à imprimer (bibliothèque chargée seulement ici)
  useEffect(() => {
    if (!batch.length) return;
    let alive = true;
    import('qrcode').then(async QR => {
      const entries = await Promise.all(batch.map(async c => [c.code, await QR.toString(`${window.location.origin}/authentique/${c.code}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#3a1f2dff', light: '#ffffff00' } })] as const));
      if (alive) setQr(Object.fromEntries(entries));
    });
    return () => { alive = false; };
  }, [batch]);

  const product = products.find(p => p.id === productId);
  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setBusy(true); setError('');
    const r = await createAuthCodes({ productId: product.id, productSlug: product.slug, productName: product.name, quantity, orderId: orderId.trim() || undefined }, pin);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setBatch(r.data.codes);
    setCodes(c => [...r.data.codes, ...(c ?? [])]);
  };
  const print = () => {
    document.body.classList.add('print-labels');
    const done = () => { document.body.classList.remove('print-labels'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  };
  const stats = useMemo(() => ({ total: codes?.length ?? 0, verified: codes?.filter(c => c.scans > 0).length ?? 0, suspect: codes?.filter(c => c.scans > SUSPICIOUS_AFTER).length ?? 0 }), [codes]);

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-[1fr_0.8fr] gap-6">
        <form onSubmit={generate} className="bg-white rounded-[2rem] border border-ink/[0.06] p-6 sm:p-8">
          <h2 className="font-display text-3xl flex items-center gap-3"><ShieldCheck className="w-7 h-7 text-wine" strokeWidth={1.5} /> Étiquettes d'authenticité</h2>
          <p className="text-sm text-ink/70 mt-2">Une étiquette par pièce vendue : glissez-la dans le sac ou collez-la sur la boîte. La cliente la scanne pour vérifier que sa pièce vient bien de chez vous.</p>
          <div className="mt-6 grid sm:grid-cols-[1fr_120px] gap-3">
            <label className="text-xs"><span className="field-label">Pièce</span>
              <select value={productId} onChange={e => setProductId(e.target.value)} className="field" aria-label="Pièce">
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="text-xs"><span className="field-label">Nombre</span>
              <input type="number" min={1} max={100} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="field" aria-label="Nombre d'étiquettes" />
            </label>
            <label className="text-xs sm:col-span-2"><span className="field-label">N° de commande (facultatif)</span>
              <input value={orderId} onChange={e => setOrderId(e.target.value.toUpperCase())} placeholder="FB-…" className="field" aria-label="Numéro de commande" />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-wine" role="alert">{error}</p>}
          <button disabled={busy || !product} className="btn-dark mt-6">{busy ? 'Création…' : `Créer ${quantity} étiquette${quantity > 1 ? 's' : ''}`}</button>
        </form>

        <div className="bg-ink text-ivory rounded-[2rem] p-6 sm:p-8">
          <p className="eyebrow !text-gold-light">Suivi</p>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            {[['Émises', stats.total], ['Vérifiées', stats.verified], ['Suspectes', stats.suspect]].map(([l, n]) => (
              <div key={l as string}><dt className="text-xs text-ivory/70">{l}</dt><dd className={`font-display text-4xl ${l === 'Suspectes' && n ? 'text-gold-light' : ''}`}>{n}</dd></div>
            ))}
          </dl>
          <button type="button" onClick={() => setShowMarks(v => !v)} className="mt-6 inline-flex items-center gap-2 text-sm text-gold-light">
            {showMarks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} Vos marques secrètes (ne les partagez jamais)
          </button>
          {showMarks && mark && (
            <ul className="mt-3 space-y-1.5 text-sm text-ivory/80 list-disc pl-5" data-testid="secret-marks">{mark.marks.map(m => <li key={m}>{m}</li>)}</ul>
          )}
          <p className="mt-4 text-xs text-ivory/60">Elles n'apparaissent que sur les étiquettes imprimées d'ici. Vérifiez-les à la loupe quand une cliente vous envoie la photo d'une étiquette.</p>
        </div>
      </div>

      {batch.length > 0 && (
        <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h3 className="font-display text-2xl">{batch.length} étiquette{batch.length > 1 ? 's' : ''} prête{batch.length > 1 ? 's' : ''} à imprimer</h3>
            <button onClick={print} className="btn-dark"><Printer className="w-4 h-4" /> Imprimer</button>
          </div>
          <div className="label-sheet grid sm:grid-cols-2 gap-4" data-testid="label-sheet">
            {batch.map(c => (
              <article key={c.code} className="auth-label relative flex gap-4 items-center p-4 rounded-2xl border-2 border-double border-gold/60 bg-ivory">
                {mark ? <img src={mark.url} alt="" className="h-28 w-auto shrink-0" /> : <span className="h-28 w-20 shrink-0 rounded-t-full bg-ink" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase tracking-[0.3em] font-bold text-gold-dark">Certificat d'authenticité</p>
                  <p className="font-display text-lg leading-tight mt-1 line-clamp-2">{c.productName}</p>
                  <p className="mt-2 font-bold tracking-[0.12em] text-sm tabular-nums" data-testid="label-code">{c.code}</p>
                  <p className="text-[9px] text-ink/70 mt-1">Scannez ou saisissez le code sur<br />{window.location.host}/authentique</p>
                </div>
                <span className="w-20 h-20 shrink-0" aria-label={`QR code ${c.code}`} role="img" dangerouslySetInnerHTML={{ __html: qr[c.code] ?? '' }} />
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-6 sm:p-8 overflow-x-auto">
        <h3 className="font-display text-2xl mb-4">Étiquettes émises</h3>
        {!codes ? <p className="text-sm text-ink/70">Serveur indisponible.</p> : codes.length === 0 ? <p className="text-sm text-ink/70">Aucune étiquette pour l'instant.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-[0.15em] text-ink/70"><th className="py-2">Code</th><th>Pièce</th><th>Émise le</th><th>Vérifications</th></tr></thead>
            <tbody>
              {codes.slice(0, 100).map(c => (
                <tr key={c.code} className="border-t border-ink/[0.06]">
                  <td className="py-2.5 font-semibold tabular-nums">{c.code}</td>
                  <td>{c.productName}{c.orderId && <span className="text-ink/70"> · {c.orderId}</span>}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>{c.scans > SUSPICIOUS_AFTER ? <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">{c.scans} · suspecte</span> : c.scans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
