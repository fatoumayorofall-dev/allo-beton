import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Heart, Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAccount } from '../context/AccountContext';

/**
 * Barre d'onglets du téléphone, à portée de pouce (comme une application) :
 * Accueil, Boutique, Favoris, Compte et Panier.
 * Masquée sur ordinateur et sur la fiche produit, qui a sa propre barre « Ajouter au panier ».
 */
export const TabBar: React.FC = () => {
  const { cart, wishlist, setCartOpen } = useStore();
  const { user } = useAccount();
  const { pathname } = useLocation();
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const hidden = pathname.startsWith('/produit/') || pathname.startsWith('/marche/');

  // Les boutons flottants et le bandeau d'installation se placent au-dessus de la barre
  useEffect(() => {
    document.body.toggleAttribute('data-tabbar', !hidden);
    return () => document.body.removeAttribute('data-tabbar');
  }, [hidden]);
  if (hidden) return null;

  // Capsule flottante prune : l'onglet ouvert est posé sur une pastille or rosé
  const item = 'group relative flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-semibold tracking-wide transition-colors duration-300';
  const tone = ({ isActive }: { isActive: boolean }) => `${item} ${isActive ? 'text-ink' : 'text-ivory/70 hover:text-ivory'}`;
  const pill = (on: boolean) => (
    <span aria-hidden className={`absolute inset-x-1 inset-y-1.5 rounded-[1.15rem] bg-gradient-to-b from-[#f6e3dc] to-[#e7c3b8] shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_6px_14px_-6px_rgba(0,0,0,.45)] transition-all duration-500 ease-luxe ${on ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
  );
  const icon = (on: boolean) => ({ className: 'relative w-[21px] h-[21px]', strokeWidth: on ? 2 : 1.6 });
  const label = 'relative leading-none';
  const badge = 'absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-bold grid place-items-center ring-2 ring-ink';

  return (
    <nav aria-label="Navigation rapide" data-testid="tabbar"
      className="lg:hidden fixed inset-x-3 z-50 bottom-[calc(0.6rem+env(safe-area-inset-bottom,0px))] print:hidden">
      <div className="relative flex h-[62px] max-w-md mx-auto px-1.5 rounded-[1.6rem] bg-ink/95 backdrop-blur-xl shadow-[0_18px_40px_-14px_rgba(43,18,32,.75),inset_0_1px_0_rgba(255,255,255,.08)] ring-1 ring-white/[0.06]">
        <NavLink to="/" end className={tone}>{({ isActive }) => <>{pill(isActive)}<Home {...icon(isActive)} /><span className={label}>Accueil</span></>}</NavLink>
        <NavLink to="/boutique" className={tone}>{({ isActive }) => <>{pill(isActive)}<LayoutGrid {...icon(isActive)} /><span className={label}>Boutique</span></>}</NavLink>
        <NavLink to="/favoris" className={tone}>{({ isActive }) => <>{pill(isActive)}<span className="relative"><Heart {...icon(isActive)} />{wishlist.length > 0 && <span className={`${badge} bg-gold-light text-ink`}>{wishlist.length}</span>}</span><span className={label}>Favoris</span></>}</NavLink>
        <NavLink to="/compte" className={tone}>{({ isActive }) => <>{pill(isActive)}<span className="relative"><User {...icon(isActive)} />{user && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-ink" />}</span><span className={label}>{user?.firstName ? user.firstName.slice(0, 10) : 'Compte'}</span></>}</NavLink>
        <button onClick={() => setCartOpen(true)} className={`${item} text-ivory/70 hover:text-ivory`} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
          <span className="relative"><ShoppingBag {...icon(false)} />{count > 0 && <span key={count} className={`${badge} bg-gold-light text-ink animate-heart-pop`}>{count}</span>}</span>
          <span className={label}>Panier</span>
        </button>
      </div>
    </nav>
  );
};
