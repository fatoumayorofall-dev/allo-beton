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
    if (!limit(`media:${req.ip}`, 40, 3600e3)) return res.status(429).json({ error: 'Trop d\'envois, réessayez dans une heure' });
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'Fichier vide' });
    const ext = sniff(buf);
    if (!ext) return res.status(415).json({ error: 'Format non pris en charge : envoyez une vidéo MP4, MOV ou WebM' });
    const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16)}.${ext}`;
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
    res.json({ url: `/media/${name}`, bytes: buf.length });
  });

  /* Lecture : fichiers au nom tiré du contenu, donc jamais modifiés → cache d'un an */
  app.use('/media', express.static(dir, {
    immutable: true, maxAge: '1y', index: false, dotfiles: 'deny',
    setHeaders: (res, file) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.type(file.endsWith('.webm') ? 'video/webm' : 'video/mp4');
    },
  }), (_req, res) => res.status(404).end());

  /* Erreur de taille : message clair plutôt qu'une page d'erreur */
  app.use('/api/admin/media', (err, _req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: `Vidéo trop lourde (${MAX_VIDEO_MB} Mo au maximum)` });
    next(err);
  });
}
