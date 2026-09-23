/** Ouverture de l'assistante depuis n'importe où (le panneau lui-même est chargé à la demande). */
export const OPEN_ASSISTANT_EVENT = 'fabima:open-assistant';
export const openAssistant = (question?: string) => window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: question }));
