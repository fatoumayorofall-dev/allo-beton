/**
 * Photo prise au téléphone : réduite à 1280 px et recompressée en JPEG avant l'envoi
 * (une photo d'iPhone de 4 Mo devient ≈ 200 Ko : envoi rapide même en 3G).
 */
export async function shrinkPhoto(file: File, max = 1280, quality = 0.84): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // format que le navigateur ne sait pas lire : envoyé tel quel, le serveur jugera
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise(resolve => canvas.toBlob(b => resolve(b ?? file), 'image/jpeg', quality));
}
