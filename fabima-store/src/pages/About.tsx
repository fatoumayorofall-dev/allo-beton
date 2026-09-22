import React from 'react';
import { Link } from 'react-router-dom';
import { Gem, HeartHandshake, Leaf, Truck } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { usePageTitle } from '../utils/usePageTitle';

export const About: React.FC = () => {
  usePageTitle('Notre histoire');
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-gold-dark uppercase tracking-[0.3em] text-xs">Notre histoire</p>
          <h1 className="font-display text-5xl mt-3 leading-tight">Née à Dakar, pensée pour vous</h1>
          <p className="mt-6 text-ink/70 leading-relaxed">
            Fabima Store est née d'une passion simple : rendre la mode de qualité accessible à toutes et à tous au Sénégal.
            Nous sélectionnons chaque paire de chaussures, chaque sac et chaque bijou avec exigence, et nous collaborons
            avec des artisanes et tailleurs dakarois pour nos collections en wax et bazin.
          </p>
          <p className="mt-4 text-ink/70 leading-relaxed">
            Commandez en quelques clics, payez avec Wave ou Orange Money, et recevez vos articles dès le lendemain à Dakar.
          </p>
          <Link to="/boutique" className="inline-block mt-8 px-7 py-3.5 rounded-full bg-ink text-ivory font-semibold">Découvrir la boutique</Link>
        </div>
        <ProductImage src="https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg?auto=compress&cs=tinysrgb&w=1000" alt="Boutique Fabima" className="w-full aspect-[4/5] rounded-3xl" />
      </div>

      <div className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { Icon: Gem, t: 'Qualité sélectionnée', d: 'Chaque article est contrôlé avant expédition.' },
          { Icon: HeartHandshake, t: 'Artisanat local', d: 'Nos pièces en wax sont confectionnées à Dakar.' },
          { Icon: Truck, t: 'Livraison rapide', d: '24h à Dakar, partout au Sénégal en 72h.' },
          { Icon: Leaf, t: 'Emballage responsable', d: 'Pochettes réutilisables et papier recyclé.' },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="bg-white rounded-3xl p-7">
            <Icon className="w-8 h-8 text-gold-dark" strokeWidth={1.5} />
            <h3 className="font-display text-xl mt-4">{t}</h3>
            <p className="text-sm text-ink/60 mt-2">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[['5 000+', 'clients satisfaits'], ['300+', 'articles en boutique'], ['24h', 'livraison à Dakar'], ['4,8/5', 'note moyenne']].map(([n, l]) => (
          <div key={l}><p className="font-display text-4xl sm:text-5xl text-gold-dark">{n}</p><p className="text-sm text-ink/60 mt-1">{l}</p></div>
        ))}
      </div>
    </div>
  );
};
