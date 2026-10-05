/**
 * Adresses de livraison enregistrées : Maison, Bureau, Chez maman…
 * Gardées sur le téléphone, et dans le compte quand la cliente est connectée (retrouvées partout).
 */
import { useCallback, useEffect, useState } from 'react';
import type { DeliveryLocation, SavedAddress } from '../data/types';
import { useAccount } from '../context/AccountContext';

const KEY = 'maefa_addresses';
const MAX = 10;
const read = (): SavedAddress[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};
const write = (list: SavedAddress[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

/** Noms proposés en un geste (pas besoin d'écrire). */
export const ADDRESS_NAMES = [
  { name: 'Maison', icon: '🏠' },
  { name: 'Bureau', icon: '💼' },
  { name: 'Chez maman', icon: '👵🏾' },
  { name: 'Famille', icon: '👪' },
  { name: 'École', icon: '🏫' },
  { name: 'Boutique', icon: '🏪' },
];

const near = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.abs(a.lat - b.lat) < 0.0002 && Math.abs(a.lng - b.lng) < 0.0002;

export function useSavedAddresses() {
  const account = useAccount();
  const [list, setList] = useState<SavedAddress[]>(read);
  // Connectée : les adresses du compte rejoignent celles du téléphone
  const fromAccount = account.user?.addresses;
  useEffect(() => {
    if (!fromAccount) return;
    setList(local => {
      const merged = [...fromAccount, ...local.filter(l => !fromAccount.some(a => a.id === l.id || near(a, l)))].slice(
        0,
        MAX,
      );
      write(merged);
      return merged;
    });
  }, [JSON.stringify(fromAccount ?? null)]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = useCallback(
    (next: SavedAddress[]) => {
      write(next);
      setList(next);
      if (account.user) account.saveProfile({ addresses: next });
    },
    [account],
  );

  /** Enregistre (ou remplace l'adresse du même nom). */
  const save = useCallback(
    (loc: DeliveryLocation, name: string, icon: string) => {
      const others = read().filter(a => a.name.toLowerCase() !== name.toLowerCase() && !near(a, loc));
      const item: SavedAddress = { ...loc, id: Math.random().toString(36).slice(2, 10), name, icon };
      commit([item, ...others].slice(0, MAX));
      return item;
    },
    [commit],
  );

  const remove = useCallback((id: string) => commit(read().filter(a => a.id !== id)), [commit]);

  return { addresses: list, save, remove };
}
