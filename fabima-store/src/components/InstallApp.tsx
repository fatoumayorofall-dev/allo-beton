import React, { useEffect, useState } from 'react';
import { Check, MoreVertical, Plus, Share, Smartphone, Volume2, X } from 'lucide-react';
import { useInstall } from '../utils/pwa';
import { speak } from '../utils/speak';
import { useEscape, useLockBody } from '../utils/hooks';

const IOS_STEPS = [
  { icon: <Share className="w-8 h-8 text-[#0a84ff]" />, text: 'Touchez le bouton Partager en bas de Safari' },
  { icon: <span className="w-10 h-10 rounded-xl border-2 border-ink/70 grid place-items-center"><Plus className="w-6 h-6" /></span>, text: 'Touchez « Sur l\'écran d\'accueil »' },
  { icon: <span className="px-2 h-8 rounded-lg bg-[#0a84ff] text-white text-xs font-bold grid place-items-center">Ajouter</span>, text: 'Touchez « Ajouter » en haut à droite' },
];
const ANDROID_STEPS = [
  { icon: <MoreVertical className="w-8 h-8" />, text: 'Touchez les 3 points en haut à droite de Chrome' },
  { icon: <Smartphone className="w-8 h-8" />, text: 'Touchez « Installer l\'application » ou « Ajouter à l\'écran d\'accueil »' },
  { icon: <span className="px-2 h-8 rounded-lg bg-[#1a73e8] text-white text-xs font-bold grid place-items-center">Installer</span>, text: 'Confirmez en touchant « Installer »' },
];

/** Fenêtre d'aide : les gestes à faire, en images, avec lecture à voix haute. */
const InstallGuide: React.FC<{ ios: boolean; onClose: () => void }> = ({ ios, onClose }) => {
  useLockBody(true);
  useEscape(true, onClose);
  const steps = ios ? IOS_STEPS : ANDROID_STEPS;
  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/60 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-label="Installer Fabima" className="relative w-full max-w-md bg-ivory rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 animate-fade-up">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white grid place-items-center shadow-sm"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-4 pr-12">
          <img src="/icons/icon-192.png" alt="" className="w-16 h-16 rounded-2xl shadow-soft shrink-0" />
          <div>
            <p className="font-display text-2xl leading-tight">Fabima sur votre téléphone</p>
            <p className="text-sm text-ink/60">3 gestes, c'est gratuit</p>
          </div>
        </div>
        <button onClick={() => speak(steps.map((s, i) => `Étape ${i + 1} : ${s.text}.`).join(' '))}
          className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full bg-blush/60 text-sm"><Volume2 className="w-4 h-4 text-wine" /> Écouter les explications</button>
        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={s.text} className="flex items-center gap-4 p-4 rounded-2xl bg-white">
              <span className="w-9 h-9 rounded-full bg-ink text-ivory font-bold grid place-items-center shrink-0">{i + 1}</span>
              <span className="w-16 grid place-items-center shrink-0">{s.icon}</span>
              <span className="text-[15px] leading-snug">{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-center text-ink/60">Ensuite, touchez l'icône <strong className="font-script text-xl text-ink">F</strong> Fabima sur votre écran pour ouvrir la boutique.</p>
      </div>
    </div>
  );
};

/** Bouton « Mettre Fabima sur mon téléphone » : installation directe (Android) ou guide en images (iPhone). */
export const InstallButton: React.FC<{ className?: string; big?: boolean }> = ({ className = '', big }) => {
  const { installed, canPrompt, platform, promptInstall } = useInstall();
  const [guide, setGuide] = useState(false);
  if (installed) {
    return <p className={`inline-flex items-center gap-2 text-sm text-emerald-800 ${className}`}><Check className="w-4 h-4" /> Fabima est installée sur ce téléphone</p>;
  }
  const onClick = async () => {
    if (canPrompt && await promptInstall()) return;
    setGuide(true);
  };
  return (
    <>
      <button onClick={onClick}
        className={big
          ? `w-full flex items-center gap-4 p-4 rounded-[1.75rem] bg-ink text-ivory text-left active:scale-[.98] transition-transform ${className}`
          : `inline-flex items-center gap-2 px-5 h-11 rounded-full bg-ink text-ivory text-sm font-semibold ${className}`}>
        {big && <img src="/icons/icon-192.png" alt="" className="w-14 h-14 rounded-2xl" />}
        <span className={big ? 'flex-1' : ''}>
          {big ? <><strong className="block text-lg">Mettre Fabima sur mon téléphone</strong><span className="text-sm text-ivory/70">Une icône sur l'écran, comme une application</span></> : <><Smartphone className="w-4 h-4 inline -mt-0.5 mr-1" />Installer l'application</>}
        </span>
      </button>
      {guide && <InstallGuide ios={platform === 'ios'} onClose={() => setGuide(false)} />}
    </>
  );
};

const BANNER_KEY = 'fabima_install_banner';

/** Bandeau discret sur mobile, proposé une fois par visite après quelques secondes. */
export const InstallBanner: React.FC = () => {
  const { installed, installedBefore, platform, canPrompt } = useInstall();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (installed || installedBefore || platform === 'desktop') return;
    let dismissed = false;
    try { dismissed = Date.now() - Number(localStorage.getItem(BANNER_KEY) || 0) < 7 * 864e5; } catch { /* ignore */ }
    if (dismissed) return;
    const t = setTimeout(() => setShow(true), 12000);
    return () => clearTimeout(t);
  }, [installed, installedBefore, platform, canPrompt]);
  const visible = show && !installed && !installedBefore;
  useEffect(() => {
    document.body.toggleAttribute('data-install-banner', visible);
    return () => document.body.removeAttribute('data-install-banner');
  }, [visible]);
  if (!visible) return null;
  const dismiss = () => { setShow(false); try { localStorage.setItem(BANNER_KEY, String(Date.now())); } catch { /* ignore */ } };
  return (
    <div className="fixed left-3 right-3 bottom-3 z-[60] animate-fade-up print:hidden">
      <div className="relative bg-white rounded-[1.75rem] shadow-luxe border border-ink/[0.06] p-3 pr-12">
        <button onClick={dismiss} aria-label="Plus tard" className="absolute top-2 right-2 w-9 h-9 rounded-full grid place-items-center text-ink/50"><X className="w-4 h-4" /></button>
        <InstallButton big className="!bg-transparent !text-ink !p-1 [&_span_.text-sm]:!text-ink/60" />
      </div>
    </div>
  );
};
