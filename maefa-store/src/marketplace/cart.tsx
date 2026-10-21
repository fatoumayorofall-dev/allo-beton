import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MpListing } from './api';

/** Une ligne du panier : de quoi l'afficher sans réseau ; le prix réel est toujours revérifié par le serveur. */
export interface MpCartItem {
  listingId: string;
  title: string;
  photo: string;
  price: number;
  qty: number;
  variant: string | null;
  variantLabel: string | null;
  sellerId: string;
  shopName: string;
}

const KEY = 'mp_cart';
const read = (): MpCartItem[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

interface CartValue {
  items: MpCartItem[];
  count: number;
  /** price : prix convenu en discutant (sinon le prix affiché) */
  add: (l: MpListing, qty: number, variant: string | null, price?: number) => void;
  setQty: (listingId: string, variant: string | null, qty: number) => void;
  remove: (listingId: string, variant: string | null) => void;
  clear: () => void;
}
const Ctx = createContext<CartValue | null>(null);

const write = (items: MpCartItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible : le panier reste en mémoire */
  }
  return items;
};

export const MpCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setRaw] = useState<MpCartItem[]>(read);
  // Écrit tout de suite (et pas après l'affichage) : « Commander » change de page dans le même geste
  const setItems = useCallback((fn: (list: MpCartItem[]) => MpCartItem[]) => setRaw(list => write(fn(list))), []);
  // Panier modifié dans un autre onglet
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setRaw(read());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  const same = (i: MpCartItem, id: string, v: string | null) => i.listingId === id && i.variant === v;
  const add = useCallback(
    (l: MpListing, qty: number, variant: string | null, price?: number) => {
      setItems(list => {
        const found = list.find(i => same(i, l.id, variant));
        if (found) return list.map(i => (i === found ? { ...i, qty: Math.min(20, i.qty + qty) } : i));
        return [
          ...list,
          {
            listingId: l.id,
            title: l.title,
            photo: l.photos[0],
            price: price ?? l.price ?? 0,
            qty,
            variant,
            variantLabel: l.variantLabel,
            sellerId: l.seller?.id ?? '',
            shopName: l.seller?.shopName ?? '',
          },
        ];
      });
    },
    [setItems],
  );
  const setQty = useCallback(
    (id: string, v: string | null, qty: number) =>
      setItems(list => list.map(i => (same(i, id, v) ? { ...i, qty: Math.max(1, Math.min(20, qty)) } : i))),
    [setItems],
  );
  const remove = useCallback(
    (id: string, v: string | null) => setItems(list => list.filter(i => !same(i, id, v))),
    [setItems],
  );
  const clear = useCallback(() => setItems(() => []), [setItems]);
  const value = useMemo(
    () => ({ items, count: items.reduce((t, i) => t + i.qty, 0), add, setQty, remove, clear }),
    [items, add, setQty, remove, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useMpCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMpCart doit être utilisé dans <MpCartProvider>');
  return v;
}
