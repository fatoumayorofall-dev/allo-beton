import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp, MessageCircle } from 'lucide-react';
import { buildWhatsAppLink } from '../config/site';
import { AssistantLauncher } from './AssistantLauncher';

/**
 * Bouton WhatsApp + retour en haut (ordinateur).
 * Sur téléphone, seule l'assistante reste : WhatsApp est dans le menu et la barre d'onglets fait le reste, rien ne cache les prix.
 */
export const FloatingActions: React.FC = () => {
  const [showTop, setShowTop] = useState(false);
  // Sur la fiche produit mobile, on remonte les boutons au-dessus de la barre d'achat collante
  const { pathname } = useLocation();
  const onProduct = pathname.startsWith('/produit/');
  // Espace cliente sur téléphone : ses boutons ont déjà l'aide WhatsApp, on libère le bas de l'écran
  const onAccount = pathname === '/compte';
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <aside aria-label="Raccourcis" className={`floating-actions fixed right-5 z-40 ${onProduct ? 'bottom-24 lg:bottom-5' : 'bottom-5'} ${onAccount ? 'hidden lg:flex' : 'flex'} flex-col items-center gap-3 print:hidden`}>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Revenir en haut"
        className={`hidden lg:grid w-11 h-11 rounded-full bg-ivory/90 backdrop-blur border border-ink/10 place-items-center shadow-soft transition-all duration-500 ${showTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
        <ArrowUp className="w-4 h-4" />
      </button>
      <AssistantLauncher />
      <a href={buildWhatsAppLink('Bonjour Fabima Store, j\'ai une question.')} target="_blank" rel="noopener noreferrer"
        aria-label="Nous écrire sur WhatsApp"
        className="group relative hidden lg:grid w-12 h-12 rounded-full bg-ink text-ivory place-items-center shadow-luxe hover:bg-[#12663a] transition-colors duration-500">
        <MessageCircle className="w-6 h-6" strokeWidth={1.6} />
        <span className="absolute right-full mr-3 px-3 py-2 bg-ink text-ivory text-[11px] tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
          Conseil personnalisé
        </span>
      </a>
    </aside>
  );
};
