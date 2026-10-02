import { pricesHidden } from '../utils/format';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChevronDown } from 'lucide-react';

/*
 * Devise d'affichage pour la clientèle de l'étranger (diaspora, touristes).
 * Les prix restent fixés et payés en FCFA : l'euro et le dollar ne sont qu'une indication « ≈ ».
 * 1 € = 655,957 FCFA (parité fixe) ; le dollar est une valeur approchée.
 */
export const CURRENCIES = [
  { id: 'XOF', label: 'FCFA', rate: 1 },
  { id: 'EUR', label: '€ Euro', rate: 655.957 },
  { id: 'USD', label: '$ Dollar', rate: 600 },
] as const;
export type CurrencyId = typeof CURRENCIES[number]['id'];

const KEY = 'maefa.currency';
const listeners = new Set<() => void>();
function read(): CurrencyId {
  try { const v = localStorage.getItem(KEY); if (CURRENCIES.some(c => c.id === v)) return v as CurrencyId; } catch { /* stockage indisponible */ }
  return 'XOF';
}
let current: CurrencyId = typeof window === 'undefined' ? 'XOF' : read();
export function setCurrency(id: CurrencyId) {
  current = id;
  try { localStorage.setItem(KEY, id); } catch { /* stockage indisponible */ }
  listeners.forEach(l => l());
}
export const useCurrency = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => current, () => 'XOF' as CurrencyId);

/** « ≈ 68,60 € » : montant FCFA converti dans la devise choisie (rien si FCFA). */
export function foreign(amount: number, id: CurrencyId): string | null {
  const c = CURRENCIES.find(x => x.id === id);
  if (!c || c.id === 'XOF') return null;
  const v = amount / c.rate;
  return c.id === 'EUR'
    ? `≈ ${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    : `≈ $${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ForeignPrice: React.FC<{ amount: number; className?: string }> = ({ amount, className = '' }) => {
  const id = useCurrency();
  const text = pricesHidden() ? null : foreign(amount, id);
  return text ? <span className={className} data-testid="foreign-price" title="Montant indicatif : le paiement se fait en FCFA">{text}</span> : null;
};

/** Sélecteur discret de devise (en-tête et menu du téléphone). */
export const CurrencySwitch: React.FC<{ className?: string; dark?: boolean; up?: boolean }> = ({ className = '', dark, up }) => {
  const id = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const label = CURRENCIES.find(c => c.id === id)!.label.replace(/ .*/, '');
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label={`Devise d'affichage : ${label}`}
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] ${dark ? 'text-ivory/80 hover:text-ivory' : 'opacity-80 hover:opacity-100'}`} data-testid="currency-switch">
        {label} <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Devise d'affichage" className={`absolute z-50 w-52 ${up ? 'right-0 bottom-full mb-2' : 'left-0 top-full mt-2'} py-2 bg-ivory border border-ink/10 rounded-2xl shadow-luxe text-ink`}>
          {CURRENCIES.map(c => (
            <li key={c.id}>
              <button type="button" role="option" aria-selected={c.id === id} onClick={() => { setCurrency(c.id); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-ivory-deep ${c.id === id ? 'font-semibold' : ''}`}>{c.label}</button>
            </li>
          ))}
          <li className="px-4 pt-2 mt-1 border-t border-ink/[0.07] text-[11px] text-ink/60 leading-snug">Indication seulement : le paiement se fait en FCFA.</li>
        </ul>
      )}
    </div>
  );
};
