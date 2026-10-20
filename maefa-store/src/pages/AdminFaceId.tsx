import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { BiometricIcon, useBiometric } from '../components/FaceIdPanel';
import {
  adminPasskeyLogin,
  adminPasskeyLoginOptions,
  adminPasskeyRegister,
  adminPasskeyRegisterOptions,
  adminPasskeyStatus,
  deleteAdminPasskey,
  fetchAdminPasskeys,
  type PasskeyDevice,
} from '../services/api';
import { biometricLabel, createPasskey, signWithPasskey, usePrefetchedChallenge } from '../utils/passkey';

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** Écran de connexion gérante : bouton « Entrer avec Face ID » quand un appareil est activé. */
export const AdminFaceIdLogin: React.FC<{ onToken: (token: string) => void }> = ({ onToken }) => {
  const available = useBiometric();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    adminPasskeyStatus().then(r => r.ok && setEnabled(r.data.enabled));
  }, []);
  const takeChallenge = usePrefetchedChallenge(available && enabled ? adminPasskeyLoginOptions : null);
  if (!available || !enabled) return null;
  const go = async () => {
    setBusy(true);
    setError('');
    const ready = takeChallenge();
    const o = ready ? { ok: true as const, data: ready } : await adminPasskeyLoginOptions();
    const signed = o.ok ? await signWithPasskey(o.data.options) : null;
    const r = o.ok && signed?.ok ? await adminPasskeyLogin(o.data.challengeId, signed.response) : null;
    setBusy(false);
    if (r?.ok) return onToken(r.data.token);
    setError(!o.ok ? o.error : signed && !signed.ok ? signed.error : r && !r.ok ? r.error : '');
  };
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        data-testid="admin-passkey-login"
        className="btn-outline w-full !h-14 inline-flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BiometricIcon className="w-5 h-5" />} Entrer avec{' '}
        {biometricLabel()}
      </button>
      {error && (
        <p className="text-xs text-wine mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

/** Tableau de bord : activer Face ID pour l'espace gérant sur ce téléphone, voir et retirer les appareils. */
export const AdminFaceIdCard: React.FC<{ pin: string }> = ({ pin }) => {
  const available = useBiometric();
  const [devices, setDevices] = useState<PasskeyDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const label = biometricLabel();
  const load = useCallback(() => fetchAdminPasskeys(pin).then(r => setDevices(r.ok ? r.data.passkeys : [])), [pin]);
  useEffect(() => {
    load();
  }, [load]);
  const loadChallenge = useCallback(() => adminPasskeyRegisterOptions(pin), [pin]);
  const takeChallenge = usePrefetchedChallenge(available ? loadChallenge : null);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    const ready = takeChallenge();
    const o = ready ? { ok: true as const, data: ready } : await adminPasskeyRegisterOptions(pin);
    const created = o.ok ? await createPasskey(o.data.options) : null;
    const r = o.ok && created?.ok ? await adminPasskeyRegister(pin, o.data.challengeId, created.response) : null;
    setBusy(false);
    if (r?.ok) {
      setMessage(`Activé : la prochaine fois, entrez avec ${label}.`);
      return load();
    }
    setMessage(!o.ok ? o.error : created && !created.ok ? created.error : r && !r.ok ? r.error : '');
  };
  const remove = async (d: PasskeyDevice) => {
    if (!window.confirm(`Retirer « ${d.name} » de l'espace gérant ?`)) return;
    const r = await deleteAdminPasskey(pin, d.id);
    if (r.ok) load();
  };

  if (available === false && !devices?.length) return null;
  return (
    <section className="mt-6 bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-6" data-testid="admin-faceid">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-full bg-blush/60 grid place-items-center text-gold-dark shrink-0">
          <BiometricIcon className="w-5 h-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl">Entrer avec {label}</h2>
          <p className="text-sm text-ink/70 mt-1">
            Sur votre téléphone, plus besoin de taper le code : votre visage ou votre doigt suffit. Si vous changez le
            code PIN sur Render, tous les appareils sont retirés automatiquement.
          </p>
        </div>
      </div>
      {!!devices?.length && (
        <ul className="mt-4 divide-y divide-ink/[0.06]" data-testid="admin-faceid-devices">
          {devices.map(d => (
            <li key={d.id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{d.name}</p>
                <p className="text-xs text-ink/60">
                  Activé le {day(d.createdAt)}
                  {d.lastUsedAt && ` · utilisé le ${day(d.lastUsedAt)}`}
                </p>
              </div>
              <button
                onClick={() => remove(d)}
                aria-label={`Retirer ${d.name}`}
                className="w-9 h-9 rounded-full border border-ink/10 grid place-items-center text-ink/60 hover:text-wine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {available && (
        <button
          onClick={enable}
          disabled={busy}
          data-testid="admin-faceid-enable"
          className="btn-dark mt-4 !h-11 !px-5 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BiometricIcon className="w-4 h-4" />}
          {devices?.length ? 'Activer aussi sur ce téléphone' : `Activer ${label}`}
        </button>
      )}
      {message && (
        <p className="text-sm mt-3" role="status" data-testid="admin-faceid-message">
          {message}
        </p>
      )}
    </section>
  );
};
