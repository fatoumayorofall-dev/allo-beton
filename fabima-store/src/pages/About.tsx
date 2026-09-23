import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { Reveal } from '../components/Reveal';
import { usePageTitle } from '../utils/usePageTitle';

const px = (id: number, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const About: React.FC = () => {
  usePageTitle('Notre maison');
  return (
    <div>
      <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 text-center">
        <p className="eyebrow animate-fade-up">Notre maison</p>
        <h1 className="font-display text-6xl sm:text-8xl leading-[0.95] mt-6 animate-fade-up" style={{ animationDelay: '120ms' }}>Née à Dakar,<br /><span className="font-script text-gold-dark text-[1.1em]">pensée pour elle</span></h1>
      </section>

      <Reveal className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 mt-16">
        <ProductImage src={px(1488463, 2000)} alt="La boutique Fabima à Dakar" label="La boutique · Sacré-Cœur" className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-[3rem]" />
      </Reveal>

      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 mt-24 grid lg:grid-cols-12 gap-10">
        <Reveal className="lg:col-span-4"><p className="eyebrow">Depuis 2021</p><h2 className="font-display text-4xl sm:text-5xl mt-4 leading-tight">Une exigence, une promesse</h2></Reveal>
        <Reveal className="lg:col-span-7 lg:col-start-6 space-y-6 text-ink/70 leading-relaxed text-[15px]" delay={120}>
          <p className="font-display text-2xl sm:text-3xl text-ink leading-snug">Fabima est née d'une conviction simple : chaque femme mérite de se sentir belle, sans que l'élégance soit un luxe inaccessible.</p>
          <p>Nous sélectionnons chaque paire de chaussures et chaque sac avec la même exigence que s'ils nous étaient destinés. Nous collaborons avec des artisanes dakaroises pour nos sacs en wax, afin que chaque pièce raconte aussi une histoire d'ici.</p>
          <p>Commandez en quelques instants, réglez par Wave ou Orange Money, et recevez vos pièces dès le lendemain à Dakar, soigneusement emballées.</p>
        </Reveal>
      </section>

      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 mt-28 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-ink/10">
        {[
          ['01', 'Sélection', 'Chaque pièce est choisie, essayée et contrôlée avant de rejoindre la boutique.'],
          ['02', 'Artisanat', 'Nos créations en wax sont coupées et cousues à la main dans la Médina.'],
          ['03', 'Service', 'Un conseil personnalisé sur WhatsApp, 7 jours sur 7.'],
          ['04', 'Responsabilité', 'Pochettes réutilisables, papier recyclé et livraisons groupées.'],
        ].map(([n, t, d], i) => (
          <Reveal key={t} delay={i * 90} className={`py-10 sm:pr-8 ${i > 0 ? 'sm:pl-8 sm:border-l' : ''} border-ink/10`}>
            <p className="font-script text-gold-dark text-4xl">{n}</p>
            <h3 className="font-display text-3xl mt-4">{t}</h3>
            <p className="text-sm text-ink/60 mt-3 leading-relaxed">{d}</p>
          </Reveal>
        ))}
      </section>

      <section className="bg-ink text-ivory mt-20">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-20 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[['5 000+', 'clientes conquises'], ['300+', 'pièces en boutique'], ['24h', 'livraison à Dakar'], ['4,8/5', 'note moyenne']].map(([n, l]) => (
            <Reveal key={l}><p className="font-display text-5xl sm:text-6xl text-gold-light">{n}</p><p className="text-[10px] uppercase tracking-luxe text-ivory/60 mt-3">{l}</p></Reveal>
          ))}
        </div>
      </section>

      <section className="text-center pt-24 px-5">
        <h2 className="font-display text-4xl sm:text-5xl">Venez nous rendre visite</h2>
        <p className="text-ink/60 mt-3">Sacré-Cœur 3, Dakar — ou découvrez la boutique en ligne.</p>
        <Link to="/boutique" className="btn-dark mt-8">Entrer dans la boutique <ArrowRight className="w-4 h-4" /></Link>
      </section>
    </div>
  );
};
