import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPrice } from '../utils/format';
import { ProductImage } from './ProductImage';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SUGGESTIONS = ['Escarpins', 'Sac à main', 'Sneakers', 'Wax', 'Montre', 'Collier', 'Boubou'];

export const SearchOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { products } = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQ('');
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = normalize(q.trim());
    if (term.length < 2) return [];
    return products.filter(p => normalize(`${p.name} ${p.subcategory} ${p.category} ${p.description}`).includes(term)).slice(0, 6);
  }, [q, products]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/boutique?q=${encodeURIComponent(q.trim())}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-ink/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-ivory max-w-3xl mx-auto mt-0 sm:mt-20 sm:rounded-3xl shadow-2xl p-5 sm:p-8 animate-fade-up" onClick={e => e.stopPropagation()}>
        <form onSubmit={submit} className="flex items-center gap-3 border-b-2 border-ink pb-3">
          <Search className="w-5 h-5 text-ink/60" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un sac, des chaussures, un bijou…"
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-ink/40" aria-label="Rechercher" />
          <button type="button" onClick={onClose} aria-label="Fermer la recherche" className="p-1.5 rounded-full hover:bg-ink/5"><X className="w-5 h-5" /></button>
        </form>

        {q.trim().length < 2 ? (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50 mb-3">Recherches populaires</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setQ(s)} className="px-4 py-2 rounded-full border border-ink/15 text-sm hover:bg-ink hover:text-ivory transition-colors">{s}</button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="mt-6 text-ink/60">Aucun résultat pour « {q} ». Essayez un autre mot-clé.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10">
            {results.map(p => (
              <li key={p.id}>
                <Link to={`/produit/${p.slug}`} onClick={onClose} className="flex items-center gap-4 py-3 hover:bg-ink/[0.03] rounded-xl px-2">
                  <ProductImage src={p.images[0]} alt={p.name} className="w-14 h-16 rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-ink/50">{p.subcategory}</p>
                  </div>
                  <span className="font-semibold text-sm whitespace-nowrap">{formatPrice(p.price)}</span>
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <button onClick={submit} className="text-sm font-semibold underline underline-offset-4">Voir tous les résultats</button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};
