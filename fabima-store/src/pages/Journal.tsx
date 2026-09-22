import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { ARTICLES } from '../data/journal';
import { useStore } from '../context/StoreContext';
import { usePageTitle } from '../utils/usePageTitle';
import { ProductImage } from '../components/ProductImage';
import { ProductCard } from '../components/ProductCard';
import { Reveal } from '../components/Reveal';
import { Flourish, Flower } from '../components/Decor';

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const ArticleCard: React.FC<{ article: (typeof ARTICLES)[number]; large?: boolean }> = ({ article, large }) => (
  <Link to={`/journal/${article.slug}`} className="group block">
    <div className={`overflow-hidden ${large ? 'rounded-[2.5rem] aspect-[16/10]' : 'arch aspect-[4/5]'}`}>
      <ProductImage src={article.image} alt={article.title} label={article.category} className="w-full h-full group-hover:scale-105 transition-transform duration-[1.2s] ease-luxe" />
    </div>
    <p className="eyebrow mt-5">{article.category} · {article.readingTime} min</p>
    <h3 className={`font-display leading-tight mt-2 group-hover:text-gold-dark transition-colors ${large ? 'text-4xl sm:text-5xl' : 'text-2xl'}`}>{article.title}</h3>
    <p className="text-sm text-ink/60 mt-3 leading-relaxed line-clamp-2">{article.excerpt}</p>
    <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">Lire <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
  </Link>
);

export const Journal: React.FC = () => {
  usePageTitle('Le journal', 'Conseils de style, guides d\'occasion et astuces d\'entretien par l\'équipe Fabima Store.');
  const [first, ...rest] = ARTICLES;
  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-16">
      <div className="text-center">
        <p className="font-script text-4xl text-gold-dark">Le journal</p>
        <h1 className="font-display text-5xl sm:text-7xl mt-2">Conseils & inspirations</h1>
        <p className="text-ink/60 mt-4 max-w-lg mx-auto">Guides d'occasion, astuces de style et soins : tout ce que notre équipe aime partager avec vous.</p>
        <Flourish className="mt-10" />
      </div>
      <Reveal className="mt-16"><ArticleCard article={first} large /></Reveal>
      <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
        {rest.map((a, i) => <Reveal key={a.slug} delay={i * 90}><ArticleCard article={a} /></Reveal>)}
      </div>
    </div>
  );
};

export const ArticlePage: React.FC = () => {
  const { slug = '' } = useParams();
  const { getProduct } = useStore();
  const article = ARTICLES.find(a => a.slug === slug);
  usePageTitle(article?.title, article?.excerpt);

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
        <Link to="/journal" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink/55 hover:text-ink"><ArrowLeft className="w-3.5 h-3.5" /> Le journal</Link>
        <p className="eyebrow mt-8">{article.category}</p>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mt-4">{article.title}</h1>
        <p className="mt-6 text-xs text-ink/50 flex items-center justify-center gap-3">
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
