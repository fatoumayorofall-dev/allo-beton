import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { CATEGORIES } from '../data/catalog';
import { ProductImage } from './ProductImage';

/**
 * Bulles « style » façon stories : un rond par type de pièce (Escarpins, Sandales, Sacs à main…),
 * avec une photo du catalogue. Un toucher mène aux pièces de ce style.
 */
export const StyleStories: React.FC = () => {
  const { products } = useStore();
  const styles = useMemo(() => {
    const map = new Map<string, { category: string; sub: string; image: string; count: number; isNew: boolean }>();
    for (const c of CATEGORIES) {
      for (const p of products.filter(x => x.category === c.id)) {
        const key = `${c.id}|${p.subcategory}`;
        const cur = map.get(key);
        if (cur) { cur.count += 1; cur.isNew ||= !!p.isNew; }
        else map.set(key, { category: c.id, sub: p.subcategory, image: p.images[0], count: 1, isNew: !!p.isNew });
      }
    }
    return [...map.values()];
  }, [products]);
  // Flèches (ordinateur) quand toutes les bulles ne tiennent pas à l'écran
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const el = scroller.current;
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [styles.length]);
  const slide = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.7, behavior: 'smooth' });
  if (styles.length < 3) return null;

  return (
    <section className="relative max-w-[1440px] mx-auto pt-10 sm:pt-14" aria-label="Styles">
      <p className="text-center font-script text-3xl text-gold-dark">Trouvez votre style</p>
      <div className="relative mt-6">
      <div ref={scroller} onScroll={measure} className="overflow-x-auto no-scrollbar snap-x lg:snap-none">
      <ul className="flex w-max mx-auto gap-5 sm:gap-7 px-5 sm:px-8 lg:px-12 pb-2" data-testid="style-stories">
        {styles.map(s => (
          <li key={`${s.category}-${s.sub}`} className="snap-start shrink-0">
            <Link to={`/boutique/${s.category}?type=${encodeURIComponent(s.sub)}`} className="group flex flex-col items-center w-[84px] sm:w-[96px]">
              <span className="relative">
                <span className="story-ring relative grid place-items-center w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-full p-[3px]">
                  <span className="block w-full h-full rounded-full overflow-hidden border-[3px] border-ivory bg-ivory-deep">
                    <ProductImage src={s.image} alt="" label="" className="w-full h-full transition-transform duration-700 ease-luxe group-hover:scale-110" />
                  </span>
                </span>
                {s.isNew && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-wine text-white text-[8px] font-bold tracking-[0.12em] uppercase">Nouveau</span>}
              </span>
              <span className="mt-2.5 text-[12px] font-medium text-center leading-tight line-clamp-2">{s.sub}</span>
              <span className="text-[10px] text-ink/70">{s.count} modèle{s.count > 1 ? 's' : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
      {(['left', 'right'] as const).map(side => edges[side] && (
        <button key={side} onClick={() => slide(side === 'left' ? -1 : 1)} aria-label={side === 'left' ? 'Styles précédents' : 'Styles suivants'}
          className={`hidden lg:grid absolute top-8 ${side === 'left' ? 'left-4' : 'right-4'} w-11 h-11 rounded-full bg-white shadow-soft place-items-center hover:scale-105 transition-transform`}>
          {side === 'left' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      ))}
      </div>
    </section>
  );
};
