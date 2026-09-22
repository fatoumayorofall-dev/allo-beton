import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Facebook, Instagram, Mail, MapPin, Phone, Music2 } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';
import { CATEGORIES } from '../data/catalog';
import { useStore } from '../context/StoreContext';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  const { notify } = useStore();
  const [email, setEmail] = useState('');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { notify('Adresse e-mail invalide', 'error'); return; }
    setEmail('');
    notify('Merci ! Vous recevrez nos nouveautés en avant-première.');
  };

  return (
    <footer className="bg-ink text-ivory/80 mt-24">
      {/* Newsletter */}
      <div className="border-b border-ivory/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-display text-3xl text-ivory">Rejoignez le cercle Fabima</h3>
            <p className="mt-2 text-sm text-ivory/60">Nouveautés, ventes privées et conseils de style, directement dans votre boîte mail.</p>
          </div>
          <form onSubmit={subscribe} className="flex gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Votre adresse e-mail" aria-label="Adresse e-mail"
              className="flex-1 min-w-0 px-5 py-3.5 rounded-full bg-ivory/10 border border-ivory/15 text-ivory placeholder:text-ivory/40 outline-none focus:border-gold" />
            <button className="px-6 py-3.5 rounded-full bg-gold text-ink font-semibold hover:bg-gold-light transition-colors whitespace-nowrap">S'inscrire</button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm text-ivory/60 leading-relaxed">Chaussures, sacs, accessoires et bijoux sélectionnés avec soin pour sublimer votre style, à Dakar et partout au Sénégal.</p>
          <div className="flex gap-3">
            {[
              { Icon: Instagram, href: SITE_CONFIG.social.instagram, label: 'Instagram' },
              { Icon: Facebook, href: SITE_CONFIG.social.facebook, label: 'Facebook' },
              { Icon: Music2, href: SITE_CONFIG.social.tiktok, label: 'TikTok' },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                className="w-10 h-10 rounded-full border border-ivory/20 grid place-items-center hover:bg-gold hover:border-gold hover:text-ink transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-ivory font-semibold mb-4 uppercase text-xs tracking-[0.2em]">Boutique</h4>
          <ul className="space-y-2.5 text-sm">
            {CATEGORIES.map(c => <li key={c.id}><Link to={`/boutique/${c.id}`} className="hover:text-gold-light">{c.name}</Link></li>)}
            <li><Link to="/boutique?promo=1" className="hover:text-gold-light">Soldes</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-ivory font-semibold mb-4 uppercase text-xs tracking-[0.2em]">Service client</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/suivi" className="hover:text-gold-light">Suivre ma commande</Link></li>
            <li><Link to="/faq" className="hover:text-gold-light">Livraison & retours</Link></li>
            <li><Link to="/faq" className="hover:text-gold-light">Guide des tailles</Link></li>
            <li><Link to="/a-propos" className="hover:text-gold-light">Notre histoire</Link></li>
            <li><Link to="/admin" className="hover:text-gold-light">Espace gérant</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-ivory font-semibold mb-4 uppercase text-xs tracking-[0.2em]">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />{SITE_CONFIG.address}</li>
            <li><a href={`tel:${SITE_CONFIG.phoneRaw}`} className="flex gap-2.5 hover:text-gold-light"><Phone className="w-4 h-4 text-gold" />{SITE_CONFIG.phone}</a></li>
            <li><a href={`mailto:${SITE_CONFIG.email}`} className="flex gap-2.5 hover:text-gold-light"><Mail className="w-4 h-4 text-gold" />{SITE_CONFIG.email}</a></li>
            <li className="flex gap-2.5"><Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" /><span>Lun–Ven {SITE_CONFIG.hours.weekdays}<br />Sam {SITE_CONFIG.hours.saturday} · Dim {SITE_CONFIG.hours.sunday}</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-ivory/50">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap justify-center items-center gap-2">
            {['Wave', 'Orange Money', 'Free Money', 'Visa / Mastercard', 'Espèces'].map(m => (
              <span key={m} className="px-2.5 py-1 rounded-md bg-ivory/10 text-ivory/70 text-[10px] font-semibold">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
