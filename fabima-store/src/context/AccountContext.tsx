import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Order } from '../data/types';
import { authLogout, authStart, authVerify, fetchMe, getServerStatus, saveMyOrder, updateMe, type Account } from '../services/api';
import { useStore } from './StoreContext';

const TOKEN_KEY = 'fabima_token';
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const writeToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

interface AccountContextValue {
  /** 'off' : comptes indisponibles (serveur absent) */
  status: 'loading' | 'guest' | 'user' | 'off';
  user: Account | null;
  /** Commandes rattachées au compte (tous téléphones confondus) */
  remoteOrders: Order[];
  startLogin: (phone: string) => ReturnType<typeof authStart>;
  verifyCode: (phone: string, code: string) => Promise<{ ok: boolean; error?: string; isNew?: boolean }>;
  saveProfile: (patch: Partial<Omit<Account, 'phone' | 'createdAt'>>) => Promise<boolean>;
  recordOrder: (order: Order) => void;
  logout: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { wishlist, mergeWishlist, savedCustomer, saveCustomer } = useStore();
  const [token, setToken] = useState<string | null>(readToken);
  const [status, setStatus] = useState<AccountContextValue['status']>('loading');
  const [user, setUser] = useState<Account | null>(null);
  const [remoteOrders, setRemoteOrders] = useState<Order[]>([]);
  const synced = useRef(false);

  /** Après connexion : fusion des favoris et des coordonnées de ce téléphone avec le compte. */
  const adopt = useCallback((u: Account, orders: Order[]) => {
    setUser(u);
    setRemoteOrders(orders);
    setStatus('user');
    mergeWishlist(u.wishlist);
    if (!savedCustomer && u.firstName) {
      saveCustomer({ firstName: u.firstName, lastName: u.lastName, phone: u.phone.replace(/^\+221/, ''), zone: u.zone, address: u.address, location: u.location ?? undefined });
    }
    synced.current = true;
  }, [mergeWishlist, savedCustomer, saveCustomer]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const server = await getServerStatus();
      if (!alive) return;
      if (!server.accounts) { setStatus('off'); return; }
      if (!token) { setStatus('guest'); return; }
      const r = await fetchMe(token);
      if (!alive) return;
      if (r.ok) adopt(r.data.user, r.data.orders);
      else if (r.status === 401) { writeToken(null); setToken(null); setStatus('guest'); }
      else setStatus('guest');
    })();
    return () => { alive = false; };
  }, [token]); // « adopt » volontairement absent : il ne doit pas relancer la session

  // Favoris : envoyés au compte quand ils changent (après la première synchronisation)
  useEffect(() => {
    if (status !== 'user' || !token || !synced.current) return;
    const t = setTimeout(() => updateMe(token, { wishlist }), 800);
    return () => clearTimeout(t);
  }, [wishlist, status, token]);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    const r = await authVerify(phone, code);
    if (!r.ok) return { ok: false, error: r.error };
    writeToken(r.data.token);
    setToken(r.data.token);
    const me = await fetchMe(r.data.token);
    adopt(r.data.user, me.ok ? me.data.orders : []);
    return { ok: true, isNew: !r.data.user.firstName };
  }, [adopt]);

  const saveProfile = useCallback(async (patch: Partial<Omit<Account, 'phone' | 'createdAt'>>) => {
    if (!token) return false;
    const r = await updateMe(token, patch);
    if (r.ok) setUser(r.data.user);
    return r.ok;
  }, [token]);

  const recordOrder = useCallback((order: Order) => {
    if (!token || status !== 'user') return;
    saveMyOrder(token, order).then(r => { if (r.ok) setRemoteOrders(list => [order, ...list.filter(o => o.id !== order.id)]); });
  }, [token, status]);

  const logout = useCallback(() => {
    if (token) authLogout(token);
    writeToken(null);
    setToken(null);
    setUser(null);
    setRemoteOrders([]);
    synced.current = false;
    setStatus('guest');
  }, [token]);

  const value = useMemo<AccountContextValue>(() => ({
    status, user, remoteOrders, startLogin: authStart, verifyCode, saveProfile, recordOrder, logout,
  }), [status, user, remoteOrders, verifyCode, saveProfile, recordOrder, logout]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount doit être utilisé dans <AccountProvider>');
  return ctx;
}
