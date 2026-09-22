/** Lit un texte à voix haute en français (aide pour les personnes qui lisent difficilement). */
export function speak(text: string) {
  if (!('speechSynthesis' in window)) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 0.92;
  const fr = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('fr'));
  if (fr) u.voice = fr;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}
