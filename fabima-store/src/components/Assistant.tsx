import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUp, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { OCCASIONS } from '../data/catalog';
import { FAQ_ITEMS } from '../data/faq';
import type { Product } from '../data/types';
import { getServerStatus, streamChat, type ChatTurn } from '../services/api';
import { localAnswer } from '../utils/localAssistant';
import { formatPrice } from '../utils/format';
import { useEscape } from '../utils/hooks';
import { ProductImage } from './ProductImage';

export const OPEN_ASSISTANT_EVENT = 'fabima:open-assistant';
/** Ouvre l'assistante depuis n'importe où, avec éventuellement une question pré-remplie. */
export const openAssistant = (question?: string) => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: question }));

const STORAGE_KEY = 'fabima_assistant';
const SUGGESTIONS = ['Une tenue pour un mariage', 'Délais et frais de livraison', 'Où en est ma commande ?', 'Une idée cadeau à moins de 20 000'];
const WELCOME = 'Bonjour, je suis **Fabi**, votre conseillère Fabima 🌸 Je peux vous proposer une tenue, répondre sur la livraison, le paiement ou suivre votre commande. Comment puis-je vous aider ?';

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
          <ProductImage src={p.images[0]} alt={p.name} label="" className="w-full h-28" />
          <div className="p-2">
            <p className="text-[11px] leading-tight line-clamp-2">{p.name}</p>
            <p className="text-[11px] font-semibold mt-1">{formatPrice(p.price)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export const Assistant: React.FC = () => {
  const { products, cart, orders, getProduct } = useStore();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'ia' | 'local' | 'unknown'>('unknown');
  const [messages, setMessages] = useState<ChatTurn[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pending = useRef<string | null>(null);

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
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Contexte boutique transmis à l'IA : stable d'une question à l'autre (mise en cache côté API).
  const shop = useMemo(() => ({
    phone: SITE_CONFIG.phone, whatsapp: SITE_CONFIG.whatsappRaw, address: SITE_CONFIG.address, hours: SITE_CONFIG.hours,
    freeShippingThreshold: SITE_CONFIG.freeShippingThreshold, giftWrapFee: SITE_CONFIG.giftWrapFee,
    zones: DELIVERY_ZONES, promos: PROMO_CODES, faq: FAQ_ITEMS, occasions: OCCASIONS.map(o => `${o.id} = ${o.name}`),
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
      setMessages([...history, { role: 'assistant', content: localAnswer(q, { products, orders }) }]);
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
        visitor: { page: location.pathname + location.search, cart, orders: orders.slice(0, 10) },
      }, chunk => {
        received += chunk;
        setMessages([...history, { role: 'assistant', content: received }]);
      }, ctrl.signal);
      if (!received.trim()) answerLocally();
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

  const lastQuestion = [...messages].reverse().find(m => m.role === 'user')?.content;
  const handoff = buildWhatsAppLink(`Bonjour Fabima Store 🌸 ${lastQuestion ? `J'ai une question : ${lastQuestion}` : 'J\'ai besoin d\'un conseil.'}`);
  const close = () => setOpen(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-5 z-[90] sm:w-[400px] sm:h-[620px] sm:max-h-[calc(100vh-8rem)] flex flex-col bg-ivory sm:rounded-[2rem] shadow-luxe border border-ink/[0.06] overflow-hidden animate-fade-up"
      role="dialog" aria-label="Assistante Fabima">
      {/* En-tête */}
      <header className="flex items-center gap-3 px-5 py-4 bg-ink text-ivory">
        <span className="w-11 h-11 rounded-full bg-gradient-to-br from-blush to-gold grid place-items-center font-script text-2xl text-ink shrink-0">F</span>
        <div className="flex-1 min-w-0">
          <p className="font-display text-xl leading-none">Fabi</p>
          <p className="text-[11px] text-ivory/60 mt-1 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'ia' ? 'bg-emerald-400' : 'bg-gold-light'}`} />
            {mode === 'ia' ? 'Conseillère IA · répond en direct' : mode === 'local' ? 'Réponses rapides' : 'Conseillère Fabima'}
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { abortRef.current?.abort(); setMessages([]); }} aria-label="Nouvelle conversation" title="Nouvelle conversation" className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory/10"><RotateCcw className="w-4 h-4" /></button>
        )}
        <button onClick={close} aria-label="Fermer l'assistante" className="w-9 h-9 grid place-items-center rounded-full hover:bg-ivory/10"><X className="w-5 h-5" /></button>
      </header>

      {/* Conversation */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-petal" aria-live="polite">
        <Bubble role="assistant"><RichText text={WELCOME} onNavigate={close} /></Bubble>
        {messages.length === 0 && (
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
                ? <span className="inline-flex gap-1 py-1" aria-label="Fabi écrit"><Dot /><Dot d={150} /><Dot d={300} /></span>
                : m.role === 'assistant' ? <RichText text={m.content} onNavigate={close} /> : m.content}
            </Bubble>
            {m.role === 'assistant' && m.content && <div className="pl-1"><CitedProducts text={m.content} getProduct={getProduct} onNavigate={close} /></div>}
          </div>
        ))}
      </div>

      {/* Saisie */}
      <div className="border-t border-ink/10 bg-white px-3 pt-3 pb-2">
        <form onSubmit={e => { e.preventDefault(); ask(input); }} className="flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} rows={1} maxLength={1000}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder="Posez votre question…" aria-label="Votre question"
            className="flex-1 resize-none max-h-28 px-4 py-3 rounded-2xl bg-ivory border border-ink/10 outline-none focus:border-gold text-sm" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Envoyer"
            className="w-11 h-11 rounded-full bg-ink text-ivory grid place-items-center disabled:opacity-30 hover:bg-gold-dark transition-colors shrink-0">
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-1">
          <a href={handoff} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink/60 hover:text-[#1f8f4e] inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> Parler à une conseillère
          </a>
          <span className="text-[10px] text-ink/35">{mode === 'ia' ? 'IA · peut se tromper' : ''}</span>
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

/** Bouton flottant d'ouverture de l'assistante. */
export const AssistantLauncher: React.FC = () => {
  const [hint, setHint] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('fabima_assistant_hint') === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => setHint(true), 6000);
    return () => clearTimeout(t);
  }, []);
  const dismiss = () => { setHint(false); try { sessionStorage.setItem('fabima_assistant_hint', '1'); } catch { /* ignore */ } };

  return (
    <div className="relative">
      {hint && (
        <div className="assistant-hint absolute right-[4.25rem] bottom-1 w-56 bg-white rounded-2xl rounded-br-md shadow-luxe p-3.5 text-xs animate-fade-up border border-ink/[0.06]">
          <button onClick={dismiss} aria-label="Masquer" className="absolute top-1.5 right-1.5 p-1 text-ink/40"><X className="w-3 h-3" /></button>
          <p className="font-script text-xl text-gold-dark leading-none">Fabi</p>
          <p className="mt-1 text-ink/75">Une question sur une pièce, la livraison ou votre commande ? Je vous réponds tout de suite.</p>
        </div>
      )}
      <button onClick={() => { dismiss(); openAssistant(); }} aria-label="Poser une question à l'assistante"
        className="w-14 h-14 rounded-full bg-gradient-to-br from-gold to-wine text-white grid place-items-center shadow-luxe hover:scale-105 transition-transform">
        <Sparkles className="w-6 h-6" strokeWidth={1.6} />
      </button>
    </div>
  );
};
