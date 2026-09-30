// Point d'entrée compilé par esbuild pour les tests : catalogue réel, contexte boutique et vendeuse hors ligne.
export { INITIAL_PRODUCTS as products, OCCASIONS, CATEGORIES } from '../../src/data/catalog';
export { DELIVERY_ZONES, PROMO_CODES, SITE_CONFIG } from '../../src/config/site';
export { FAQ_ITEMS } from '../../src/data/faq';
export { formatDay, upcomingFetes } from '../../src/utils/fetes';
export { recommend, nextQuestion, pitch, colorFamilies, modelOf, QUESTIONS } from '../../src/utils/shopAdvisor';
export { wolofLocalAnswer, WOLOF_GUIDE } from '../../src/data/wolofGuide';
export { understand, reply, newBrainState } from '../../src/assistant/brain';
export { extractSlots } from '../../src/assistant/slots';
export { detectLang } from '../../src/assistant/nlu';
