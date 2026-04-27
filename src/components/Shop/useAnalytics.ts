/**
 * ALLO BETON — Hooks Analytics (GA4 + Meta Pixel)
 * Prêt à l'emploi : suffit de définir VITE_GA4_ID et VITE_META_PIXEL_ID
 * Fallback silencieux si pas configuré
 */

import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    fbq?: (...args: any[]) => void;
  }
}

const GA4_ID = import.meta.env.VITE_GA4_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let isInitialized = false;

/**
 * Injecte les scripts GA4 et Meta Pixel (une seule fois).
 * Appeler dans un useEffect au top-level de l'app shop.
 */
function initAnalytics() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // === GA4 ===
  if (GA4_ID) {
    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(s1);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer!.push(arguments as any); };
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID, {
      anonymize_ip: true,
      send_page_view: true,
    });
  }

  // === Meta Pixel ===
  if (META_PIXEL_ID) {
    /* eslint-disable */
    // @ts-ignore
    !function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any){
      if (f.fbq) return; n = f.fbq = function(){ n.callMethod ? n.callMethod.apply(n, arguments as any) : n.queue.push(arguments as any); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq!('init', META_PIXEL_ID);
    window.fbq!('track', 'PageView');
  }
}

export type EcommerceEvent =
  | 'view_item'
  | 'view_item_list'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_payment_info'
  | 'purchase'
  | 'sign_up'
  | 'login'
  | 'search'
  | 'generate_lead';

export interface EventParams {
  currency?: string;
  value?: number;
  items?: Array<{
    item_id: string;
    item_name: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
  [key: string]: any;
}

/**
 * Hook principal : retourne un tracker d'event et initialise les scripts.
 */
export function useAnalytics() {
  useEffect(() => {
    initAnalytics();
  }, []);

  const track = useCallback((event: EcommerceEvent, params: EventParams = {}) => {
    try {
      // GA4
      if (window.gtag) {
        window.gtag('event', event, {
          currency: 'XOF',
          ...params,
        });
      }
      // Meta Pixel
      if (window.fbq) {
        const fbEventMap: Record<string, string> = {
          view_item: 'ViewContent',
          add_to_cart: 'AddToCart',
          begin_checkout: 'InitiateCheckout',
          purchase: 'Purchase',
          sign_up: 'CompleteRegistration',
          search: 'Search',
          generate_lead: 'Lead',
        };
        const fbEvent = fbEventMap[event];
        if (fbEvent) {
          window.fbq('track', fbEvent, {
            currency: params.currency || 'XOF',
            value: params.value,
            content_ids: params.items?.map((i) => i.item_id),
            content_name: params.items?.[0]?.item_name,
          });
        }
      }
    } catch (e) {
      // Ne casse jamais l'app pour un problème d'analytics
      console.debug('analytics track failed', e);
    }
  }, []);

  return { track };
}

/**
 * Tracker autonome (utilisable hors composant React).
 */
export function trackEvent(event: EcommerceEvent, params: EventParams = {}) {
  initAnalytics();
  try {
    if (window.gtag) {
      window.gtag('event', event, { currency: 'XOF', ...params });
    }
  } catch {
    /* silent */
  }
}
