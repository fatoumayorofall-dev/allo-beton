import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, MessageCircle, RotateCcw, Volume2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAccount } from '../context/AccountContext';
import { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { OCCASIONS, CATEGORIES } from '../data/catalog';
import { formatDay, upcomingFetes } from '../utils/fetes';
import { FAQ_ITEMS } from '../data/faq';
import type { Product } from '../data/types';
import { getServerStatus, listVoices, streamChat, voiceUrl, type ChatTurn } from '../services/api';
import { WOLOF_GUIDE, guideVoiceSlug, type GuideTopic } from '../data/wolofGuide';
import { VoiceToWhatsApp } from './VoiceToWhatsApp';
import { ShopAdvisor } from './ShopAdvisor';
import { voiceForReply } from '../data/wolofVoices';
import { ADVISOR_TEXT } from '../utils/shopAdvisor';
import { newBrainState, reply as brainReply, type BrainState } from '../assistant/brain';
import { formatPrice } from '../utils/format';
import { useEscape } from '../utils/hooks';
import { ProductImage } from './ProductImage';
import { OPEN_ASSISTANT_EVENT } from './assistantBus';
import { speak } from '../utils/speak';

/** Texte à lire à voix haute : sans liens, sans gras, sans émojis. */
const spoken = (md: string) => md.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#>]/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim();


const STORAGE_KEY = 'maefa_assistant';
const SUGGESTIONS = ['Une tenue pour un mariage', 'Délais et frais de livraison', 'Où en est ma commande ?', 'Une idée cadeau à moins de 20 000'];
const LANG_KEY = 'maefa_lang';
const WELCOME_WO = 'Salaam aleekum ! Maa ngi tudd **Maé**, ci Maefa 🌸 Bësal ci nataal yi ngir déglu, walla bësal **micro** bi te wax ak nun ci wolof.';
const WELCOME = 'Bonjour, je suis **Maé**, votre conseillère Maefa 🌸 Je peux vous proposer une tenue, répondre sur la livraison, le paiement ou suivre votre commande. Comment puis-je vous aider ?';

/* ---------- Rendu Markdown minimal : gras, liens internes/externes, listes ---------- */
function renderInline(text: string, onNavigate: () => void): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      out.push(href.startsWith('/')
        ? <Link key={k++} to={href} onClick={onNavigate} className="underline decoration-gold/60 underline-offset-2 font-medium hover:text-gold-dark">{m[1]}</Link>
        : <a key={k++} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{m[1]}</a>);
    } else if (m[3]) out.push(<strong key={k++}>{m[3]}</strong>);
    else if (m[4]) out.push(<em key={k++}>{m[4]}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const RichText: React.FC<{ text: string; onNavigate: () => void }> = ({ text, onNavigate }) => {
  const blocks = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  const flush = () => { if (list.length) { nodes.push(<ul key={`l${nodes.length}`} className="my-1.5 space-y-1 pl-4 list-disc marker:text-gold">{list}</ul>); list = []; } };
  blocks.forEach((line, i) => {
    const item = line.match(/^\s*[-•*]\s+(.*)/) || line.match(/^\s*\d+[.)]\s+(.*)/);
    if (item) { list.push(<li key={i}>{renderInline(item[1], onNavigate)}</li>); return; }
    flush();
    if (line.trim()) nodes.push(<p key={i} className="[&+p]:mt-2">{renderInline(line.replace(/^#+\s*/, ''), onNavigate)}</p>);
  });
  flush();
  return <>{nodes}</>;
};

/** Pièces citées dans une réponse (liens /produit/slug), affichées en vignettes. */
const CitedProducts: React.FC<{ text: string; getProduct: (s: string) => Product | undefined; onNavigate: () => void }> = ({ text, getProduct, onNavigate }) => {
  const slugs = [...new Set([...text.matchAll(/\(\/produit\/([a-z0-9-]+)\)/g)].map(m => m[1]))].slice(0, 3);
  const items = slugs.map(getProduct).filter((p): p is Product => !!p);
  if (!items.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
      {items.map(p => (
        <Link key={p.id} to={`/produit/${p.slug}`} onClick={onNavigate} className="shrink-0 w-32 rounded-2xl bg-white border border-ink/[0.06] overflow-hidden hover:shadow-soft transition-shadow">
          <ProductImage src={p.images[0]} alt={p.name} label="" className="w-full h-28" sizes="200px" />
          <div className="p-2">
            <p className="text-[11px] leading-tight line-clamp-2">{p.name}</p>
            <p className="text-[11px] font-semibold mt-1">{formatPrice(p.price)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

/** Panneau de l'assistante. Chargé à la première ouverture : `initial` porte cette première demande. */
export const Assistant: React.FC<{ initial?: { question?: string } }> = ({ initial }) => {
  const { products, cart, orders, getProduct } = useStore();
  const account = useAccount();
  const location = useLocation();
  const [open, setOpen] = useState(!!initial);
  const [mode, setMode] = useState<'ia' | 'local' | 'unknown'>('unknown');
  const [messages, setMessages] = useState<ChatTurn[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [lang, setLangState] = useState<'fr' | 'wo'>(() => { try { return localStorage.getItem(LANG_KEY) === 'wo' ? 'wo' : 'fr'; } catch { return 'fr'; } });
  const setLang = (l: 'fr' | 'wo') => { setLangState(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ } };
  const [voices, setVoices] = useState<string[]>([]);
  const player = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [advisor, setAdvisor] = useState(false);
  // Mémoire de la conversation de Maé (sans IA payante) : souhaits, pointure, pièces montrées
  const brain = useRef<BrainState>((() => {
    try { const b = JSON.parse(sessionStorage.getItem('maefa_brain') || 'null'); if (b?.wishes) return b; } catch { /* ignore */ }
    let size: string | undefined; try { size = localStorage.getItem('maefa_pointure') ?? undefined; } catch { /* ignore */ }
    return newBrainState(lang, size);
  })());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pending = useRef<string | null>(initial?.question ?? null);

  useEscape(open, () => setOpen(false));

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string | undefined>).detail;
      if (q) pending.current = q;
    };
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    getServerStatus().then(s => setMode(s.assistant ? 'ia' : 'local'));
    listVoices().then(v => setVoices(v ?? [])).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Contexte boutique transmis à l'IA : stable d'une question à l'autre (mise en cache côté API).
  const shop = useMemo(() => ({
    phone: SITE_CONFIG.phone, whatsapp: SITE_CONFIG.whatsappRaw, address: SITE_CONFIG.address, hours: SITE_CONFIG.hours,
    giftWrapFee: SITE_CONFIG.giftWrapFee,
    zones: DELIVERY_ZONES, promos: PROMO_CODES, faq: FAQ_ITEMS, occasions: OCCASIONS.map(o => `${o.id} = ${o.name}`),
    categories: CATEGORIES.map(c => c.name),
    fetes: upcomingFetes().slice(0, 6).map(f => `${f.name} : ${f.lunar ? 'vers le ' : ''}${formatDay(f.date)} ${f.date.getFullYear()}`),
  }), []);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const history: ChatTurn[] = [...messages, { role: 'user', content: q }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    const status = await getServerStatus();
    const answerLocally = () => {
      setMode('local');
      const r = brainReply(q, brain.current, { products, orders, lang, cartTotal: cart.reduce((n, i) => n + i.price * i.quantity, 0), firstName: account.user?.firstName || undefined, hour: new Date().getHours() });
      brain.current = r.state;
      try {
        sessionStorage.setItem('maefa_brain', JSON.stringify(r.state));
        if (r.state.wishes.size) localStorage.setItem('maefa_pointure', r.state.wishes.size);
      } catch { /* ignore */ }
      // En wolof : Maé répond aussi avec la voix de la gérante, si la phrase est enregistrée
      const voice = r.state.lang === 'wo' ? voiceForReply(r) : null;
      const withVoice = voice && voices.includes(voice) ? voice : undefined;
      setMessages([...history, { role: 'assistant', content: r.text, chips: r.chips, voice: withVoice }]);
      if (withVoice) playVoice(withVoice, `msg-${history.length}`);
    };
    if (!status.assistant) { answerLocally(); setBusy(false); return; }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let received = '';
    try {
      await streamChat({
        messages: history,
        shop,
        products,
        visitor: { page: location.pathname + location.search, cart, orders: orders.slice(0, 10), pointure: (() => { try { return localStorage.getItem('maefa_pointure') ?? undefined; } catch { return undefined; } })() },
        lang,
      }, chunk => {
        received += chunk;
        setMessages([...history, { role: 'assistant', content: received }]);
      }, ctrl.signal);
      if (!received.trim()) answerLocally();
      else {
        // Pointure retenue par l'assistante : gardée sur ce téléphone, ligne technique retirée
        const m = received.match(/\[\[pointure:(\d{2})\]\]/);
        if (m) { try { localStorage.setItem('maefa_pointure', m[1]); } catch { /* ignore */ } }
        setMessages([...history, { role: 'assistant', content: received.replace(/\s*\[\[pointure:\d{2}\]\]\s*/g, '').trim() }]);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setMessages([...history, { role: 'assistant', content: received || '…' }]);
      } else if (received) {
        setMessages([...history, { role: 'assistant', content: `${received}\n\n_(réponse interrompue)_` }]);
      } else {
        answerLocally();
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  useEffect(() => {
    if (open && pending.current && !busy) {
      const q = pending.current;
      pending.current = null;
      ask(q);
    }
  }); // exécute la question demandée à l'ouverture

  /** Sujet du guide wolof : la note vocale de la gérante (si enregistrée) et le texte dans la conversation. */
  /** Fait écouter une voix enregistrée par la gérante (une seule à la fois). */
  const playVoice = (slug: string, tag = slug) => {
    if (!voices.includes(slug)) return false;
    player.current?.pause();
    const a = new Audio(voiceUrl(slug));
    player.current = a;
    setPlaying(tag);
    a.onended = () => setPlaying(p => (p === tag ? null : p));
    a.play().catch(() => setPlaying(null));
    return true;
  };

  const playTopic = (g: GuideTopic) => {
    const slug = guideVoiceSlug(g.id);
    player.current?.pause();
    if (voices.includes(slug)) {
      const a = new Audio(voiceUrl(slug));
      player.current = a;
      setPlaying(g.id);
      a.onended = () => setPlaying(p => (p === g.id ? null : p));
      a.play().catch(() => setPlaying(null));
    }
    setMessages(m => [...m, { role: 'user', content: `${g.emoji} ${g.wo}` }, { role: 'assistant', content: `${g.textWo}${g.link ? `\n\n[${g.link.wo}](${g.link.to})` : ''}` }]);
  };
  useEffect(() => () => player.current?.pause(), []);

  const lastQuestion = [...messages].reverse().find(m => m.role === 'user')?.content;
  const handoff = buildWhatsAppLink(lang === 'wo'
    ? `Salaam aleekum Maefa 🌸 ${lastQuestion ? `Sama laaj : ${lastQuestion}` : 'Dama bëgg wax ak yeen.'}`
    : `Bonjour Maefa Store 🌸 ${lastQuestion ? `J'ai une question : ${lastQuestion}` : 'J\'ai besoin d\'un conseil.'}`);
  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-5 z-[90] sm:w-[400px] sm:h-[620px] sm:max-h-[calc(100vh-8rem)] flex flex-col bg-ivory sm:rounded-[2rem] shadow-luxe border border-ink/[0.06] overflow-hidden animate-fade-up"
      role="dialog" aria-label="Assistante Maefa">
      {/* En-tête */}
      <header className="flex items-center gap-3 px-5 py-4 bg-ink text-ivory">
        <span className="w-11 h-11 rounded-full bg-gradient-to-br from-blush to-gold grid place-items-center font-script text-2xl text-ink shrink-0">M</span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl leading-none">Maé</p>
          <p className="text-[11px] text-ivory/60 mt-1 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'ia' ? 'bg-emerald-400' : 'bg-gold-light'}`} />
            {lang === 'wo' ? (mode === 'ia' ? 'IA · mu ngi tontu léegi' : 'Tontu yu gaaw') : mode === 'ia' ? 'Conseillère IA · répond en direct' : mode === 'local' ? 'Répond tout de suite' : 'Conseillère Maefa'}
          </p>
        </div>
        <div className="flex rounded-full bg-ivory/10 p-0.5 text-[11px] font-semibold" role="group" aria-label="Langue / Làkk">
          {(['fr', 'wo'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} data-testid={`lang-${l}`}
              className={`px-2.5 h-8 rounded-full transition-colors ${lang === l ? 'bg-gold-light text-ink' : 'text-ivory/75 hover:text-ivory'}`}>
              {l === 'fr' ? 'FR' : '🇸🇳 Wolof'}
            </button>
          ))}
        </div>
        {(messages.length > 0 || advisor) && (
          <button onClick={() => { abortRef.current?.abort(); setMessages([]); setAdvisor(false); brain.current = newBrainState(lang, brain.current.wishes.size); try { sessionStorage.removeItem('maefa_brain'); } catch { /* ignore */ } }} aria-label="Nouvelle conversation" title="Nouvelle conversation" className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory/10"><RotateCcw className="w-4 h-4" /></button>
        )}
        <button onClick={close} aria-label="Fermer l'assistante" className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory/10"><X className="w-5 h-5" /></button>
      </header>

      {/* Conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-petal" aria-live="polite">
        <Bubble role="assistant"><RichText text={lang === 'wo' ? WELCOME_WO : WELCOME} onNavigate={close} /></Bubble>
        {messages.length === 0 && !advisor && (
          <button onClick={() => setAdvisor(true)} data-testid="advisor-start"
            className="w-full p-4 rounded-3xl bg-ink text-ivory text-left flex items-center gap-3.5 hover:bg-gold-dark transition-colors shadow-soft">
            <span className="text-4xl leading-none">🛍️</span>
            <span><span className="block font-semibold">{ADVISOR_TEXT.start[lang].replace('🛍️ ', '')}</span><span className="block text-xs text-ivory/70 mt-0.5">{ADVISOR_TEXT.startHint[lang]}</span></span>
          </button>
        )}
        {advisor && messages.length === 0 && <ShopAdvisor key={lang} lang={lang} onNavigate={close} playVoice={lang === 'wo' ? playVoice : undefined} />}
        {lang === 'wo' && messages.length === 0 && !advisor && (
          <div className="grid grid-cols-2 gap-2.5" data-testid="wolof-guide">
            {WOLOF_GUIDE.map(g => {
              const hasVoice = voices.includes(guideVoiceSlug(g.id));
              return (
                <button key={g.id} onClick={() => playTopic(g)} data-testid={`guide-${g.id}`}
                  className={`relative p-3.5 rounded-3xl bg-white border text-left transition-all hover:shadow-soft ${playing === g.id ? 'border-gold ring-4 ring-gold/20' : 'border-ink/[0.07]'}`}>
                  <span className="text-4xl leading-none block">{g.emoji}</span>
                  <span className="block mt-2 text-[13px] font-semibold leading-tight">{g.wo}</span>
                  {hasVoice && <span className={`absolute top-3 right-3 w-8 h-8 rounded-full grid place-items-center ${playing === g.id ? 'bg-gold text-white animate-pulse' : 'bg-ivory text-gold-dark'}`} aria-hidden><Volume2 className="w-4 h-4" /></span>}
                </button>
              );
            })}
          </div>
        )}
        {lang === 'fr' && messages.length === 0 && !advisor && (
          <div className="flex flex-wrap gap-2 pl-1">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => ask(s)} className="px-3.5 py-2 rounded-full bg-white border border-ink/10 text-xs hover:border-gold hover:text-gold-dark transition-colors">{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i}>
            <Bubble role={m.role}>
              {m.role === 'assistant' && !m.content
                ? <span className="inline-flex gap-1 py-1" role="status" aria-label="Maé écrit"><Dot /><Dot d={150} /><Dot d={300} /></span>
                : m.role === 'assistant' ? <RichText text={m.content.replace(/\[\[pointure:\d*\]?\]?/g, '')} onNavigate={close} /> : m.content}
            </Bubble>
            {m.role === 'assistant' && m.voice && (
              <button onClick={() => playVoice(m.voice!, `msg-${i}`)} data-testid="deglu"
                className={`ml-2 mt-1.5 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold ${playing === `msg-${i}` ? 'bg-gold text-white animate-pulse' : 'bg-white border border-ink/15 text-gold-dark'}`}>
                <Volume2 className="w-4 h-4" /> Déglu
              </button>
            )}
            {m.role === 'assistant' && m.content && lang === 'fr' && !(busy && i === messages.length - 1) && (
              <button onClick={() => speak(spoken(m.content))} className="ml-2 mt-1 inline-flex items-center gap-1 text-[11px] text-ink/60 hover:text-gold-dark" aria-label="Écouter la réponse" data-testid="listen">
                <Volume2 className="w-3.5 h-3.5" /> Écouter
              </button>
            )}
            {m.role === 'assistant' && m.content && <div className="pl-1"><CitedProducts text={m.content} getProduct={getProduct} onNavigate={close} /></div>}
            {m.role === 'assistant' && i === messages.length - 1 && !busy && !!m.chips?.length && (
              <div className="flex flex-wrap gap-2 pl-1 mt-2.5" data-testid="chips">
                {m.chips.map(c => (
                  <button key={c} onClick={() => ask(c)} className="px-3.5 min-h-10 rounded-full bg-white border border-ink/15 text-[13px] font-medium hover:border-gold hover:bg-blush/30 transition-colors">{c}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Saisie */}
      <div className="border-t border-ink/10 bg-white px-3 pt-3 pb-2">
        {lang === 'wo' && <div className="mb-2.5"><VoiceToWhatsApp lang="wo" /></div>}
        <form onSubmit={e => { e.preventDefault(); ask(input); }} className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} rows={1} maxLength={1000}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder={lang === 'wo' ? 'Walla bindal sa laaj…' : 'Posez votre question…'} aria-label={lang === 'wo' ? 'Sa laaj' : 'Votre question'}
            className="flex-1 resize-none max-h-28 px-4 py-3 rounded-2xl bg-ivory border border-ink/10 outline-none focus:border-gold text-sm" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer"
            className="w-11 h-11 rounded-full bg-ink text-ivory grid place-items-center disabled:opacity-30 hover:bg-gold-dark transition-colors shrink-0">
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-1">
          <a href={handoff} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink/75 hover:text-[#177a41] inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> {lang === 'wo' ? 'Wax ak nit ci WhatsApp' : 'Parler à une conseillère'}
          </a>
          <span className="text-[10px] text-ink/70">{mode === 'ia' ? 'IA · peut se tromper' : ''}</span>
        </div>
      </div>
    </div>
  );
};

const Bubble: React.FC<{ role: 'user' | 'assistant'; children: React.ReactNode }> = ({ role, children }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
      role === 'user' ? 'bg-ink text-ivory rounded-3xl rounded-br-lg' : 'bg-white text-ink/85 rounded-3xl rounded-bl-lg border border-ink/[0.05] shadow-sm'}`}>
      {children}
    </div>
  </div>
);

const Dot: React.FC<{ d?: number }> = ({ d = 0 }) => (
  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: `${d}ms` }} />
);
