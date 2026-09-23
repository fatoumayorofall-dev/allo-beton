/**
 * Micro-animation d'ajout au panier : la photo de la pièce s'envole jusqu'au sac de l'en-tête,
 * qui rebondit à l'arrivée. Rien ne bouge si la cliente a demandé moins d'animations.
 */
export function flyToCart(from: Element | null | undefined, src?: string) {
  if (!from || !src || typeof Element.prototype.animate !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find(el => el.getClientRects().length > 0);
  if (!target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.max(48, Math.min(a.width, a.height, 140));
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  Object.assign(img.style, {
    position: 'fixed', left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`, height: `${size}px`, objectFit: 'cover', borderRadius: '999px', zIndex: '90', pointerEvents: 'none',
    boxShadow: '0 18px 40px -12px rgba(58,31,45,.45)', border: '3px solid #fff',
  });
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const flight = img.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(.6)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.14)`, opacity: 0.5 },
  ], { duration: 800, easing: 'cubic-bezier(.55,0,.35,1)' });
  flight.onfinish = flight.oncancel = () => {
    img.remove();
    target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)' }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
  };
}
