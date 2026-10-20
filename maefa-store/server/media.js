// ============================================================
//  VIDÉOS DES PIÈCES
//  - la gérante envoie une vidéo depuis l'espace gérant (filmée au téléphone : MP4, MOV d'iPhone ou WebM)
//  - rangée dans DATA_DIR/media sous un nom tiré de son contenu : la même vidéo n'est jamais stockée deux fois
//  - servie en /media/… avec la lecture par morceaux (indispensable sur iPhone) et une longue mise en cache
// ============================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

export const MAX_VIDEO_MB = 40;
/** Adresse d'une vidéo envoyée par la gérante. */
export const MEDIA_URL = /^\/media\/[a-f0-9]{16}\.(mp4|webm)$/;
/** Adresse d'une photo envoyée par un vendeur de la place de marché. */
export const PHOTO_URL = /^\/media\/[a-f0-9]{16}\.(jpg|png|webp)$/;
const TYPES = { mp4: 'video/mp4', webm: 'video/webm', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Reconnaît une photo à son contenu : JPEG, PNG ou WebP. */
export function sniffImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP')
    return 'webp';
  return null;
}

/** Range un fichier sous un nom tiré de son contenu ; renvoie son adresse publique. */
export function storeMedia(dataDir, buf, ext) {
  const dir = path.join(dataDir, 'media');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${ext}`;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  return `/media/${name}`;
}

/** Reconnaît le format au contenu du fichier (et non à son nom, qui peut mentir). */
function sniff(buf) {
  if (buf.length < 16) return null;
  // MP4 et MOV (QuickTime) : une « boîte » ftyp, moov, mdat… à partir du 5e octet
  if (/^(ftyp|moov|mdat|wide|free|skip|pnot)$/.test(buf.subarray(4, 8).toString('latin1'))) return 'mp4';
  // WebM / Matroska
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'webm';
  return null;
}

export function registerMediaRoutes(app, { limit, isAdmin, dataDir }) {
  const dir = path.join(dataDir, 'media');
  fs.mkdirSync(dir, { recursive: true });

  /* Envoi d'une vidéo (corps brut, jusqu'à 40 Mo) */
  app.post('/api/admin/media', express.raw({ type: () => true, limit: `${MAX_VIDEO_MB}mb` }), (req, res) => {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès gérante requis' });
    if (!limit(`media:${req.ip}`, 40, 3600e3))
      return res.status(429).json({ error: "Trop d'envois, réessayez dans une heure" });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Fichier vide' });
    const ext = sniff(buf);
    if (!ext) return res.status(415).json({ error: 'Format non pris en charge : envoyez une vidéo MP4, MOV ou WebM' });
    res.json({ url: storeMedia(dataDir, buf, ext), bytes: buf.length });
  });

  /* Lecture : fichiers au nom tiré du contenu, donc jamais modifiés → cache d'un an */
  app.use(
    '/media',
    express.static(dir, {
      immutable: true,
      maxAge: '1y',
      index: false,
      dotfiles: 'deny',
      setHeaders: (res, file) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.type(TYPES[path.extname(file).slice(1)] ?? 'application/octet-stream');
      },
    }),
    (_req, res) => res.status(404).end(),
  );

  /* Erreur de taille : message clair plutôt qu'une page d'erreur */
  app.use('/api/admin/media', (err, _req, res, next) => {
    if (err?.type === 'entity.too.large')
      return res.status(413).json({ error: `Vidéo trop lourde (${MAX_VIDEO_MB} Mo au maximum)` });
    next(err);
  });
}
