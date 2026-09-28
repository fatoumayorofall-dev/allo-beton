import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ARTICLES } from '../data/journal';
import { ProductImage } from './ProductImage';

/** Carte d'un article du journal (accueil et page Journal). `level` : niveau du titre selon la page. */
export const ArticleCard: React.FC<{ article: (typeof ARTICLES)[number]; large?: boolean; level?: 2 | 3 }> = ({ article, large, level = 3 }) => {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <Link to={`/journal/${article.slug}`} className="group block">
      <div className={`overflow-hidden ${large ? 'rounded-[2.5rem] aspect-[16/10]' : 'arch aspect-[4/5]'}`}>
        <ProductImage src={article.image} alt={article.title} label={article.category} className="w-full h-full group-hover:scale-105 transition-transform duration-[1.2s] ease-luxe" />
      </div>
      <p className="eyebrow mt-5">{article.category} · {article.readingTime} min</p>
      <Heading className={`font-display leading-tight mt-2 group-hover:text-gold-dark transition-colors ${large ? 'text-4xl sm:text-5xl' : 'text-2xl'}`}>{article.title}</Heading>
      <p className="text-sm text-ink/75 mt-3 leading-relaxed line-clamp-2">{article.excerpt}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">Lire <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" /></span>
    </Link>
  );
};
