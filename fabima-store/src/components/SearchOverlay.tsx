import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { useEscape, useLockBody } from '../utils/hooks';
import { ProductImage } from './ProductImage';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const SUGGESTIONS = ['Escarpins', 'Sac à main', 'Sneakers', 'Wax', 'Montre', 'Collier', 'Boubou', 'Mocassins'];

export const SearchOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { products } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useLockBody(open);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    setQ('');
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const term = normalize(q.trim());
    if (term.length < 2) return [];
    return products.filter(p => normalize(`${p.name} ${p.subcategory} ${p.category} ${p.description} ${p.colors.map(c => c.name).join(' ')}`).includes(term));
  }, [q, products]);
  const trending = useMemo(() => products.filter(p => p.isBestseller).slice(0, 4), [products]);

  if (!open) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    navigate(`/boutique?q=${encodeURIComponent(q.trim())}`);
    onClose();
  };

  const list = q.trim().length >= 2 ? results.slice(0, 4) : trending;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Recherche">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-ivory animate-fade-up shadow-luxe rounded-b-[2.5rem]">
        <div className="max-w-6xl mx-auto px-5 sm:px-10 pt-8 pb-10">
          <div className="flex justify-end"><button onClick={onClose} aria-label="Fermer la recherche" className="w-10 h-10 grid place-items-center hover:rotate-90 transition-transform duration-500"><X className="w-5 h-5" strokeWidth={1.5} /></button></div>
          <form onSubmit={submit} className="flex items-center gap-4 border-b border-ink pb-4">
            <Search className="w-6 h-6 text-ink/50 shrink-0" strokeWidth={1.3} />
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Que recherchez-vous ?"
              className="flex-1 min-w-0 bg-transparent outline-none font-display text-3xl sm:text-5xl placeholder:text-ink/25" aria-label="Rechercher" />
          </form>

          <div className="mt-8 grid lg:grid-cols-[220px_1fr] gap-10">
            <div>
              <p className="eyebrow mb-4">Recherches populaires</p>
              <ul className="flex flex-wrap lg:flex-col gap-2 lg:gap-3">
                {SUGGESTIONS.map(s => (
                  <li key={s}><button onClick={() => setQ(s)} className="link-luxe text-sm text-ink/70 hover:text-ink">{s}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-baseline justify-between mb-4">
                <p className="eyebrow">{q.trim().length >= 2 ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Tendances du moment'}</p>
                {results.length > 4 && <button onClick={() => submit()} className="text-[11px] uppercase tracking-[0.2em] font-semibold link-luxe inline-flex items-center gap-1.5">Tout voir <ArrowRight className="w-3 h-3" /></button>}
              </div>
              {q.trim().length >= 2 && results.length === 0 ? (
                <p className="text-ink/60">Aucun résultat pour « {q} ». Essayez « sac », « or » ou « sandales ».</p>
              ) : (
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {list.map(p => (
                    <li key={p.id}>
                      <Link to={`/produit/${p.slug}`} onClick={onClose} className="group block">
                        <div className="aspect-[3/4] overflow-hidden rounded-3xl"><ProductImage src={p.images[0]} alt={p.name} className="w-full h-full group-hover:scale-105 transition-transform duration-700" /></div>
                        <p className="font-display text-lg mt-2 leading-tight line-clamp-1">{p.name}</p>
                        <p className="text-xs text-ink/55">{formatPrice(p.price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
