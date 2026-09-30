#!/usr/bin/env python3
"""Versions légères des photos produits (540 px de large) pour les vignettes sur téléphone.
Crée public/produits/540/<nom>.jpg pour chaque photo qui n'en a pas encore.
À relancer après l'ajout de nouvelles photos :  python3 outils/photo/miniatures.py"""
from pathlib import Path
from PIL import Image

src = Path(__file__).resolve().parents[2] / 'public' / 'produits'
out = src / '540'
out.mkdir(exist_ok=True)
n = 0
for f in sorted(src.glob('*.jpg')):
    dst = out / f.name
    if dst.exists() and dst.stat().st_mtime >= f.stat().st_mtime:
        continue
    im = Image.open(f).convert('RGB')
    im = im.resize((540, round(im.height * 540 / im.width)), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=80, optimize=True, progressive=True)
    n += 1
print(f'{n} miniature(s) créée(s) dans {out}')
