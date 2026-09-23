import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { ARTICLES } from '../data/journal';
import { useStore } from '../context/StoreContext';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { ArticleCard } from '../components/ArticleCard';
import { BrandMark } from '../components/Logo';
import { ProductCard } from '../components/ProductCard';
import { Reveal } from '../components/Reveal';
import { Flourish, Flower } from '../components/Decor';

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const Journal: React.FC = () => {
  usePageTitle('Le journal', 'Conseils de style, guides d\'occasion et astuces d\'entretien par l\'équipe Fabima Store.');
  const [first, ...rest] = ARTICLES;
  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-16">
      <div className="text-center">
        <p className="font-script text-4xl text-gold-dark">Le journal</p>
        <h1 className="font-display text-5xl sm:text-7xl mt-2">Conseils & inspirations</h1>
        <p className="text-ink/75 mt-4 max-w-lg mx-auto">Guides d'occasion, astuces de style et soins : tout ce que notre équipe aime partager avec vous.</p>
        <Flourish className="mt-10" />
      </div>
      {/* Article vedette en mise en page magazine : photo à gauche, texte à droite */}
      <Reveal className="mt-16">
        <Link to={`/journal/${first.slug}`} className="group grid lg:grid-cols-[1.35fr_1fr] gap-8 lg:gap-14 items-center">
          <div className="overflow-hidden rounded-[2.5rem] aspect-[16/11] bg-ivory-deep">
            <ProductImage src={first.image} alt={first.title} label={first.category} sizes="(min-width: 1024px) 55vw, 100vw" priority className="w-full h-full group-hover:scale-105 transition-transform duration-[1.2s] ease-luxe" />
          </div>
          <div>
            <p className="eyebrow">À la une · {first.category} · {first.readingTime} min</p>
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] mt-4 group-hover:text-gold-dark transition-colors">{first.title}</h2>
            <p className="text-ink/75 mt-5 leading-relaxed max-w-md">{first.excerpt}</p>
            <span className="mt-7 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">Lire l'article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </div>
        </Link>
      </Reveal>
      {rest.length > 0 && (
        <div className={`mt-20 grid gap-x-8 gap-y-16 ${rest.length === 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : rest.length === 2 ? 'sm:grid-cols-2 max-w-4xl' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {rest.map((a, i) => <Reveal key={a.slug} delay={i * 90}><ArticleCard article={a} level={2} /></Reveal>)}
          {rest.length === 1 && (
            <Reveal delay={90} className="hidden sm:flex lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-ink text-ivory p-8 sm:p-12 flex-col justify-end">
              <BrandMark light className="absolute -top-10 right-10 h-[70%] w-auto opacity-[0.12] rotate-[8deg] pointer-events-none" />
              <span className="pointer-events-none absolute -bottom-24 -left-16 w-80 h-80 rounded-full bg-wine/40 blur-[90px]" aria-hidden />
              <p className="relative eyebrow !text-gold-light">Le cercle des Fabima Girls</p>
              <p className="relative font-display text-4xl sm:text-5xl leading-[1.05] mt-4">Nos prochains conseils, <em className="text-gold-light text-magic-light">directement chez vous</em></p>
              <p className="relative text-ivory/75 mt-4 max-w-md">Guides d'occasion, soins du cuir et nouveautés : une lettre par mois, jamais plus. Inscription en bas de page.</p>
              <Link to="/boutique?tri=nouveautes" className="relative btn-light mt-8 self-start">Voir les nouveautés <ArrowRight className="w-4 h-4" /></Link>
            </Reveal>
          )}
        </div>
      )}
    </div>
  );
};

export const ArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { getProduct } = useStore();
  const article = ARTICLES.find(a => a.slug === slug);
  usePageTitle(article?.title, article?.excerpt, { image: article?.image });

  if (!article) {
    return (
      <div className="max-w-xl mx-auto text-center py-40 px-5">
        <h1 className="font-display text-5xl">Article introuvable</h1>
        <Link to="/journal" className="btn-dark mt-10">Retour au journal</Link>
      </div>
    );
  }
  const others = ARTICLES.filter(a => a.slug !== article.slug).slice(0, 3);

  return (
    <article>
      <header className="max-w-3xl mx-auto px-5 sm:px-8 pt-14 text-center">
        <Link to="/journal" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink/70 hover:text-ink"><ArrowLeft className="w-3.5 h-3.5" /> Le journal</Link>
        <p className="eyebrow mt-8">{article.category}</p>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mt-4">{article.title}</h1>
        <p className="mt-6 text-xs text-ink/70 flex items-center justify-center gap-3">
          <span>{formatDay(article.date)}</span><span>·</span><span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.readingTime} min de lecture</span>
        </p>
      </header>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 mt-12">
        <ProductImage src={article.image} alt={article.title} label={article.category} className="w-full aspect-[16/9] rounded-[2.5rem]" />
      </div>

      <div className="max-w-2xl mx-auto px-5 sm:px-8 mt-14">
        <p className="font-display text-2xl sm:text-3xl leading-snug text-ink/90">{article.excerpt}</p>
        {article.blocks.map((b, i) => {
          if (b.type === 'h') return <h2 key={i} className="font-display text-3xl mt-12">{b.text}</h2>;
          if (b.type === 'p') return <p key={i} className="mt-5 text-[16px] leading-[1.85] text-ink/75">{b.text}</p>;
          if (b.type === 'tip') {
            return (
              <aside key={i} className="mt-10 p-6 rounded-3xl bg-gradient-to-br from-ivory-deep to-blush/50 flex gap-4">
                <Flower className="w-5 h-5 text-gold shrink-0 mt-1" />
                <div><p className="font-script text-2xl text-gold-dark leading-none">L'astuce</p><p className="mt-2 text-sm text-ink/75 leading-relaxed">{b.text}</p></div>
              </aside>
            );
          }
          const items = b.slugs.map(getProduct).filter((p): p is NonNullable<typeof p> => !!p);
          return items.length ? (
            <div key={i} className="my-12 -mx-5 sm:-mx-24 lg:-mx-40">
              <p className="eyebrow text-center mb-6">Les pièces citées</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-5 sm:px-0">{items.map(p => <ProductCard key={p.id} product={p} />)}</div>
            </div>
          ) : null;
        })}
        <Flourish className="mt-16" />
      </div>

      <section className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-24">
        <h2 className="font-display text-4xl sm:text-5xl mb-10">À lire aussi</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">{others.map(a => <ArticleCard key={a.slug} article={a} />)}</div>
      </section>
    </article>
  );
};
