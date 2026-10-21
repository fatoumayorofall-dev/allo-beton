import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Link2, Share2 } from 'lucide-react';
import type { MySeller } from './api';
import { mpPath } from './config';
import { ACCENTS, shopLink } from './format';

/**
 * « Ma boutique en ligne » : le lien court à mettre dans sa bio Instagram, son statut WhatsApp, ses flyers,
 * et le QR code à imprimer (le client le scanne et arrive directement dans la boutique).
 */
export const ShopLinkPanel: React.FC<{ seller: MySeller }> = ({ seller }) => {
  const link = shopLink(seller.slug);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const color = ACCENTS[seller.accent]?.hex ?? ACCENTS.prune.hex;
  useEffect(() => {
    let alive = true;
    import('qrcode').then(QR =>
      QR.toDataURL(link, { width: 480, margin: 1, color: { dark: color, light: '#ffffff' } }).then(
        url => alive && setQr(url),
      ),
    );
    return () => {
      alive = false;
    };
  }, [link, color]);
  return (
    <section
      className="bg-white rounded-3xl border border-ink/[0.06] p-5 flex flex-col sm:flex-row gap-5"
      data-testid="mp-shop-link"
    >
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-2xl">Ma boutique en ligne</h2>
        <p className="text-sm text-ink/70 mt-1">
          C'est votre site : partagez ce lien sur WhatsApp, Instagram, TikTok ou vos flyers. Vos clients voient
          seulement votre boutique et commandent directement.
        </p>
        <p className="mt-3 font-semibold break-all" data-testid="mp-shop-link-url">
          {link.replace(/^https?:\/\//, '')}
        </p>
        {seller.status !== 'active' && (
          <p className="mt-1 text-xs text-amber-900">Le lien marchera dès que votre boutique sera validée.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(link).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="h-10 px-4 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}{' '}
            {copied ? 'Copié' : 'Copier le lien'}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Découvrez ma boutique en ligne « ${seller.shopName} » : ${link}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-full text-white font-semibold text-sm inline-flex items-center gap-2"
            style={{ background: color }}
          >
            <Share2 className="w-4 h-4" /> Partager sur WhatsApp
          </a>
          {seller.status === 'active' && (
            <Link
              to={mpPath(`/boutique/${seller.slug}`)}
              className="h-10 px-4 rounded-full border border-ink/15 font-semibold text-sm inline-flex items-center"
            >
              Voir ma vitrine
            </Link>
          )}
        </div>
      </div>
      {qr && (
        <div className="text-center shrink-0">
          <img
            src={qr}
            alt={`QR code de la boutique ${seller.shopName}`}
            className="w-36 h-36 mx-auto"
            data-testid="mp-shop-qr"
          />
          <a
            href={qr}
            download={`${seller.slug}-qr.png`}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline"
          >
            <Download className="w-3.5 h-3.5" /> Télécharger le QR code
          </a>
        </div>
      )}
    </section>
  );
};
