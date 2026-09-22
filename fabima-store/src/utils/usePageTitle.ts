import { useEffect } from 'react';
import { SITE_CONFIG } from '../config/site';

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_CONFIG.name}` : `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`;
  }, [title]);
}
