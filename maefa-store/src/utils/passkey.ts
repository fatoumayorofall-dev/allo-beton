/**
 * Face ID / empreinte (passkeys, norme WebAuthn) côté navigateur.
 * Le téléphone vérifie le visage ou le doigt lui-même ; le site ne reçoit qu'une signature.
 */
import { useCallback, useEffect, useRef } from 'react';
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  WebAuthnError,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import type { PasskeyChallenge } from '../services/api';

/** Le téléphone sait-il déverrouiller avec le visage ou le doigt ? */
export async function biometricAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** Nom à afficher selon le téléphone : « Face ID » sur iPhone, « empreinte » ailleurs. */
export function biometricLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Face ID';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'votre empreinte ou votre visage';
}

/** Message clair quand la personne annule ou que le téléphone refuse. */
function explain(e: unknown): string {
  const name = e instanceof WebAuthnError ? e.code : (e as Error)?.name;
  if (name === 'ERROR_CEREMONY_ABORTED' || (e as Error)?.name === 'NotAllowedError') return 'Vérification annulée.';
  if (name === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || (e as Error)?.name === 'InvalidStateError')
    return 'Déjà activé sur ce téléphone.';
  return 'Vérification impossible sur ce téléphone.';
}

export async function createPasskey(
  options: Record<string, unknown>,
): Promise<{ ok: true; response: unknown } | { ok: false; error: string }> {
  try {
    const response = await startRegistration({
      optionsJSON: options as unknown as PublicKeyCredentialCreationOptionsJSON,
    });
    return { ok: true, response };
  } catch (e) {
    return { ok: false, error: explain(e) };
  }
}

export async function signWithPasskey(
  options: Record<string, unknown>,
): Promise<{ ok: true; response: unknown } | { ok: false; error: string }> {
  try {
    const response = await startAuthentication({
      optionsJSON: options as unknown as PublicKeyCredentialRequestOptionsJSON,
    });
    return { ok: true, response };
  } catch (e) {
    return { ok: false, error: explain(e) };
  }
}

type Loaded = { ok: true; data: PasskeyChallenge } | { ok: false; error: string };

/**
 * Défi préparé à l'avance : sur iPhone, Safari n'ouvre Face ID que juste après l'appui sur le bouton.
 * Si l'on attendait le serveur à ce moment-là (lent au réveil sur Render), Face ID serait refusé.
 * Le défi est donc demandé dès l'affichage, renouvelé toutes les 4 minutes, et remplacé après usage.
 * `take()` renvoie le défi prêt (ou null : il faudra le demander au moment de l'appui).
 */
export function usePrefetchedChallenge(load: (() => Promise<Loaded>) | null) {
  const ready = useRef<{ data: PasskeyChallenge; at: number } | null>(null);
  const refresh = useCallback(async () => {
    if (!load) return;
    const r = await load();
    ready.current = r.ok ? { data: r.data, at: Date.now() } : null;
  }, [load]);
  useEffect(() => {
    ready.current = null;
    refresh();
    const t = window.setInterval(refresh, 4 * 60e3);
    return () => clearInterval(t);
  }, [refresh]);
  return useCallback(() => {
    const v = ready.current;
    ready.current = null;
    refresh();
    return v && Date.now() - v.at < 4.5 * 60e3 ? v.data : null;
  }, [refresh]);
}
