/**
 * ALLO BÉTON — Overlay de recherche premium
 * - Autocomplete live (debounce 250ms) sur productsAPI.getAll
 * - Historique de recherche (localStorage, max 6)
 * - Suggestions populaires en fallback
 * - Navigation clavier (↑/↓/Enter/Esc)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Clock, TrendingUp, Package, Trash2, ArrowRight } from 'lucide-react';
import { productsAPI, Product } from '../../services/ecommerce-api';
import { useEcommerce } from '../../contexts/EcommerceContext';

const HISTORY_KEY = 'allo_search_history';
const HISTORY_MAX = 6;
const POPULAR = ['Béton B25', 'Ciment CPA', 'Sable fin', 'Fer à béton', 'Gravier'];

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: 'catalog' | 'product', data?: any) => void;
}

const SearchOverlay: React.FC<Props> = ({ open, onClose, onNavigate }) => {
  const { formatPrice } = useEcommerce();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Load history */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* silent */ }
  }, []);

  /* Focus on open + reset on close */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setHighlight(0);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  /* Fetch */
  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    productsAPI.getAll({ search: debounced, limit: 6 })
      .then((res: any) => {
        if (ac.signal.aborted) return;
        const items: Product[] = Array.isArray(res) ? res : (res?.products || res?.data || []);
        setResults(items);
        setHighlight(0);
      })
      .catch(() => { if (!ac.signal.aborted) setResults([]); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [debounced, open]);

  const saveHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...history.filter(h => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, HISTORY_MAX);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* */ }
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* */ }
  };

  const goSearch = (term: string) => {
    saveHistory(term);
    onClose();
    onNavigate('catalog', { searchTerm: term });
  };

  const goProduct = (p: Product) => {
    saveHistory(p.name);
    onClose();
    onNavigate('product', { id: p.slug || p.id });
  };

  /* Items navigables au clavier (résultats si présents, sinon historique+populaire) */
  const navigableItems = useMemo(() => {
    if (results.length > 0) return results.map(r => ({ kind: 'product' as const, product: r }));
    const hist = history.map(h => ({ kind: 'term' as const, term: h }));
    const pop = POPULAR.filter(p => !history.includes(p)).map(p => ({ kind: 'term' as const, term: p }));
    return [...hist, ...pop];
  }, [results, history]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(navigableItems.length - 1, h + 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = navigableItems[highlight];
      if (item?.kind === 'product') goProduct(item.product);
      else if (item?.kind === 'term') goSearch(item.term);
      else if (query.trim()) goSearch(query.trim());
    }
  };

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 px-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-label="Recherche"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 p-4 sm:p-5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Rechercher un produit, une catégorie..."
            className="flex-1 text-base text-slate-900 placeholder-slate-400 border-none outline-none bg-transparent"
            aria-label="Champ de recherche"
            autoComplete="off"
          />
          {loading && <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />}
          {query && !loading && (
            <button onClick={() => setQuery('')} className="p-1 rounded-lg hover:bg-slate-100" aria-label="Effacer">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-100 rounded-lg">ESC</kbd>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Résultats live */}
          {results.length > 0 && (
            <div className="p-2">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Produits ({results.length})
              </p>
              {results.map((p) => {
                runningIndex++;
                const idx = runningIndex;
                const active = idx === highlight;
                return (
                  <button
                    key={p.id}
                    onClick={() => goProduct(p)}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      active ? 'bg-orange-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-11 h-11 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        : <Package className="w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                      {(p as any).category_name && (
                        <p className="text-[11px] text-slate-400 truncate">{(p as any).category_name}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-900 flex-shrink-0">{formatPrice(p.price)}</span>
                    <ArrowRight className={`w-4 h-4 transition-all ${active ? 'text-orange-600 translate-x-0.5' : 'text-slate-300'}`} />
                  </button>
                );
              })}
              <button
                onClick={() => goSearch(debounced)}
                className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
              >
                Voir tous les résultats pour "{debounced}"
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pas de résultats */}
          {!loading && debounced.length >= 2 && results.length === 0 && (
            <div className="px-6 py-10 text-center">
              <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Aucun produit ne correspond</p>
              <p className="text-xs text-slate-400 mt-1">Essayez avec d'autres mots-clés</p>
              <button
                onClick={() => goSearch(debounced)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors"
              >
                Rechercher dans le catalogue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Historique + populaires (quand pas de query / < 2 chars) */}
          {results.length === 0 && debounced.length < 2 && (
            <div className="p-4 sm:p-5 space-y-5">
              {history.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Recherches récentes
                    </p>
                    <button
                      onClick={clearHistory}
                      className="text-[11px] font-semibold text-slate-400 hover:text-red-500 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Effacer
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {history.map((h) => {
                      runningIndex++;
                      const idx = runningIndex;
                      const active = idx === highlight;
                      return (
                        <button
                          key={h}
                          onClick={() => goSearch(h)}
                          onMouseEnter={() => setHighlight(idx)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                            active ? 'bg-orange-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <Clock className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          <span className="flex-1 text-sm text-slate-700 truncate">{h}</span>
                          <ArrowRight className={`w-3.5 h-3.5 transition-all ${active ? 'text-orange-600' : 'text-slate-300'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> Recherches populaires
                </p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.filter(p => !history.includes(p)).map((p) => {
                    runningIndex++;
                    const idx = runningIndex;
                    const active = idx === highlight;
                    return (
                      <button
                        key={p}
                        onClick={() => goSearch(p)}
                        onMouseEnter={() => setHighlight(idx)}
                        className={`px-3.5 py-1.5 text-sm font-medium rounded-xl transition-colors ${
                          active
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint clavier (desktop) */}
        <div className="hidden sm:flex items-center justify-end gap-3 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-bold">↑↓</kbd> naviguer</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-bold">↵</kbd> ouvrir</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-bold">esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
