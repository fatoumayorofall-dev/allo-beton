import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CreditCard, Globe2, PackageCheck, Search, ShoppingBag, Truck } from 'lucide-react';
import { usePageTitle } from '../utils/usePageTitle';
import { useMarket } from '../utils/market';
import { MarketCard } from '../components/MarketCard';
import { Reveal } from '../components/Reveal';

const SORTS = { recent: 'Nouveautés', prix_asc: 'Prix croissant', prix_desc: 'Prix décroissant' } as const;

/**
 * Le Marché Fabima : produits en dropshipping, commandés chez nos partenaires
 * au moment de la commande puis livrés chez la cliente.
 */
export const Market: React.FC = () => {
  usePageTitle('Le Marché', 'Le Marché Fabima : encore plus de chaussures et de sacs, commandés pour vous chez nos partenaires et livrés chez vous au Sénégal.');
  const { products, loading, offline } = useMarket();
  const [params] = useSearchParams();
  const [cat, setCat] = useState(params.get('categorie') ?? '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<keyof typeof SORTS>('recent');

  const categories = useMemo(() => [...new Set((products ?? []).map(p => p.category))].sort(), [products]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const l = (products ?? []).filter(p => (!cat || p.category === cat) && (!term || `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)));
    if (sort === 'prix_asc') l.sort((a, b) => a.price - b.price);
    if (sort === 'prix_desc') l.sort((a, b) => b.price - a.price);
    return l;
  }, [products, cat, q, sort]);

  return (
    <div>
      {/* Bannière */}
      <section className="relative overflow-hidden bg-ink text-ivory rounded-b-[3rem] mx-0 sm:mx-4 grain">
        <span className="pointer-events-none absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full bg-wine/40 blur-[110px]" aria-hidden />
        <span className="pointer-events-none absolute -bottom-40 -left-24 w-[30rem] h-[30rem] rounded-full bg-gold/25 blur-[110px]" aria-hidden />
        <div className="relative max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-10 sm:pt-24 sm:pb-20">
          <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-luxe text-gold-light"><Globe2 className="w-4 h-4" /> Fabima dans le monde</p>
          <h1 className="font-display text-5xl sm:text-7xl leading-[0.95] mt-5">Le Marché <span className="font-script text-gold-light text-[1.15em]">Fabima</span></h1>
          <p className="mt-5 text-ivory/70 max-w-xl leading-relaxed">Encore plus de chaussures et de sacs, dénichés pour vous chez nos partenaires dans le monde entier. Nous les commandons dès votre achat et vous les livrons chez vous, avec un suivi à chaque étape.</p>
          <ol className="mt-10 flex sm:grid sm:grid-cols-3 gap-3 max-w-4xl overflow-x-auto no-scrollbar snap-x -mx-5 px-5 sm:mx-0 sm:px-0">
            {[
              { Icon: ShoppingBag, t: '1. Vous commandez', d: 'Paiement sécurisé : Wave, Orange Money, Free Money ou carte.' },
              { Icon: PackageCheck, t: '2. Nous commandons', d: 'Chez notre partenaire, le jour même. Vous êtes prévenue sur WhatsApp.' },
              { Icon: Truck, t: '3. Livré chez vous', d: 'Suivi du colis jusqu\'à Dakar, puis notre livreur vient à votre porte.' },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="p-5 rounded-[1.5rem] glass min-w-[78%] sm:min-w-0 snap-start">
                <Icon className="w-5 h-5 text-gold-light" strokeWidth={1.5} />
                <p className="font-display text-xl mt-3">{t}</p>
                <p className="text-xs text-ivory/65 mt-1 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Filtres */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-8 sticky top-16 lg:top-[116px] z-30 bg-ivory/95 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0 flex-1">
            {['', ...categories].map(c => (
              <button key={c || 'all'} onClick={() => setCat(c)}
                className={`px-4 h-10 rounded-full text-sm whitespace-nowrap border transition-colors ${cat === c ? 'bg-ink text-ivory border-ink' : 'bg-white border-ink/10 hover:border-ink/40'}`}>
                {c || `Tout (${products?.length ?? 0})`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
              <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Rechercher au Marché" aria-label="Rechercher au Marché" className="field !h-10 !pl-10" />
            </label>
            <select value={sort} onChange={e => setSort(e.target.value as keyof typeof SORTS)} aria-label="Trier" className="h-10 px-3 rounded-full border border-ink/10 bg-white text-sm">
              {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] rounded-[2rem] bg-blush/30 animate-pulse" />)}</div>
        ) : list.length ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-12">
            {list.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><MarketCard product={p} /></Reveal>)}
          </div>
        ) : (
          <div className="text-center py-24">
            <Globe2 className="w-10 h-10 mx-auto text-gold" strokeWidth={1.2} />
            <p className="font-display text-3xl mt-4">{offline ? 'Le Marché est momentanément indisponible' : products?.length ? 'Aucun article ne correspond' : 'Le Marché ouvre très bientôt'}</p>
            <p className="text-ink/55 mt-2">{offline ? 'Vérifiez votre connexion et réessayez.' : 'En attendant, découvrez nos chaussures et nos sacs.'}</p>
            <Link to="/boutique" className="btn-dark mt-8">Voir la boutique</Link>
          </div>
        )}

        <p className="mt-16 flex items-start gap-3 max-w-2xl mx-auto text-sm text-ink/55 p-5 rounded-2xl bg-white border border-ink/[0.06]">
          <CreditCard className="w-5 h-5 text-wine shrink-0 mt-0.5" strokeWidth={1.5} />
          Les articles du Marché sont commandés spécialement pour vous : ils se règlent à la commande et le délai de livraison est indiqué sur chaque fiche. Une question ? Écrivez-nous sur WhatsApp.
        </p>
      </div>
    </div>
  );
};

export default Market;
