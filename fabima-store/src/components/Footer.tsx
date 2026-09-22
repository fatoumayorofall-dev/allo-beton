import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Music2 } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../context/StoreContext';

const NEWSLETTER_KEY = 'fabima_newsletter';

export const Footer: React.FC = () => {
  const { notify } = useStore();
  const [email, setEmail] = useState('');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { notify('Adresse e-mail invalide', 'error'); return; }
    try {
      const list: string[] = JSON.parse(localStorage.getItem(NEWSLETTER_KEY) ?? '[]');
      if (!list.includes(email)) localStorage.setItem(NEWSLETTER_KEY, JSON.stringify([...list, email]));
    } catch { /* ignore */ }
    setEmail('');
    notify('Bienvenue dans le cercle Fabima');
  };

  const col = 'text-[10px] uppercase tracking-luxe font-semibold text-gold-light mb-6';
  const lnk = 'link-luxe text-sm text-ivory/65 hover:text-ivory transition-colors';

  return (
    <footer className="relative bg-ink text-ivory mt-32 rounded-t-[3rem] overflow-hidden print:hidden">
      {/* Newsletter */}
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-20 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-end border-b border-ivory/10">
        <div>
          <p className={col}>Le cercle des Fabima Girls</p>
          <h3 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02]">Recevez nos nouveautés<br /><em className="text-gold-light">en avant-première</em></h3>
        </div>
        <form onSubmit={subscribe} className="w-full">
          <label htmlFor="nl-email" className="text-sm text-ivory/60">Ventes privées, lancements de collection et conseils de style — une fois par mois, jamais plus.</label>
          <div className="mt-5 flex border-b border-ivory/40 focus-within:border-gold-light transition-colors">
            <input id="nl-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre adresse e-mail"
              className="flex-1 min-w-0 bg-transparent py-4 text-ivory placeholder:text-ivory/35 outline-none" />
            <button aria-label="S'inscrire" className="px-2 text-[11px] uppercase tracking-[0.22em] font-semibold inline-flex items-center gap-2 hover:text-gold-light">
              S'inscrire <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-16 grid gap-12 grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 lg:col-span-1 space-y-6">
          <p className="font-script text-6xl text-gold-light leading-none">Fabima</p>
          <p className="text-sm text-ivory/55 leading-relaxed max-w-xs">Chaussures, sacs, bijoux et tenues choisis avec amour pour sublimer chaque femme. Maison dakaroise, élégance sans frontières.</p>
          <div className="flex gap-2">
            {[
              { Icon: Instagram, href: SITE_CONFIG.social.instagram, label: 'Instagram' },
              { Icon: Facebook, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
              { Icon: Music2, href: SITE_CONFIG.social.tiktok, label: 'TikTok' },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="w-10 h-10 rounded-full border border-ivory/20 grid place-items-center hover:bg-ivory hover:text-ink transition-colors duration-500">
                <Icon className="w-4 h-4" strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className={col}>La boutique</p>
          <ul className="space-y-3">
            {CATEGORIES.map(c => <li key={c.id}><Link to={`/boutique/${c.id}`} className={lnk}>{c.name}</Link></li>)}
            <li><Link to="/boutique?promo=1" className={lnk}>Soldes</Link></li>
          </ul>
        </div>

        <div>
          <p className={col}>Service client</p>
          <ul className="space-y-3">
            <li><Link to="/mes-commandes" className={lnk}>Mes commandes</Link></li>
            <li><Link to="/suivi" className={lnk}>Suivre une commande</Link></li>
            <li><Link to="/faq" className={lnk}>Livraison & échanges</Link></li>
            <li><Link to="/faq#tailles" className={lnk}>Guide des tailles</Link></li>
            <li><Link to="/a-propos" className={lnk}>Notre maison</Link></li>
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <p className={col}>La boutique à Dakar</p>
          <address className="not-italic text-sm text-ivory/65 space-y-3 leading-relaxed">
            <p>{SITE_CONFIG.address}</p>
            <p>Lun–Ven {SITE_CONFIG.hours.weekdays}<br />Sam {SITE_CONFIG.hours.saturday} · Dim {SITE_CONFIG.hours.sunday}</p>
            <p><a href={`tel:${SITE_CONFIG.phoneRaw}`} className={lnk}>{SITE_CONFIG.phone}</a><br /><a href={`mailto:${SITE_CONFIG.email}`} className={lnk}>{SITE_CONFIG.email}</a></p>
          </address>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-6 flex flex-col md:flex-row gap-4 items-center justify-between text-[11px] text-ivory/40">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name} — Tous droits réservés · <Link to="/admin" className="hover:text-ivory/70">Espace gérant</Link></p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 uppercase tracking-[0.18em] text-[9px]">
            {['Wave', 'Orange Money', 'Free Money', 'Visa', 'Mastercard', 'Espèces'].map(m => <li key={m}>{m}</li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
};
