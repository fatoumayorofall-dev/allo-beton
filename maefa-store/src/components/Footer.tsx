import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FEATURES, SITE_CONFIG, buildWhatsAppLink } from '../config/site';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { BrandMark, Wordmark } from './Logo';
import { Twinkles, sparkleBurst } from './Magic';
import { PaymentLogos, FacebookLogo, InstagramLogo, SnapchatLogo, TikTokLogo, WhatsAppLogo } from './BrandLogos';

const NEWSLETTER_KEY = 'maefa_newsletter';

export const Footer: React.FC = () => {
  const { notify } = useStore();
  const [email, setEmail] = useState('');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Au Sénégal, WhatsApp avant l'e-mail : on accepte l'un ou l'autre
    const phone = email.replace(/[\s.-]/g, '').replace(/^(\+|00)?221/, '');
    if (!/^\S+@\S+\.\S+$/.test(email) && !/^7[05678]\d{7}$/.test(phone)) { notify('Numéro WhatsApp ou e-mail invalide', 'error'); return; }
    try {
      const list: string[] = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? '[]');
      if (!list.includes(email)) localStorage.setItem(NEWSLETTER_KEY, JSON.stringify([...list, email]));
    } catch { /* ignore */ }
    setEmail('');
    sparkleBurst((e.currentTarget as HTMLFormElement).querySelector('button'), { count: 18 });
    notify('Bienvenue dans le cercle Maefa');
  };

  const col = 'text-[10px] uppercase tracking-luxe font-semibold text-gold-light mb-6';
  const lnk = 'link-luxe py-1 text-sm text-ivory/65 hover:text-ivory transition-colors';

  return (
    <footer className="relative bg-ink text-ivory mt-32 rounded-t-[3rem] overflow-hidden print:hidden">
      {/* Halos rosés et grande signature en filigrane */}
      <span className="pointer-events-none absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-wine/25 blur-[120px]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-48 right-0 w-[32rem] h-[32rem] rounded-full bg-gold/15 blur-[120px]" aria-hidden />
      {/* Ciel étoilé : points de lumière qui scintillent et, de temps en temps, une étoile filante */}
      <Twinkles count={18} seed={3} />
      <Wordmark tagline={false} className="pointer-events-none select-none absolute -bottom-[3%] left-1/2 -translate-x-1/2 w-[92%] max-w-[1300px] h-auto text-ivory/[0.035]" />
      {/* Newsletter */}
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-end border-b border-ivory/10">
        <div>
          <p className={col}>Le cercle des Maefa Girls</p>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02]">Recevez nos nouveautés<br />{' '}<em className="text-gold-light text-magic-light">en avant-première</em></h2>
        </div>
        <form onSubmit={subscribe} className="w-full">
          <label htmlFor="nl-email" className="text-sm text-ivory/60">Ventes privées, arrivages avant la Korité et la Tabaski, conseils de style — sur WhatsApp ou par e-mail, une fois par mois.</label>
          <div className="mt-5 flex border-b border-ivory/40 focus-within:border-gold-light transition-colors">
            <input id="nl-email" type="text" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre numéro WhatsApp ou e-mail"
              className="flex-1 min-w-0 bg-transparent py-4 text-ivory placeholder:text-ivory/35 outline-none" />
            <button aria-label="S'inscrire" className="px-2 text-[11px] uppercase tracking-[0.22em] font-semibold inline-flex items-center gap-2 hover:text-gold-light">
              S'inscrire <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-16 grid gap-12 grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 lg:col-span-1 space-y-6">
          <Link to="/" aria-label="Maefa Store — accueil" className="group inline-flex items-center gap-4">
            <BrandMark light shine className="h-16 w-auto transition-transform duration-500 ease-luxe group-hover:-translate-y-0.5" />
            <Wordmark className="h-9 w-auto text-ivory" tagClassName="fill-gold-light stroke-gold-light" />
          </Link>
          <p className="text-sm text-ivory/55 leading-relaxed max-w-xs">Chaussures et sacs choisis avec amour pour sublimer chaque femme. Maison dakaroise, élégance sans frontières.</p>
          <div className="flex gap-2">
            {[
              { Logo: WhatsAppLogo, href: buildWhatsAppLink('Bonjour Maefa Store !'), label: 'WhatsApp' },
              { Logo: InstagramLogo, href: SITE_CONFIG.social.instagram, label: 'Instagram' },
              { Logo: TikTokLogo, href: SITE_CONFIG.social.tiktok, label: 'TikTok' },
              { Logo: SnapchatLogo, href: SITE_CONFIG.social.snapchat, label: 'Snapchat' },
              { Logo: FacebookLogo, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
            ].map(({ Logo, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} data-testid={`social-${label.toLowerCase()}`}
                className="w-11 h-11 rounded-full bg-ivory grid place-items-center shadow-[0_6px_18px_-8px_rgba(0,0,0,.5)] hover:-translate-y-0.5 transition-transform duration-500 ease-luxe">
                <Logo className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className={col}>La boutique</p>
          <ul className="space-y-1">
            {CATEGORIES.map(c => <li key={c.id}><Link to={`/boutique/${c.id}`} className={lnk}>{c.name}</Link></li>)}
            {FEATURES.marche && <li><Link to="/marche" className={lnk}>Le Marché · monde</Link></li>}
            {FEATURES.offres && <li><Link to="/boutique?promo=1" className={lnk}>Offres</Link></li>}
            {FEATURES.journal && <li><Link to="/journal" className={lnk}>Le journal</Link></li>}
          </ul>
        </div>

        <div>
          <p className={col}>Service client</p>
          <ul className="space-y-1">
            <li><Link to="/compte" className={lnk}>Mon compte</Link></li>
            <li><Link to="/mes-commandes" className={lnk}>Mes commandes</Link></li>
            <li><Link to="/suivi" className={lnk}>Suivre une commande</Link></li>
            <li><Link to="/authentique" className={lnk}>Vérifier l'authenticité</Link></li>
            <li><Link to="/faq" className={lnk}>Livraison & réception</Link></li>
            <li><Link to="/faq#tailles" className={lnk}>Guide des tailles</Link></li>
            <li><Link to="/a-propos" className={lnk}>Notre maison</Link></li>
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <p className={col}>La boutique à Dakar</p>
          <address className="not-italic text-sm text-ivory/65 space-y-3 leading-relaxed">
            <p>{SITE_CONFIG.address}</p>
            <p>Service client sur WhatsApp<br />Lun–Ven {SITE_CONFIG.hours.weekdays} · Sam {SITE_CONFIG.hours.saturday} · Dim {SITE_CONFIG.hours.sunday}</p>
            <p><a href={`tel:${SITE_CONFIG.phoneRaw}`} className={lnk}>{SITE_CONFIG.phone}</a><br /><a href={`mailto:${SITE_CONFIG.email}`} className={lnk}>{SITE_CONFIG.email}</a></p>
          </address>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-6 pb-24 md:pb-6 md:pr-28 flex flex-col md:flex-row gap-4 items-center justify-between text-[11px] text-ivory/65">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name} — Tous droits réservés · <Link to="/admin" className="tap hover:text-ivory">Espace gérant</Link></p>
          <div aria-label="Moyens de paiement" role="group"><PaymentLogos className="justify-center" /></div>
        </div>
      </div>
    </footer>
  );
};
