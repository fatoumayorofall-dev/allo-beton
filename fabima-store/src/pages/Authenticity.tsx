import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, MessageCircle, QrCode, Search, ShieldCheck, XCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';
import { verifyAuthCode, type AuthCheck } from '../services/api';
import { usePageTitle } from '../utils/usePageTitle';

const formatDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Vérification d'une pièce Fabima : la cliente scanne le QR de l'étiquette (lien /authentique/CODE)
 * ou tape le code. Le serveur confirme l'origine et compte les vérifications.
 */
export const Authenticity: React.FC = () => {
  usePageTitle('Vérifier l\'authenticité', 'Scannez l\'étiquette de votre pièce Fabima ou saisissez son code : nous vous confirmons qu\'elle est authentique.', { canonicalPath: '/authentique' });
  const { code: fromUrl } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(fromUrl ?? '');
  const [result, setResult] = useState<AuthCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = async (code: string) => {
    setBusy(true); setError('');
    const r = await verifyAuthCode(code);
    setBusy(false);
    if (r.ok) setResult(r.data); else { setResult(null); setError(r.error); }
  };
  useEffect(() => { if (fromUrl) { setInput(fromUrl); check(fromUrl); } }, [fromUrl]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) return;
    if (fromUrl === clean) check(clean); else navigate(`/authentique/${encodeURIComponent(clean)}`);
  };
  const report = buildWhatsAppLink(`Bonjour Fabima Store, je signale une étiquette douteuse (code : ${input || 'illisible'}). Pièce achetée à : `);

  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-10 sm:pt-16">
      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-10 lg:gap-16 items-start">
        <div>
          <p className="eyebrow inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Anti-contrefaçon</p>
          <h1 className="font-display text-5xl sm:text-6xl leading-[1] mt-4">Vérifier <em className="text-gold-dark">l'authenticité</em></h1>
          <p className="mt-5 text-ink/75 leading-relaxed max-w-lg">Chaque pièce Fabima porte une étiquette numérotée avec un QR code. Scannez-le avec l'appareil photo de votre téléphone, ou saisissez le code imprimé dessous.</p>

          <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
            <label className="relative flex-1">
              <QrCode className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/60" />
              <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXX" aria-label="Code de l'étiquette"
                autoComplete="off" spellCheck={false} className="field !pl-11 tracking-[0.15em] font-semibold" data-testid="auth-input" />
            </label>
            <button disabled={busy} className="btn-dark"><Search className="w-4 h-4" /> {busy ? 'Vérification…' : 'Vérifier'}</button>
          </form>
          {error && <p className="mt-3 text-sm text-wine" role="alert">{error}</p>}

          {result && <ResultCard result={result} report={report} />}
        </div>

        <aside className="rounded-[2.5rem] bg-white border border-ink/[0.06] p-6 sm:p-8">
          <h2 className="font-display text-3xl">Reconnaître une vraie pièce</h2>
          <div className="mt-6 grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] gap-5 items-center">
            <img src="/brand/fabima-securite.png" alt="L'écrin Fabima, édition sécurisée" className="w-full h-auto" loading="lazy" />
            <ul className="space-y-4 text-sm text-ink/75">
              <li><strong className="block font-display text-lg text-ink">L'écrin</strong>Une arche prune, un F italique or rose et un paraphe.</li>
              <li><strong className="block font-display text-lg text-ink">Le guilloché</strong>Deux anneaux de lignes entrelacées, comme sur un billet de banque.</li>
            </ul>
          </div>
          <figure className="mt-6 grid grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr] gap-5 items-center">
            <img src="/brand/fabima-securite-loupe.jpg" alt="Micro-texte et guilloché vus à la loupe" className="w-full aspect-square object-cover rounded-full border-4 border-ivory-deep" loading="lazy" />
            <figcaption className="text-sm text-ink/75"><strong className="block font-display text-lg text-ink">Le micro-texte</strong>Le filet de l'arche est en réalité une phrase : à la loupe, on lit « FABIMA STORE · DAKAR · AUTHENTIQUE ». Sur une copie, c'est un trait flou.</figcaption>
          </figure>
          <p className="mt-6 text-sm text-ink/75"><strong className="text-ink">Et nos marques secrètes :</strong> quelques détails que seule notre équipe connaît. Envoyez-nous une photo de l'étiquette sur WhatsApp, nous vérifions pour vous.</p>
        </aside>
      </div>
    </div>
  );
};

const ResultCard: React.FC<{ result: AuthCheck; report: string }> = ({ result, report }) => {
  const ok = result.status === 'authentique' || result.status === 'deja-verifie';
  const Icon = ok ? BadgeCheck : result.status === 'suspect' ? AlertTriangle : XCircle;
  const tone = ok ? 'border-emerald-600/25 bg-emerald-50' : result.status === 'suspect' ? 'border-amber-500/30 bg-amber-50' : 'border-wine/25 bg-wine/[0.05]';
  const iconTone = ok ? 'text-emerald-700' : result.status === 'suspect' ? 'text-amber-700' : 'text-wine';
  const title = {
    authentique: 'Pièce authentique',
    'deja-verifie': 'Pièce authentique',
    suspect: 'Attention : étiquette peut-être copiée',
    inconnu: 'Code inconnu',
    invalide: 'Code incorrect',
  }[result.status];
  return (
    <div className={`mt-8 max-w-lg rounded-[2rem] border p-6 ${tone}`} role="status" data-testid="auth-result" data-status={result.status}>
      <p className="flex items-center gap-3 font-display text-3xl"><Icon className={`w-8 h-8 shrink-0 ${iconTone}`} strokeWidth={1.6} /> {title}</p>
      {ok && (
        <div className="mt-4 text-sm text-ink/80 space-y-1.5">
          <p>{result.productSlug ? <Link to={`/produit/${result.productSlug}`} className="font-semibold underline underline-offset-4">{result.productName}</Link> : <strong>{result.productName}</strong>}, étiquette émise par Fabima Store le {formatDay(result.issuedAt)}.</p>
          {result.status === 'authentique'
            ? <p>C'est la première vérification de cette étiquette.</p>
            : <p>Cette étiquette a déjà été vérifiée {result.scans} fois (la première le {formatDay(result.firstScanAt)}). Si votre pièce est neuve et que vous ne l'avez jamais scannée, écrivez-nous.</p>}
        </div>
      )}
      {result.status === 'suspect' && <p className="mt-4 text-sm text-ink/80">Ce code a été vérifié {result.scans} fois : une étiquette authentique n'est scannée que par sa propriétaire. Elle a sans doute été photocopiée. Si vous venez d'acheter cette pièce ailleurs que chez Fabima, il peut s'agir d'une contrefaçon.</p>}
      {result.status === 'inconnu' && <p className="mt-4 text-sm text-ink/80">Ce code n'a jamais été émis par Fabima Store. La pièce qui le porte n'est pas une pièce Fabima.</p>}
      {result.status === 'invalide' && <p className="mt-4 text-sm text-ink/80">Vérifiez la saisie : le code a 11 caractères, par exemple « K7QM-2HXD-9RP ». Les lettres O et I se lisent comme 0 et 1.</p>}
      {!ok && result.status !== 'invalide' && (
        <a href={report} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#1f8f4e] text-white text-sm font-semibold"><MessageCircle className="w-4 h-4" /> Signaler sur WhatsApp</a>
      )}
    </div>
  );
};
