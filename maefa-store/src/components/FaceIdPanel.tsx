import React, { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2, ScanFace, Trash2 } from 'lucide-react';
import { readToken, useAccount } from '../context/AccountContext';
import { deleteMyPasskey, fetchMyPasskeys, passkeyRegisterOptions, type PasskeyDevice } from '../services/api';
import { biometricAvailable, biometricLabel, usePrefetchedChallenge } from '../utils/passkey';

/** Défi d'activation préparé à l'avance (voir usePrefetchedChallenge) */
const loadRegisterChallenge = async () => {
  const token = readToken();
  return token ? passkeyRegisterOptions(token) : { ok: false as const, error: 'Non connectée' };
};

const day = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/** Le téléphone sait-il utiliser Face ID / l'empreinte ? (null pendant la vérification) */
export function useBiometric() {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    biometricAvailable().then(ok => alive && setAvailable(ok));
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

export const BiometricIcon: React.FC<{ className?: string }> = ({ className }) =>
  biometricLabel() === 'Face ID' ? (
    <ScanFace className={className} strokeWidth={1.5} />
  ) : (
    <Fingerprint className={className} strokeWidth={1.5} />
  );

/**
 * Espace cliente : activer Face ID / l'empreinte sur ce téléphone, voir et retirer ses appareils.
 * Le visage et l'empreinte restent dans le téléphone : Maefa ne les reçoit jamais.
 */
export const FaceIdPanel: React.FC = () => {
  const { user, enablePasskey, setAccount } = useAccount();
  const available = useBiometric();
  const takeChallenge = usePrefetchedChallenge(available ? loadRegisterChallenge : null);
  const [devices, setDevices] = useState<PasskeyDevice[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const label = biometricLabel();

  const load = useCallback(async () => {
    const token = readToken();
    if (!token) return;
    const r = await fetchMyPasskeys(token);
    setDevices(r.ok ? r.data.passkeys : []);
  }, []);
  useEffect(() => {
    load();
  }, [load, user?.passkeys]);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    const r = await enablePasskey(takeChallenge());
    setBusy(false);
    setMessage(r.ok ? `C'est activé : la prochaine fois, connectez-vous avec ${label}.` : (r.error ?? ''));
  };
  const remove = async (d: PasskeyDevice) => {
    const token = readToken();
    if (!token || !window.confirm(`Retirer « ${d.name} » ? Il faudra de nouveau votre code pour vous connecter.`))
      return;
    const r = await deleteMyPasskey(token, d.id);
    if (r.ok) setAccount(r.data.user);
  };

  if (available === false && !devices?.length) return null;
  return (
    <section className="bg-white rounded-[2rem] border border-ink/[0.06] p-5 sm:p-7" data-testid="faceid-panel">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-full bg-blush/60 grid place-items-center text-gold-dark shrink-0">
          <BiometricIcon className="w-6 h-6" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl">Connexion avec {label}</h2>
          <p className="text-sm text-ink/70 mt-1.5">
            Plus besoin de code : votre téléphone vous reconnaît. Votre visage et votre empreinte restent dans votre
            téléphone, Maefa ne les reçoit jamais.
          </p>
        </div>
      </div>
      {!!devices?.length && (
        <ul className="mt-4 divide-y divide-ink/[0.06]" data-testid="faceid-devices">
          {devices.map(d => (
            <li key={d.id} className="py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{d.name}</p>
                <p className="text-xs text-ink/60">
                  Activé le {day(d.createdAt)}
                  {d.lastUsedAt && ` · dernière connexion le ${day(d.lastUsedAt)}`}
                </p>
              </div>
              <button
                onClick={() => remove(d)}
                aria-label={`Retirer ${d.name}`}
                className="w-10 h-10 rounded-full border border-ink/10 grid place-items-center text-ink/60 hover:text-wine hover:border-wine/30"
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
          data-testid="faceid-enable"
          className="btn-dark mt-4 w-full sm:w-auto !h-12 !px-6 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BiometricIcon className="w-4 h-4" />}
          {devices?.length ? 'Activer aussi sur ce téléphone' : `Activer ${label}`}
        </button>
      )}
      {message && (
        <p className="text-sm mt-3 text-ink/80" role="status" data-testid="faceid-message">
          {message}
        </p>
      )}
    </section>
  );
};

/**
 * Après une connexion par code : proposition, une fois, d'activer Face ID / l'empreinte sur ce téléphone.
 */
export const FaceIdPrompt: React.FC = () => {
  const { user, enablePasskey } = useAccount();
  const available = useBiometric();
  const wanted = !!available && !!user && !(user.passkeys ?? 0);
  const takeChallenge = usePrefetchedChallenge(wanted ? loadRegisterChallenge : null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('maefa_faceid_prompt') === 'non';
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!available || hidden || !user || (user.passkeys ?? 0) > 0) return null;
  const label = biometricLabel();
  const dismiss = () => {
    try {
      localStorage.setItem('maefa_faceid_prompt', 'non');
    } catch {
      /* ignore */
    }
    setHidden(true);
  };
  return (
    <section
      className="rounded-[2rem] bg-blush/40 border border-gold/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
      data-testid="faceid-prompt"
    >
      <span className="w-12 h-12 rounded-full bg-white grid place-items-center text-gold-dark shrink-0">
        <BiometricIcon className="w-6 h-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">La prochaine fois, connectez-vous avec {label}</p>
        <p className="text-sm text-ink/70 mt-0.5">Un regard ou un doigt, sans code à retenir.</p>
        {error && (
          <p className="text-sm text-wine mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={dismiss} className="btn-outline !h-11 !px-5">
          Plus tard
        </button>
        <button
          disabled={busy}
          data-testid="faceid-prompt-enable"
          onClick={async () => {
            setBusy(true);
            setError('');
            const r = await enablePasskey(takeChallenge());
            setBusy(false);
            if (!r.ok) setError(r.error ?? '');
          }}
          className="btn-dark !h-11 !px-5 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BiometricIcon className="w-4 h-4" />} Activer
        </button>
      </div>
    </section>
  );
};
