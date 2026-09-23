import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Eye, Loader2, Mic, Search, Send, Share2, Square, Store, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../data/types';
import {
  deleteVoice, getServerStatus, getShowcase, getVisitStats, listVoices, setShowcase, uploadVoice, voiceUrl,
  type ShowcaseItem, type VisitStats,
} from '../services/api';
import { formatPrice } from '../utils/format';
import { displayLink, productCode, showcaseLink, shortLink, statusCaption, statusReply } from '../utils/share';
import { renderStatusImageSafe } from '../utils/statusImage';
import { ProductImage } from '../components/ProductImage';

const adminPin = () => { try { return sessionStorage.getItem('fabima_admin_pin') ?? ''; } catch { return ''; } };

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Onglet « Statut WhatsApp » de l'espace gérant. */
export const StatusTab: React.FC = () => {
  const { products, notify } = useStore();
  const [serverOk, setServerOk] = useState(false);
  const [showcase, setShowcaseState] = useState<ShowcaseItem[]>([]);
  const [visits, setVisits] = useState<VisitStats>({});
  const [voices, setVoices] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);

  const refresh = () => {
    getShowcase().then(items => setShowcaseState(items ?? []));
    getVisitStats(adminPin()).then(v => setVisits(v ?? {}));
    listVoices().then(setVoices);
  };
  useEffect(() => {
    getServerStatus().then(s => setServerOk(!!s.storage));
    refresh();
  }, []);

  const inShowcase = (slug: string) => showcase.some(s => s.slug === slug);
  const toggleShowcase = async (p: Product) => {
    const items = await setShowcase(p.slug, inShowcase(p.slug) ? 'remove' : 'add', adminPin());
    if (items) { setShowcaseState(items); notify(inShowcase(p.slug) ? 'Retirée de la vitrine' : 'Ajoutée à la vitrine du jour'); } else notify('Serveur indisponible', 'error');
  };

  const list = useMemo(() => products
    .filter(p => `${p.name} ${p.subcategory}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(inShowcase(b.slug)) - Number(inShowcase(a.slug)) || (visits[b.slug]?.statut ?? 0) - (visits[a.slug]?.statut ?? 0)),
  [products, q, showcase, visits]); // inShowcase dépend de showcase

  const totalStatusVisits = Object.values(visits).reduce((s, v) => s + v.statut + v.vitrine, 0);
  const showcaseProducts = showcase.map(s => products.find(p => p.slug === s.slug)).filter((p): p is Product => !!p);

  const shareShowcase = async () => {
    const text = `✨ Toutes mes nouveautés du jour sont ici 👇\n${showcaseLink()}`;
    if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* annulé */ } }
    notify(await copy(text) ? 'Texte copié : collez-le dans un statut texte' : text, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Mode d'emploi en 3 images */}
      <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
        <h2 className="font-display text-2xl">Vendre avec votre statut WhatsApp</h2>
        <ol className="mt-5 grid sm:grid-cols-3 gap-3">
          {[
            ['👆', 'Touchez une pièce ci-dessous'],
            ['📤', 'Touchez « Publier sur mon statut »'],
            ['✅', 'Dans WhatsApp, choisissez « Mon statut »'],
          ].map(([emoji, text], i) => (
            <li key={text} className="flex items-center gap-4 p-4 rounded-2xl bg-ivory-deep/60">
              <span className="text-4xl">{emoji}</span>
              <span className="text-sm"><strong className="block text-gold-dark">Étape {i + 1}</strong>{text}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-ink/70 mt-4">Vos clientes touchent le lien sous la photo et arrivent sur une page très simple : photo, prix en gros, couleurs, 🔊 votre voix et un gros bouton « Commander sur WhatsApp ».</p>
        {!serverOk && <p className="mt-3 text-xs p-3 rounded-xl bg-amber-50 text-amber-900">Serveur non démarré : l'image et le lien fonctionnent, mais la vitrine du jour, les notes vocales et les compteurs de visites demandent le serveur (npm run server).</p>}
      </div>

      {/* Vitrine du jour */}
      <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">Vitrine du jour <span className="text-ink/70 text-base">({showcaseProducts.length})</span></h2>
            <p className="text-xs text-ink/70 mt-1">Un seul lien pour toutes vos pièces du statut : <a href="/s" target="_blank" className="underline">{window.location.host}/s</a> · {totalStatusVisits} visite(s) depuis vos statuts</p>
          </div>
          <button onClick={shareShowcase} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1f8f4e] text-white text-sm font-semibold"><Share2 className="w-4 h-4" /> Partager la vitrine</button>
        </div>
        {showcaseProducts.length > 0 ? (
          <ul className="mt-4 flex gap-3 overflow-x-auto no-scrollbar">
            {showcaseProducts.map(p => (
              <li key={p.id} className="relative shrink-0 w-24">
                <ProductImage src={p.images[0]} alt={p.name} label="" className="w-24 h-28 rounded-2xl" />
                <button onClick={() => toggleShowcase(p)} aria-label={`Retirer ${p.name}`} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white shadow grid place-items-center"><X className="w-3.5 h-3.5" /></button>
                <p className="text-[11px] mt-1 line-clamp-1">{p.name}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-ink/70 mt-4">Aucune pièce pour l'instant. Ouvrez une pièce et touchez « Ajouter à la vitrine ».</p>}
      </div>

      {/* Pièces */}
      <div className="bg-white border border-ink/[0.06] rounded-[2rem] p-6">
        <div className="flex items-center gap-2 px-4 rounded-full bg-ivory-deep/60 mb-5">
          <Search className="w-4 h-4 text-ink/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une pièce" aria-label="Chercher une pièce" className="flex-1 py-3 bg-transparent outline-none text-sm" />
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {list.map(p => {
            const v = visits[p.slug];
            return (
              <li key={p.id}>
                <button onClick={() => setSelected(p)} className="group w-full text-left">
                  <div className="relative rounded-2xl overflow-hidden">
                    <ProductImage src={p.images[0]} alt={p.name} className="w-full aspect-[4/5] group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 flex gap-1">
                      {inShowcase(p.slug) && <span className="px-2 py-0.5 rounded-full bg-[#1f8f4e] text-white text-[10px] font-bold">En vitrine</span>}
                      {voices.includes(p.slug) && <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold">🎙 Voix</span>}
                    </div>
                    {!!v && <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-ink/80 text-ivory text-[10px] inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {v.statut + v.vitrine + v.partage}</span>}
                  </div>
                  <p className="text-sm mt-2 line-clamp-1">{p.name}</p>
                  <p className="text-xs text-ink/70">{formatPrice(p.price)} · lien /p/{productCode(p)}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected && (
        <StatusStudio product={selected} serverOk={serverOk} inShowcase={inShowcase(selected.slug)} hasVoice={voices.includes(selected.slug)}
          visits={visits[selected.slug]} onToggleShowcase={() => toggleShowcase(selected)} onClose={() => { setSelected(null); refresh(); }} />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Studio : image du statut, texte, voix, vitrine                     */
/* ------------------------------------------------------------------ */

const StatusStudio: React.FC<{
  product: Product; serverOk: boolean; inShowcase: boolean; hasVoice: boolean;
  visits?: VisitStats[string]; onToggleShowcase: () => void; onClose: () => void;
}> = ({ product, serverOk, inShowcase, hasVoice, visits, onToggleShowcase, onClose }) => {
  const { notify } = useStore();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState(() => statusCaption(product));

  useEffect(() => {
    let url = '';
    renderStatusImageSafe(product).then(b => { setBlob(b); url = URL.createObjectURL(b); setPreview(url); });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [product]);

  const fileName = `statut-${product.slug}.jpg`;

  const publish = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    await copy(caption); // si WhatsApp n'affiche pas le texte, il suffit de le coller
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: caption });
        notify('Choisissez « Mon statut » dans WhatsApp');
        return;
      } catch { /* partage annulé */ }
    }
    download(blob, fileName);
    notify('Image téléchargée et texte copié : ajoutez l\'image à votre statut puis collez le texte', 'info');
  };

  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4" onKeyDown={onKey}>
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div role="dialog" aria-label={`Statut : ${product.name}`} className="relative bg-ivory w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-7 animate-fade-up">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white grid place-items-center shadow-sm"><X className="w-5 h-5" /></button>
        <h2 className="font-display text-3xl pr-12">{product.name}</h2>
        <p className="text-sm text-ink/70 mt-1">Lien court : <a href={`/p/${productCode(product)}`} target="_blank" className="underline font-semibold">{displayLink(product)}</a>
          {visits && <> · <Eye className="inline w-3.5 h-3.5" /> {visits.statut} depuis le statut, {visits.vitrine} depuis la vitrine</>}</p>

        <div className="mt-5 grid md:grid-cols-[280px_1fr] gap-6">
          {/* Aperçu de l'image */}
          <div className="mx-auto w-full max-w-[280px]">
            <div className="aspect-[9/16] rounded-[1.75rem] overflow-hidden bg-white shadow-soft grid place-items-center">
              {preview ? <img src={preview} alt="Aperçu du statut" className="w-full h-full object-cover" /> : <Loader2 className="w-8 h-8 animate-spin text-gold" />}
            </div>
          </div>

          <div className="space-y-4">
            <button onClick={publish} disabled={!blob} className="w-full h-16 rounded-full bg-[#1f8f4e] text-white text-lg font-extrabold inline-flex items-center justify-center gap-3 shadow-luxe disabled:opacity-50">
              <Send className="w-6 h-6" /> Publier sur mon statut
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => blob && download(blob, fileName)} disabled={!blob} className="h-12 rounded-full bg-white border border-ink/10 text-sm font-semibold inline-flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Image</button>
              <button onClick={async () => notify(await copy(caption) ? 'Texte copié' : 'Copie impossible', 'info')} className="h-12 rounded-full bg-white border border-ink/10 text-sm font-semibold inline-flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Texte</button>
            </div>
            <label className="block">
              <span className="field-label">Texte sous la photo (le lien y est cliquable)</span>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={6} className="field text-sm resize-none" />
            </label>

            <button onClick={onToggleShowcase} disabled={!serverOk}
              className={`w-full h-12 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 ${inShowcase ? 'bg-emerald-100 text-emerald-800' : 'bg-ink text-ivory'}`}>
              {inShowcase ? <><Check className="w-4 h-4" /> Dans la vitrine du jour (retirer)</> : <><Store className="w-4 h-4" /> Ajouter à la vitrine du jour</>}
            </button>

            <VoiceRecorder product={product} serverOk={serverOk} hasVoice={hasVoice} />

            <div className="p-4 rounded-2xl bg-white border border-ink/[0.06]">
              <p className="text-sm font-semibold">Une cliente répond à votre statut ?</p>
              <p className="text-xs text-ink/70 mt-1">Envoyez-lui cette réponse toute prête avec le lien.</p>
              <button onClick={async () => notify(await copy(statusReply(product)) ? 'Réponse copiée : collez-la dans la discussion' : statusReply(product), 'info')}
                className="mt-3 h-10 px-4 rounded-full bg-blush/60 text-sm inline-flex items-center gap-2"><Copy className="w-4 h-4" /> Copier la réponse</button>
            </div>
            <p className="text-[11px] text-ink/70">Astuce : le lien <strong>{shortLink(product).replace(/^https?:\/\//, '')}</strong> est aussi écrit en grand sur l'image, pour celles qui préfèrent le taper.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Enregistrement de la voix de la gérante                           */
/* ------------------------------------------------------------------ */

const MAX_SECONDS = 60;
const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';

const VoiceRecorder: React.FC<{ product: Product; serverOk: boolean; hasVoice: boolean }> = ({ product, serverOk, hasVoice }) => {
  const { notify } = useStore();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [saved, setSaved] = useState(hasVoice);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number>();
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  useEffect(() => () => { window.clearInterval(timerRef.current); recRef.current?.stream.getTracks().forEach(t => t.stop()); }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setClip(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }));
      };
      rec.start();
      recRef.current = rec;
      setClip(null);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      notify('Micro inaccessible : autorisez le micro dans votre navigateur', 'error');
    }
  };
  const stop = () => {
    window.clearInterval(timerRef.current);
    if (recRef.current?.state === 'recording') recRef.current.stop();
    setRecording(false);
  };
  // Arrêt automatique à la durée maximale
  useEffect(() => { if (recording && seconds >= MAX_SECONDS) stop(); }, [recording, seconds]);
  const clipUrl = useMemo(() => (clip ? URL.createObjectURL(clip) : ''), [clip]);
  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);

  const save = async () => {
    if (!clip) return;
    setBusy(true);
    const ok = await uploadVoice(product.slug, clip, adminPin());
    setBusy(false);
    if (ok) { setSaved(true); setClip(null); notify('Votre voix est en ligne 🎙'); } else notify('Enregistrement non envoyé (serveur ou code PIN)', 'error');
  };
  const remove = async () => {
    if (await deleteVoice(product.slug, adminPin())) { setSaved(false); notify('Note vocale supprimée', 'info'); }
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-ivory-deep to-blush/40">
      <p className="text-sm font-semibold">🎙 Votre voix pour cette pièce</p>
      <p className="text-xs text-ink/75 mt-1">Présentez la pièce en wolof ou en français (1 minute maximum) : vos clientes l'écoutent en touchant 🔊.</p>
      {!supported || !serverOk ? (
        <p className="text-xs text-ink/70 mt-3">{!serverOk ? 'Disponible quand le serveur est démarré.' : 'Enregistrement non pris en charge par ce navigateur.'}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recording ? (
            <button onClick={stop} className="h-12 px-5 rounded-full bg-wine text-white font-semibold inline-flex items-center gap-2 animate-pulse">
              <Square className="w-4 h-4" fill="currentColor" /> Arrêter · {seconds}s
            </button>
          ) : (
            <button onClick={start} className="h-12 px-5 rounded-full bg-ink text-ivory font-semibold inline-flex items-center gap-2">
              <Mic className="w-4 h-4" /> {saved || clip ? 'Réenregistrer' : 'Enregistrer ma voix'}
            </button>
          )}
          {clip && !recording && (
            <>
              <audio controls src={clipUrl} className="h-10 max-w-[200px]" />
              <button onClick={save} disabled={busy} className="h-12 px-5 rounded-full bg-[#1f8f4e] text-white font-semibold inline-flex items-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mettre en ligne
              </button>
            </>
          )}
          {saved && !clip && !recording && (
            <>
              <audio controls src={`${voiceUrl(product.slug)}?t=${Date.now()}`} className="h-10 max-w-[200px]" />
              <button onClick={remove} aria-label="Supprimer la note vocale" className="h-10 w-10 rounded-full bg-white grid place-items-center"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
