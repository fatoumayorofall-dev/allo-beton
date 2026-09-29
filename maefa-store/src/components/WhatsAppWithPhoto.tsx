import React, { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';
import { useStore } from '../context/StoreContext';

const MAX_VIDEO_BYTES = 15 * 1024 * 1024; // WhatsApp refuse les vidéos trop lourdes

/** Le téléphone sait-il partager des fichiers (photo, vidéo) vers une autre appli ? */
function canShareFiles() {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare
      && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/jpeg' })], 'test.jpg', { type: 'image/jpeg' })] });
  } catch {
    return false;
  }
}

async function toFile(url: string, name: string, maxBytes = Infinity): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size || blob.size > maxBytes) return null;
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0];
    return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'article';

/**
 * « Envoyer avec la photo » : sur téléphone, la photo de l'article (et sa vidéo s'il y en a une)
 * part dans WhatsApp avec le message déjà écrit. La cliente choisit la discussion Maefa Store.
 * Invisible sur ordinateur (le partage de fichiers n'y est pas possible).
 */
export const WhatsAppWithPhoto: React.FC<{ message: string; image?: string; video?: string; name: string; className?: string }> = ({ message, image, video, name, className = '' }) => {
  const { notify } = useStore();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setSupported(canShareFiles()); }, []);
  if (!supported || !image) return null;

  const send = async () => {
    setBusy(true);
    const base = slug(name);
    const [photo, clip] = await Promise.all([toFile(image, base), video ? toFile(video, `${base}-video`, MAX_VIDEO_BYTES) : Promise.resolve(null)]);
    setBusy(false);
    const files = [photo, clip].filter((f): f is File => !!f);
    const text = `${message}\n\n(À envoyer à Maefa Store : ${SITE_CONFIG.phone})`;
    try {
      if (files.length && navigator.canShare({ files })) await navigator.share({ files, text });
      else await navigator.share({ text });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') notify('Partage impossible : utilisez le bouton WhatsApp ci-dessus', 'error');
    }
  };

  return (
    <div className={className} data-testid="wa-with-photo">
      <button type="button" onClick={send} disabled={busy}
        className="w-full h-11 rounded-full flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold text-[#177a41] hover:bg-[#177a41]/[0.06] transition-colors">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" strokeWidth={1.6} />} Envoyer avec la photo{video ? ' et la vidéo' : ''}
      </button>
      <p className="text-[11px] text-center text-ink/65 -mt-0.5">Dans WhatsApp, choisissez la discussion <strong>Maefa Store</strong> ({SITE_CONFIG.phone})</p>
    </div>
  );
};

export default WhatsAppWithPhoto;
