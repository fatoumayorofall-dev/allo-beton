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

  const item = 'relative flex-1 flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold tracking-wide transition-colors';
  const tone = ({ isActive }: { isActive: boolean }) => `${item} ${isActive ? 'text-wine' : 'text-ink/70 hover:text-ink'}`;
  const dot = (on: boolean) => on && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-wine" aria-hidden />;
  const badge = 'absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold grid place-items-center';

  return (
    <nav aria-label="Navigation rapide" data-testid="tabbar"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-ivory/95 backdrop-blur-xl border-t border-ink/[0.07] shadow-[0_-10px_30px_-20px_rgba(58,31,45,.35)] pb-[env(safe-area-inset-bottom,0px)] print:hidden">
      <div className="flex h-16 max-w-md mx-auto px-2">
        <NavLink to="/" end className={tone}>{({ isActive }) => <>{dot(isActive)}<Home className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />Accueil</>}</NavLink>
        <NavLink to="/boutique" className={tone}>{({ isActive }) => <>{dot(isActive)}<LayoutGrid className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />Boutique</>}</NavLink>
        <NavLink to="/favoris" className={tone}>{({ isActive }) => <>{dot(isActive)}<span className="relative"><Heart className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />{wishlist.length > 0 && <span className={`${badge} bg-gold text-white`}>{wishlist.length}</span>}</span>Favoris</>}</NavLink>
        <NavLink to="/compte" className={tone}>{({ isActive }) => <>{dot(isActive)}<span className="relative"><User className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />{user && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-ivory" />}</span>{user?.firstName ? user.firstName.slice(0, 10) : 'Compte'}</>}</NavLink>
        <button onClick={() => setCartOpen(true)} className={`${item} text-ink/70 hover:text-ink`} aria-label={`Ouvrir le panier (${count} article${count > 1 ? 's' : ''})`}>
          <span className="relative"><ShoppingBag className="w-5 h-5" strokeWidth={1.5} />{count > 0 && <span key={count} className={`${badge} bg-ink text-ivory animate-heart-pop`}>{count}</span>}</span>
          Panier
        </button>
      </div>
    </nav>
  );
};
