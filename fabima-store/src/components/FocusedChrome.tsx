import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Headphones, Lock, MessageCircle, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { BrandMark, Logo, Wordmark } from './Logo';

/*
 * En-têtes « concentrés » :
 * - le tunnel de commande sans distraction (pas de menu ni de grand pied de page : la cliente va au bout)
 * - l'espace gérant, qui a son propre bandeau de gestion au lieu de la vitrine de la boutique
 */

const PAY = [['Wave', '#1dc4ff'], ['Orange Money', '#ff7900'], ['Free Money', '#cd0f2d'], ['Visa', '#1a1f71'], ['Mastercard', '#f79e1b'], ['Espèces', '#11694f']] as const;

/** En-tête du paiement : le logo, la promesse de sécurité et l'aide, rien d'autre. */
export const CheckoutHeader: React.FC = () => (
  <header className="sticky top-0 z-50 bg-ivory/95 backdrop-blur-md border-b border-ink/[0.07] print:hidden" data-testid="checkout-header">
    <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 sm:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-semibold text-emerald-800">
        <span className="w-8 h-8 rounded-full bg-emerald-50 grid place-items-center shrink-0"><Lock className="w-3.5 h-3.5" /></span>
        <span className="hidden sm:inline">Paiement sécurisé</span>
      </p>
      <Logo />
      <a href={buildWhatsAppLink('Bonjour Fabima Store, j\'ai une question sur ma commande.')} target="_blank" rel="noopener noreferrer"
        className="justify-self-end inline-flex items-center gap-2 text-[11px] text-ink/75 hover:text-ink">
        <span className="hidden md:inline text-right leading-tight"><span className="block uppercase tracking-[0.2em] text-[10px] text-ink/70">Une question ?</span>{SITE_CONFIG.phone}</span>
        <span className="w-9 h-9 rounded-full border border-ink/15 grid place-items-center"><Headphones className="w-4 h-4" strokeWidth={1.6} /></span>
        <span className="sr-only">Écrire à la boutique sur WhatsApp</span>
      </a>
    </div>
  </header>
);

/** Pied du paiement : les garanties et les moyens de paiement, en une bande sobre. */
export const CheckoutFooter: React.FC = () => (
  <footer className="mt-20 border-t border-ink/[0.07] bg-ivory-deep/50 print:hidden" data-testid="checkout-footer">
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid gap-6 md:grid-cols-[1fr_auto] items-center">
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-ink/75">
        {[
          { Icon: Truck, t: 'Livraison 24 h à Dakar', d: '48 à 72 h dans les régions' },
          { Icon: RefreshCw, t: 'Échange sous 7 jours', d: 'Taille ou couleur, sans frais' },
          { Icon: ShieldCheck, t: 'Pièces authentiques', d: 'Étiquette vérifiable en ligne' },
        ].map(({ Icon, t, d }) => (
          <li key={t} className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-gold-dark shrink-0" strokeWidth={1.4} />
            <span><span className="block font-semibold text-ink">{t}</span>{d}</span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-1.5 md:justify-end" aria-label="Moyens de paiement acceptés">
        {PAY.map(([m, c]) => (
          <li key={m} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-white border border-ink/[0.08] text-[10px] text-ink/75">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{m}
          </li>
        ))}
      </ul>
    </div>
    <p className="max-w-6xl mx-auto px-4 sm:px-8 pb-8 text-[11px] text-ink/70 flex flex-wrap gap-x-4 gap-y-1">
      <span>© {new Date().getFullYear()} {SITE_CONFIG.name}</span>
      <Link to="/faq" className="hover:text-ink">Livraison &amp; échanges</Link>
      <Link to="/authentique" className="hover:text-ink">Vérifier l'authenticité</Link>
      <a href={buildWhatsAppLink('Bonjour Fabima Store, j\'ai besoin d\'aide pour ma commande.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
        <MessageCircle className="w-3 h-3" /> Aide sur WhatsApp
      </a>
    </p>
  </footer>
);

/** Bandeau de l'espace gérant : sobre et sombre, pour qu'on sache toujours qu'on est « dans les coulisses ». */
export const AdminHeader: React.FC = () => (
  <header className="sticky top-0 z-50 bg-ink text-ivory print:hidden" data-testid="admin-header" data-dark>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
      <Link to="/admin" className="flex items-center gap-3" aria-label="Espace gérant — Fabima Store">
        <BrandMark light compact className="h-8 w-auto" />
        <Wordmark tagline={false} className="hidden sm:block h-4 w-auto text-ivory" />
        <span className="px-2.5 py-1 rounded-full bg-ivory/10 text-[10px] uppercase tracking-[0.22em] text-gold-light">Gestion</span>
      </Link>
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-ivory/80 hover:text-ivory">
        Voir la boutique <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  </header>
);
