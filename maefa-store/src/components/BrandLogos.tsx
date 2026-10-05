import React from 'react';
import { SITE_CONFIG, buildWhatsAppLink } from '../config/site';

/*
 * Logos officiels des marques (moyens de paiement et réseaux sociaux), en SVG intégré :
 * nets à toutes les tailles, sans appel à un site extérieur.
 * Sources : collection libre Iconify « logos » et Simple Icons (tracés des marques).
 * Les marques restent la propriété de leurs détenteurs ; utilisées ici pour indiquer
 * les moyens de paiement acceptés et les comptes de la boutique.
 */
type P = { className?: string; title?: string };
const svg =
  (vb: string, body: string) =>
  ({ className = 'h-6 w-auto', title }: P) => (
    <svg
      viewBox={vb}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
export const VisaLogo = svg(
  '0 0 256 83',
  '<defs><linearGradient id="fb-visa-SVGSdd43daQ" x1="45.974%" x2="54.877%" y1="-2.006%" y2="100%"><stop offset="0%" stop-color="#222357"/><stop offset="100%" stop-color="#254aa5"/></linearGradient></defs><path fill="url(#fb-visa-SVGSdd43daQ)" d="M132.397 56.24c-.146-11.516 10.263-17.942 18.104-21.763c8.056-3.92 10.762-6.434 10.73-9.94c-.06-5.365-6.426-7.733-12.383-7.825c-10.393-.161-16.436 2.806-21.24 5.05l-3.744-17.519c4.82-2.221 13.745-4.158 23-4.243c21.725 0 35.938 10.724 36.015 27.351c.085 21.102-29.188 22.27-28.988 31.702c.069 2.86 2.798 5.912 8.778 6.688c2.96.392 11.131.692 20.395-3.574l3.636 16.95c-4.982 1.814-11.385 3.551-19.357 3.551c-20.448 0-34.83-10.87-34.946-26.428m89.241 24.968c-3.967 0-7.31-2.314-8.802-5.865L181.803 1.245h21.709l4.32 11.939h26.528l2.506-11.939H256l-16.697 79.963zm3.037-21.601l6.265-30.027h-17.158zm-118.599 21.6L88.964 1.246h20.687l17.104 79.963zm-30.603 0L53.941 26.782l-8.71 46.277c-1.022 5.166-5.058 8.149-9.54 8.149H.493L0 78.886c7.226-1.568 15.436-4.097 20.41-6.803c3.044-1.653 3.912-3.098 4.912-7.026L41.819 1.245H63.68l33.516 79.963z" transform="matrix(1 0 0 -1 0 82.668)"/>',
);
export const MastercardLogo = svg(
  '0 0 256 199',
  '<path d="M46.54 198.011V184.84c0-5.05-3.074-8.342-8.343-8.342c-2.634 0-5.488.878-7.464 3.732c-1.536-2.415-3.731-3.732-7.024-3.732c-2.196 0-4.39.658-6.147 3.073v-2.634h-4.61v21.074h4.61v-11.635c0-3.731 1.976-5.488 5.05-5.488c3.072 0 4.61 1.976 4.61 5.488v11.635h4.61v-11.635c0-3.731 2.194-5.488 5.048-5.488c3.074 0 4.61 1.976 4.61 5.488v11.635zm68.271-21.074h-7.463v-6.366h-4.61v6.366h-4.171v4.17h4.17v9.66c0 4.83 1.976 7.683 7.245 7.683c1.976 0 4.17-.658 5.708-1.536l-1.318-3.952c-1.317.878-2.853 1.098-3.951 1.098c-2.195 0-3.073-1.317-3.073-3.513v-9.44h7.463zm39.076-.44c-2.634 0-4.39 1.318-5.488 3.074v-2.634h-4.61v21.074h4.61v-11.854c0-3.512 1.536-5.488 4.39-5.488c.878 0 1.976.22 2.854.439l1.317-4.39c-.878-.22-2.195-.22-3.073-.22m-59.052 2.196c-2.196-1.537-5.269-2.195-8.562-2.195c-5.268 0-8.78 2.634-8.78 6.805c0 3.513 2.634 5.488 7.244 6.147l2.195.22c2.415.438 3.732 1.097 3.732 2.195c0 1.536-1.756 2.634-4.83 2.634s-5.488-1.098-7.025-2.195l-2.195 3.512c2.415 1.756 5.708 2.634 9 2.634c6.147 0 9.66-2.853 9.66-6.805c0-3.732-2.854-5.708-7.245-6.366l-2.195-.22c-1.976-.22-3.512-.658-3.512-1.975c0-1.537 1.536-2.415 3.951-2.415c2.635 0 5.269 1.097 6.586 1.756zm122.495-2.195c-2.635 0-4.391 1.317-5.489 3.073v-2.634h-4.61v21.074h4.61v-11.854c0-3.512 1.537-5.488 4.39-5.488c.879 0 1.977.22 2.855.439l1.317-4.39c-.878-.22-2.195-.22-3.073-.22m-58.833 10.976c0 6.366 4.39 10.976 11.196 10.976c3.073 0 5.268-.658 7.463-2.414l-2.195-3.732c-1.756 1.317-3.512 1.975-5.488 1.975c-3.732 0-6.366-2.634-6.366-6.805c0-3.951 2.634-6.586 6.366-6.805c1.976 0 3.732.658 5.488 1.976l2.195-3.732c-2.195-1.757-4.39-2.415-7.463-2.415c-6.806 0-11.196 4.61-11.196 10.976m42.588 0v-10.537h-4.61v2.634c-1.537-1.975-3.732-3.073-6.586-3.073c-5.927 0-10.537 4.61-10.537 10.976s4.61 10.976 10.537 10.976c3.073 0 5.269-1.097 6.586-3.073v2.634h4.61zm-16.904 0c0-3.732 2.415-6.805 6.366-6.805c3.732 0 6.367 2.854 6.367 6.805c0 3.732-2.635 6.805-6.367 6.805c-3.951-.22-6.366-3.073-6.366-6.805m-55.1-10.976c-6.147 0-10.538 4.39-10.538 10.976s4.39 10.976 10.757 10.976c3.073 0 6.147-.878 8.562-2.853l-2.196-3.293c-1.756 1.317-3.951 2.195-6.146 2.195c-2.854 0-5.708-1.317-6.367-5.05h15.587v-1.755c.22-6.806-3.732-11.196-9.66-11.196m0 3.951c2.853 0 4.83 1.757 5.268 5.05h-10.976c.439-2.854 2.415-5.05 5.708-5.05m114.372 7.025v-18.879h-4.61v10.976c-1.537-1.975-3.732-3.073-6.586-3.073c-5.927 0-10.537 4.61-10.537 10.976s4.61 10.976 10.537 10.976c3.074 0 5.269-1.097 6.586-3.073v2.634h4.61zm-16.903 0c0-3.732 2.414-6.805 6.366-6.805c3.732 0 6.366 2.854 6.366 6.805c0 3.732-2.634 6.805-6.366 6.805c-3.952-.22-6.366-3.073-6.366-6.805m-154.107 0v-10.537h-4.61v2.634c-1.537-1.975-3.732-3.073-6.586-3.073c-5.927 0-10.537 4.61-10.537 10.976s4.61 10.976 10.537 10.976c3.074 0 5.269-1.097 6.586-3.073v2.634h4.61zm-17.123 0c0-3.732 2.415-6.805 6.366-6.805c3.732 0 6.367 2.854 6.367 6.805c0 3.732-2.635 6.805-6.367 6.805c-3.951-.22-6.366-3.073-6.366-6.805"/><path fill="#ff5f00" d="M93.298 16.903h69.15v124.251h-69.15z"/><path fill="#eb001b" d="M97.689 79.029c0-25.245 11.854-47.637 30.074-62.126C114.373 6.366 97.47 0 79.03 0C35.343 0 0 35.343 0 79.029s35.343 79.029 79.029 79.029c18.44 0 35.343-6.366 48.734-16.904c-18.22-14.269-30.074-36.88-30.074-62.125"/><path fill="#f79e1b" d="M255.746 79.029c0 43.685-35.343 79.029-79.029 79.029c-18.44 0-35.343-6.366-48.734-16.904c18.44-14.488 30.075-36.88 30.075-62.125s-11.855-47.637-30.075-62.126C141.373 6.366 158.277 0 176.717 0c43.686 0 79.03 35.563 79.03 79.029"/>',
);

/** Bulle WhatsApp d'une seule couleur (couleur du texte) : pour les boutons verts. */
export const WhatsAppGlyph = ({ className = 'w-5 h-5', title }: P) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

/** Logo officiel déposé par la boutique (SITE_CONFIG.paymentLogos), sinon le nom en toutes lettres. */
const Official: React.FC<{ src: string; name: string; dot: string; className?: string; dark?: boolean }> = ({
  src,
  name,
  dot,
  className = 'h-4 w-auto',
  dark,
}) =>
  src ? (
    <img src={src} alt={name} className={className} />
  ) : (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium leading-none ${dark ? 'text-ivory/80' : 'text-ink/80'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} aria-hidden />
      {name}
    </span>
  );

export const PayDunyaLogo = ({ className = 'h-4 w-auto' }: P) => (
  <Official src={SITE_CONFIG.paymentLogos.paydunya} name="PayDunya" dot="#0b2a4a" className={className} />
);
export const WaveLogo = ({ className = 'h-4 w-auto', dark }: P & { dark?: boolean }) => (
  <Official src={SITE_CONFIG.paymentLogos.wave} name="Wave" dot="#1dc4ff" className={className} dark={dark} />
);
export const OrangeMoneyLogo = ({ className = 'h-4 w-auto', dark }: P & { dark?: boolean }) => (
  <Official
    src={SITE_CONFIG.paymentLogos.orangeMoney}
    name="Orange Money"
    dot="#ff7900"
    className={className}
    dark={dark}
  />
);

const chip = 'h-7 px-2 rounded-md bg-white border border-ink/[0.08] grid place-items-center';

/** Cartes et paiement en ligne acceptés, en petits cartouches blancs. */
export const CardLogos: React.FC<{ className?: string; paydunya?: boolean }> = ({
  className = '',
  paydunya = true,
}) => (
  <span className={`inline-flex items-center gap-1.5 ${className}`} data-testid="card-logos">
    <span className={chip}>
      <VisaLogo className="h-3 w-auto" title="Visa" />
    </span>
    <span className={chip}>
      <MastercardLogo className="h-4 w-auto" title="Mastercard" />
    </span>
    {paydunya && (
      <span className={chip}>
        <PayDunyaLogo />
      </span>
    )}
  </span>
);

/** Tous les moyens de paiement : Wave, Orange Money, cartes, PayDunya (et espèces à la livraison). */
export const PaymentLogos: React.FC<{ className?: string; cash?: boolean }> = ({ className = '', cash = true }) => (
  <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`} data-testid="payment-logos">
    <span className={chip}>
      <WaveLogo />
    </span>
    <span className={chip}>
      <OrangeMoneyLogo />
    </span>
    {SITE_CONFIG.cardPayments && <CardLogos />}
    {cash && (
      <span className={chip}>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink/80 leading-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#11694f]" aria-hidden />
          Espèces
        </span>
      </span>
    )}
  </span>
);

/* ---------- Réseaux sociaux : icônes « application », toutes de la même forme ---------- */
/*
 * Carré arrondi aux couleurs officielles de chaque marque, pictogramme blanc au centre :
 * le même dessin que sur l'écran d'accueil du téléphone, donc reconnu au premier coup d'œil.
 * Tracés : Simple Icons (CC0). Les identifiants de dégradé sont uniques (React.useId), car
 * le même logo peut apparaître deux fois sur la page (menu et bas de page).
 */
const Tile: React.FC<P & { children: React.ReactNode; defs?: React.ReactNode }> = ({
  className = 'w-11 h-11',
  title,
  children,
  defs,
}) => {
  const sheen = `soc-sheen-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        {defs}
        {/* Reflet doux en haut de l'icône, comme un émail */}
        <linearGradient id={sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {children}
      <rect width="48" height="48" rx="14" fill={`url(#${sheen})`} />
      <rect x="0.5" y="0.5" width="47" height="47" rx="13.5" fill="none" stroke="#fff" strokeOpacity="0.2" />
    </svg>
  );
};
const gid = (id: string, k: string) => `soc-${k}-${id.replace(/[^a-zA-Z0-9]/g, '')}`;

export const WhatsAppLogo = (p: P) => {
  const g = gid(React.useId(), 'wa');
  return (
    <Tile
      {...p}
      defs={
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5FFC7B" />
          <stop offset="1" stopColor="#25B83F" />
        </linearGradient>
      }
    >
      <rect width="48" height="48" rx="14" fill={`url(#${g})`} />
      <path
        transform="translate(11 11) scale(1.0833)"
        fill="#fff"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </Tile>
  );
};

export const InstagramLogo = (p: P) => {
  const g = gid(React.useId(), 'ig');
  return (
    <Tile
      {...p}
      defs={
        <radialGradient id={g} cx="0.28" cy="1.05" r="1.25">
          <stop offset="0" stopColor="#FFD776" />
          <stop offset="0.22" stopColor="#F9863A" />
          <stop offset="0.48" stopColor="#E1306C" />
          <stop offset="0.72" stopColor="#B12AA8" />
          <stop offset="1" stopColor="#5B51D8" />
        </radialGradient>
      }
    >
      <rect width="48" height="48" rx="14" fill={`url(#${g})`} />
      <path
        transform="translate(11 11) scale(1.0833)"
        fill="#fff"
        d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"
      />
    </Tile>
  );
};

/** TikTok : note blanche avec ses deux ombres cyan et rose, sur noir. */
export const TikTokLogo = (p: P) => (
  <Tile {...p}>
    <rect width="48" height="48" rx="14" fill="#010101" />
    <path
      transform="translate(10.2 10.6) scale(1.0833)"
      fill="#25F4EE"
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
    <path
      transform="translate(11.8 11.4) scale(1.0833)"
      fill="#FE2C55"
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
    <path
      transform="translate(11 11) scale(1.0833)"
      fill="#fff"
      d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
    />
  </Tile>
);

/** Snapchat : fantôme blanc cerné de noir sur le jaune officiel. */
export const SnapchatLogo = (p: P) => (
  <Tile {...p}>
    <rect width="48" height="48" rx="14" fill="#FFFC00" />
    <path
      transform="translate(11 11) scale(1.0833)"
      fill="#fff"
      stroke="#000"
      strokeWidth="1.1"
      strokeLinejoin="round"
      d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"
    />
  </Tile>
);

/** Facebook : le « f » blanc posé en bas, sur le bleu officiel (comme l'application). */
export const FacebookLogo = (p: P) => (
  <Tile {...p}>
    <rect width="48" height="48" rx="14" fill="#0866FF" />
    <path
      transform="translate(-2 1) scale(0.203)"
      fill="#fff"
      d="m177.825 165l5.675-37H148v-24.01C148 93.866 152.959 84 168.86 84H185V52.5S170.352 50 156.347 50C127.11 50 108 67.72 108 99.8V128H75.5v37H108v89.445A129 129 0 0 0 128 256a129 129 0 0 0 20-1.555V165z"
    />
  </Tile>
);

/** X (anciennement Twitter). */
export const XLogo = (p: P) => (
  <Tile {...p}>
    <rect width="48" height="48" rx="14" fill="#000" />
    <path
      transform="translate(12.5 12.5) scale(0.958)"
      fill="#fff"
      d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"
    />
  </Tile>
);

/** Les comptes de la boutique, dans l'ordre où les clientes les utilisent le plus. `glow` : lueur à la couleur de la marque. */
export const SOCIAL_LINKS = [
  {
    Logo: WhatsAppLogo,
    href: buildWhatsAppLink('Bonjour Maefa Store !'),
    label: 'WhatsApp',
    short: 'WhatsApp',
    glow: 'rgba(37,184,63,.55)',
  },
  {
    Logo: InstagramLogo,
    href: SITE_CONFIG.social.instagram,
    label: 'Instagram',
    short: 'Instagram',
    glow: 'rgba(225,48,108,.5)',
  },
  { Logo: TikTokLogo, href: SITE_CONFIG.social.tiktok, label: 'TikTok', short: 'TikTok', glow: 'rgba(0,0,0,.55)' },
  {
    Logo: SnapchatLogo,
    href: SITE_CONFIG.social.snapchat,
    label: 'Snapchat',
    short: 'Snap',
    glow: 'rgba(214,190,0,.55)',
  },
  {
    Logo: FacebookLogo,
    href: SITE_CONFIG.social.facebook,
    label: 'Facebook',
    short: 'Facebook',
    glow: 'rgba(8,102,255,.5)',
  },
  { Logo: XLogo, href: SITE_CONFIG.social.x, label: 'X (Twitter)', short: 'X', glow: 'rgba(0,0,0,.55)' },
];

/** Rangée d'icônes cliquables (bas de page, menu du téléphone) ; `labels` : le nom sous chaque icône. */
export const SocialLinks: React.FC<{ size?: string; className?: string; labels?: boolean; labelClass?: string }> = ({
  size = 'w-11 h-11',
  className = '',
  labels,
  labelClass = 'text-ink/65',
}) => (
  <div className={`${labels ? 'grid grid-cols-6 gap-1 justify-items-center' : 'flex flex-wrap gap-3'} ${className}`}>
    {SOCIAL_LINKS.map(({ Logo, href, label, short, glow }) => (
      <a
        key={label}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        data-testid={`social-${label.split(' ')[0].toLowerCase()}`}
        className="group flex flex-col items-center gap-1.5 rounded-[30%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span
          className="block rounded-[29%] transition-transform duration-500 ease-luxe group-hover:-translate-y-1 group-hover:scale-[1.06] group-active:scale-95"
          style={{ boxShadow: `0 10px 22px -12px ${glow}, 0 2px 4px -2px rgba(0,0,0,.25)` }}
        >
          <Logo className={`${size} block`} />
        </span>
        {labels && (
          <span className={`text-[9px] font-medium leading-none whitespace-nowrap ${labelClass}`} aria-hidden>
            {short}
          </span>
        )}
      </a>
    ))}
  </div>
);
