import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Order } from '../data/types';
import {
  authLogout,
  authPin,
  authStart,
  authVerify,
  changeMyPin,
  fetchMe,
  getServerStatus,
  saveMyOrder,
  exportMyData,
  deleteMyAccount,
  updateMe,
  passkeyLogin,
  passkeyLoginOptions,
  passkeyRegister,
  passkeyRegisterOptions,
  type Account,
  type PasskeyChallenge,
} from '../services/api';
import { createPasskey, signWithPasskey } from '../utils/passkey';
import { useStore } from './StoreContext';

const TOKEN_KEY = 'maefa_token';
export const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

interface AccountContextValue {
  /** 'off' : comptes indisponibles (serveur absent) */
  status: 'loading' | 'guest' | 'user' | 'off';
  user: Account | null;
  /** Commandes rattachées au compte (tous téléphones confondus) */
  remoteOrders: Order[];
  startLogin: (phone: string) => ReturnType<typeof authStart>;
  verifyCode: (phone: string, code: string) => Promise<{ ok: boolean; error?: string; isNew?: boolean }>;
  /** Connexion par code secret à 4 chiffres (créé à la première visite) */
  loginWithPin: (phone: string, pin: string) => Promise<{ ok: boolean; error?: string; isNew?: boolean }>;
  /** Connexion par Face ID / empreinte (le numéro est facultatif) */
  loginWithPasskey: (ready?: PasskeyChallenge | null) => Promise<{ ok: boolean; error?: string }>;
  /** Active Face ID / l'empreinte sur ce téléphone pour les prochaines connexions */
  enablePasskey: (ready?: PasskeyChallenge | null) => Promise<{ ok: boolean; error?: string }>;
  /** Met à jour le compte affiché (après une modification faite ailleurs) */
  setAccount: (u: Account) => void;
  saveProfile: (patch: Partial<Omit<Account, 'phone' | 'createdAt'>>) => Promise<boolean>;
  changePin: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  recordOrder: (order: Order) => void;
  logout: () => void;
  /** Droit d'accès : télécharge le fichier de ses données */
  exportData: () => Promise<{ ok: boolean; error?: string }>;
  /** Droit à l'effacement : supprime le compte puis déconnecte */
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
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
  const adopt = useCallback(
    (u: Account, orders: Order[]) => {
      setUser(u);
      setRemoteOrders(orders);
      setStatus('user');
      mergeWishlist(u.wishlist);
      if (!savedCustomer && u.firstName) {
        saveCustomer({
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone.replace(/^\+221/, ''),
          zone: u.zone,
          address: u.address,
          location: u.location ?? undefined,
        });
      }
      synced.current = true;
    },
    [mergeWishlist, savedCustomer, saveCustomer],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const server = await getServerStatus();
      if (!alive) return;
      if (!server.accounts) {
        setStatus('off');
        return;
      }
      if (!token) {
        setStatus('guest');
        return;
      }
      const r = await fetchMe(token);
      if (!alive) return;
      if (r.ok) adopt(r.data.user, r.data.orders);
      else if (r.status === 401) {
        writeToken(null);
        setToken(null);
        setStatus('guest');
      } else setStatus('guest');
    })();
    return () => {
      alive = false;
    };
  }, [token]); // « adopt » volontairement absent : il ne doit pas relancer la session

  // Favoris : envoyés au compte quand ils changent (après la première synchronisation)
  useEffect(() => {
    if (status !== 'user' || !token || !synced.current) return;
    const t = setTimeout(() => updateMe(token, { wishlist }), 800);
    return () => clearTimeout(t);
  }, [wishlist, status, token]);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      const r = await authVerify(phone, code);
      if (!r.ok) return { ok: false, error: r.error };
      writeToken(r.data.token);
      setToken(r.data.token);
      const me = await fetchMe(r.data.token);
      adopt(r.data.user, me.ok ? me.data.orders : []);
      return { ok: true, isNew: !r.data.user.firstName };
    },
    [adopt],
  );

  const loginWithPin = useCallback(
    async (phone: string, pin: string) => {
      const r = await authPin(phone, pin);
      if (!r.ok) return { ok: false, error: r.error };
      writeToken(r.data.token);
      setToken(r.data.token);
      const me = await fetchMe(r.data.token);
      adopt(r.data.user, me.ok ? me.data.orders : []);
      return { ok: true, isNew: !r.data.user.firstName };
    },
    [adopt],
  );

  const loginWithPasskey = useCallback(
    async (ready?: PasskeyChallenge | null) => {
      let challenge = ready;
      if (!challenge) {
        const o = await passkeyLoginOptions();
        if (!o.ok) return { ok: false, error: o.error };
        challenge = o.data;
      }
      const signed = await signWithPasskey(challenge.options);
      if (!signed.ok) return { ok: false, error: signed.error };
      const r = await passkeyLogin(challenge.challengeId, signed.response);
      if (!r.ok) return { ok: false, error: r.error };
      writeToken(r.data.token);
      setToken(r.data.token);
      const me = await fetchMe(r.data.token);
      adopt(r.data.user, me.ok ? me.data.orders : []);
      return { ok: true };
    },
    [adopt],
  );

  const enablePasskey = useCallback(
    async (ready?: PasskeyChallenge | null) => {
      if (!token) return { ok: false, error: 'Non connectée' };
      let challenge = ready;
      if (!challenge) {
        const o = await passkeyRegisterOptions(token);
        if (!o.ok) return { ok: false, error: o.error };
        challenge = o.data;
      }
      const created = await createPasskey(challenge.options);
      if (!created.ok) return { ok: false, error: created.error };
      const r = await passkeyRegister(token, challenge.challengeId, created.response);
      if (!r.ok) return { ok: false, error: r.error };
      setUser(r.data.user);
      try {
        localStorage.setItem('maefa_passkey_here', '1');
      } catch {
        /* ignore */
      }
      return { ok: true };
    },
    [token],
  );

  const saveProfile = useCallback(
    async (patch: Partial<Omit<Account, 'phone' | 'createdAt'>>) => {
      if (!token) return false;
      const r = await updateMe(token, patch);
      if (r.ok) setUser(r.data.user);
      return r.ok;
    },
    [token],
  );

  const changePin = useCallback(
    async (current: string, next: string) => {
      if (!token) return { ok: false, error: 'Non connectée' };
      const r = await changeMyPin(token, current, next);
      if (!r.ok) return { ok: false, error: r.error };
      setUser(u => (u ? { ...u, hasPin: true } : u));
      return { ok: true };
    },
    [token],
  );

  const recordOrder = useCallback(
    (order: Order) => {
      if (!token || status !== 'user') return;
      saveMyOrder(token, order).then(r => {
        if (r.ok) setRemoteOrders(list => [order, ...list.filter(o => o.id !== order.id)]);
      });
    },
    [token, status],
  );

  const logout = useCallback(() => {
    if (token) authLogout(token);
    writeToken(null);
    setToken(null);
    setUser(null);
    setRemoteOrders([]);
    synced.current = false;
    setStatus('guest');
  }, [token]);

  const exportData = useCallback(async () => {
    if (!token) return { ok: false, error: 'Non connectée' };
    const r = await exportMyData(token);
    if (!r.ok) return { ok: false, error: r.error };
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'mes-donnees-maefa.json' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { ok: true };
  }, [token]);

  const deleteAccount = useCallback(async () => {
    if (!token) return { ok: false, error: 'Non connectée' };
    const r = await deleteMyAccount(token);
    if (!r.ok) return { ok: false, error: r.error };
    logout();
    return { ok: true };
  }, [token, logout]);

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      user,
      remoteOrders,
      startLogin: authStart,
      verifyCode,
      loginWithPin,
      loginWithPasskey,
      enablePasskey,
      setAccount: setUser,
      saveProfile,
      changePin,
      recordOrder,
      logout,
      exportData,
      deleteAccount,
    }),
    [
      status,
      user,
      remoteOrders,
      verifyCode,
      loginWithPin,
      loginWithPasskey,
      enablePasskey,
      saveProfile,
      changePin,
      recordOrder,
      logout,
      exportData,
      deleteAccount,
    ],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount doit être utilisé dans <AccountProvider>');
  return ctx;
}
