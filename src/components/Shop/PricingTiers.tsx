/**
 * ALLO BÉTON — Composant Tarifs dégressifs
 * Affiche les paliers de prix + highlight du palier actif selon la quantité
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tag, TrendingDown, Percent, BadgeCheck } from 'lucide-react';
import { useEcommerce } from '../../contexts/EcommerceContext';

interface PricingTier {
  id: string;
  min_quantity: number;
  max_quantity: number | null;
  unit_price: number;
  discount_percent: number;
  label: string | null;
}

interface Props {
  productId: string;
  quantity: number;
  basePrice: number;
  unit?: string;
}

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api/ecommerce'
    : 'https://allobeton-backend-production-91e5.up.railway.app/api/ecommerce');

export const PricingTiers: React.FC<Props> = ({ productId, quantity, basePrice, unit = 'm³' }) => {
  const { formatPrice } = useEcommerce();
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/pricing/${productId}`);
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setTiers(json.data);
      }
    } catch (e) {
      console.debug('PricingTiers load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return null;
  if (tiers.length === 0) return null;

  // Détermine le palier actif
  const activeTier = [...tiers]
    .sort((a, b) => b.min_quantity - a.min_quantity)
    .find((t) => quantity >= t.min_quantity && (t.max_quantity === null || quantity <= t.max_quantity));

  const activeUnitPrice = activeTier ? activeTier.unit_price : basePrice;
  const savings = (basePrice - activeUnitPrice) * quantity;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-slate-50 rounded-2xl border border-orange-100 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
          <TrendingDown className="w-4.5 h-4.5 text-orange-700" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Tarifs dégressifs</h4>
          <p className="text-[11px] text-slate-500">Plus vous commandez, moins c'est cher</p>
        </div>
      </div>

      {/* Grille des paliers */}
      <div className="space-y-2">
        {tiers.map((tier) => {
          const isActive =
            quantity >= tier.min_quantity &&
            (tier.max_quantity === null || quantity <= tier.max_quantity);
          const range = tier.max_quantity
            ? `${tier.min_quantity}–${tier.max_quantity}`
            : `${tier.min_quantity}+`;

          return (
            <div
              key={tier.id}
              className={`
                flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all
                ${
                  isActive
                    ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20 scale-[1.01]'
                    : 'bg-white border-slate-200 hover:border-orange-200'
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isActive && <BadgeCheck className="w-4 h-4 flex-shrink-0 text-orange-200" />}
                <div>
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {range} {unit}
                  </span>
                  {tier.label && (
                    <p className={`text-[11px] mt-0.5 ${isActive ? 'text-orange-200' : 'text-slate-500'}`}>
                      {tier.label}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {tier.discount_percent > 0 && (
                  <span
                    className={`
                      inline-flex items-center gap-1 text-[10px] font-bold rounded-md px-2 py-0.5
                      ${isActive ? 'bg-orange-500 text-orange-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}
                    `}
                  >
                    <Percent className="w-3 h-3" />
                    -{tier.discount_percent}%
                  </span>
                )}
                <span className={`text-sm font-black tabular-nums ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {formatPrice(tier.unit_price)}
                  <span className={`text-[10px] font-medium ${isActive ? 'text-orange-200' : 'text-slate-400'}`}>
                    /{unit}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Économie calculée */}
      {activeTier && savings > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            <span className="font-black">{formatPrice(savings)}</span> d'économie sur{' '}
            <span className="font-bold">{quantity} {unit}</span>
            <span className="text-emerald-600"> (−{activeTier.discount_percent}%)</span>
          </p>
        </div>
      )}

      {/* Hint volume */}
      {!activeTier && tiers.length > 0 && (
        <p className="text-[11px] text-center text-slate-500">
          Commandez <span className="font-bold text-orange-700">{tiers[0].min_quantity}+ {unit}</span> pour bénéficier d'une remise
        </p>
      )}
    </div>
  );
};

export default PricingTiers;
