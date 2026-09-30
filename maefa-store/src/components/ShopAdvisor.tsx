import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RotateCcw, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../data/types';
import { ADVISOR_TEXT, nextQuestion, pitch, recommend, type Lang, type Wishes } from '../utils/shopAdvisor';
import { ProductImage } from './ProductImage';
import { maeVoiceSlug, questionVoice } from '../data/wolofVoices';

const SIZE_KEY = 'maefa_pointure';
const readSize = () => { try { return localStorage.getItem(SIZE_KEY) ?? undefined; } catch { return undefined; } };
const saveSize = (s: string) => { try { if (s) localStorage.setItem(SIZE_KEY, s); } catch { /* ignore */ } };

const Line: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-start"><div className="max-w-[85%] px-4 py-3 text-sm leading-relaxed bg-white text-ink/85 rounded-3xl rounded-bl-lg border border-ink/[0.05] shadow-sm">{children}</div></div>
);
const Said: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex justify-end"><div className="max-w-[85%] px-4 py-2.5 text-sm bg-ink text-ivory rounded-3xl rounded-br-lg">{children}</div></div>
);
const bold = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((x, i) => (i % 2 ? <strong key={i}>{x}</strong> : x));

/**
 * « Comme en boutique » : questions en gros boutons (sans rien écrire), puis 3 pièces présentées
 * comme la vendeuse les tend, avec « Ajouter au panier » dans la bonne pointure.
 */
export const ShopAdvisor: React.FC<{ lang: Lang; onNavigate: () => void; playVoice?: (slug: string) => boolean }> = ({ lang, onNavigate, playVoice }) => {
  const { products, addToCart, openQuickView, notify } = useStore();
  const [wishes, setWishes] = useState<Wishes>(() => ({ size: readSize() }));
  const [answers, setAnswers] = useState<{ q: string; a: string }[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const q = nextQuestion(wishes);
  const result = useMemo(() => (q ? null : recommend(products, wishes)), [q, products, wishes]);
  // Comme dans une vraie discussion : on descend jusqu'à la nouvelle question ou aux pièces apportées
  const anchor = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = result ? resultsRef.current : anchor.current;
    el?.scrollIntoView({ behavior: 'smooth', block: result ? 'start' : 'end' });
    // En wolof : la question (ou « voici les pièces ») dite avec la voix de la gérante
    if (playVoice) {
      const slug = result ? (result.items.length ? maeVoiceSlug('pieces') : maeVoiceSlug('rien')) : q ? questionVoice(q.key) : null;
      if (slug) playVoice(slug);
    }
  }, [answers.length, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (key: keyof Wishes, value: Wishes[keyof Wishes], label: string, question: string) => {
    if (key === 'size') saveSize(String(value ?? ''));
    setWishes(w => ({ ...w, [key]: value }));
    setAnswers(a => [...a, { q: question, a: label }]);
  };
  const restart = () => { setWishes({ size: readSize() }); setAnswers([]); setAdded([]); };

  const add = (p: Product) => {
    const size = p.sizes.length ? (wishes.size && p.sizes.includes(wishes.size) ? wishes.size : undefined) : undefined;
    if (p.sizes.length && !size) { openQuickView(p); return; } // pointure à choisir
    if (addToCart(p, { size, color: p.colors[0]?.name, silent: true })) {
      setAdded(a => [...a, p.id]);
      notify(ADVISOR_TEXT.added[lang]);
    }
  };

  return (
    <div className="space-y-3" data-testid="advisor">
      {answers.map((x, i) => (
        <React.Fragment key={i}>
          <Line>{x.q}</Line>
          <Said>{x.a}</Said>
        </React.Fragment>
      ))}

      {q && (
        <>
          <Line><span data-testid="advisor-question">{q[lang]}</span></Line>
          <div className={`grid gap-2 ${q.key === 'size' ? 'grid-cols-4' : 'grid-cols-2'}`}>
            {q.options.map(o => (
              <button key={String(o.value)} onClick={() => choose(q.key, o.value, `${o.emoji} ${o[lang]}`, q[lang])} data-testid={`advisor-${q.key}-${o.value || 'x'}`}
                className="min-h-14 px-3 py-2.5 rounded-2xl bg-white border border-ink/10 hover:border-gold hover:bg-blush/30 text-left flex items-center gap-2.5 transition-colors">
                <span className="text-2xl leading-none shrink-0">{o.emoji}</span>
                <span className="text-[13px] font-semibold leading-tight">{o[lang]}</span>
              </button>
            ))}
          </div>
          {q.key !== 'kind' && wishes.size && wishes.kind === 'chaussures' && (
            <p className="text-[11px] text-ink/60 pl-1">{lang === 'wo' ? `Sa pointure : ${wishes.size}` : `Votre pointure : ${wishes.size}`} · <button className="underline" onClick={() => setWishes(w => ({ ...w, size: undefined }))}>{lang === 'wo' ? 'soppi' : 'changer'}</button></p>
          )}
        </>
      )}

      {result && (
        <div data-testid="advisor-results" ref={resultsRef} className="space-y-3 scroll-mt-4">
          <Line>{result.items.length ? (result.exact ? ADVISOR_TEXT.results[lang] : ADVISOR_TEXT.near[lang]) : ADVISOR_TEXT.none[lang]}</Line>
          {result.items.map(p => (
            <div key={p.id} className="flex gap-3 p-2.5 rounded-3xl bg-white border border-ink/[0.07] shadow-sm" data-testid="advisor-item">
              <Link to={`/produit/${p.slug}`} onClick={onNavigate} className="shrink-0">
                <ProductImage src={p.images[0]} alt={p.name} label="" className="w-24 h-[7.5rem] rounded-2xl" sizes="96px" />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <p className="text-[13px] leading-snug text-ink/85">{bold(pitch(p, wishes, lang))}</p>
                <div className="mt-auto pt-2 flex gap-1.5">
                  <button onClick={() => add(p)} disabled={added.includes(p.id)} data-testid="advisor-add"
                    className="flex-1 h-10 rounded-full bg-ink text-ivory text-[11px] font-semibold inline-flex items-center justify-center gap-1.5 disabled:bg-emerald-700">
                    {added.includes(p.id) ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />} {added.includes(p.id) ? '✓' : ADVISOR_TEXT.add[lang]}
                  </button>
                  <Link to={`/produit/${p.slug}`} onClick={onNavigate} className="h-10 px-3 rounded-full border border-ink/15 text-[11px] font-semibold inline-flex items-center">{ADVISOR_TEXT.see[lang]}</Link>
                </div>
              </div>
            </div>
          ))}
          <button onClick={restart} data-testid="advisor-again" className="w-full h-12 rounded-2xl border border-ink/15 bg-white text-sm font-semibold inline-flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> {ADVISOR_TEXT.again[lang]}
          </button>
        </div>
      )}
      <div ref={anchor} />
    </div>
  );
};

