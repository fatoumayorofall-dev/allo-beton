"""
Génère les tracés de l'identité de la marque et les fichiers de marque (public/brand, favicon).
Usage : python3 scripts/brand/generate.py   (depuis la racine du projet ; demande fontTools et brotli)

Le monogramme garde sa construction « L'Écrin » (arche, filet, clé de voûte en losange, paraphe) ;
l'initiale (NAME, INITIAL ci-dessous) et le nom se règlent en tête de fichier, avec STORE ◆ DAKAR justifié dessous.
"""
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glyphs import font, text_path, ink_bounds, fit_glyph, glyph_at, fmt  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BRAND = os.path.join(ROOT, 'public', 'brand')

COR = font('cormorant.woff2', 650)
ITA = font('cormorant-italic.woff2', 500)
JOST = font('jost.woff2', 500)

# Géométrie inchangée de l'écrin (mêmes valeurs que src/components/Logo.tsx)
# La marque : nom, initiale du monogramme, textes du cachet et du micro-texte
NAME, INITIAL = 'MAEFA', 'M'
CACHET_TOP = 'MAMAEFA STORE'
MICRO = 'MAMAEFA STORE · DAKAR · AUTHENTIQUE · '

ARCH = 'M18 94V38A32 32 0 0 1 82 38V94Z'
INNER = 'M23.2 94V38A26.8 26.8 0 0 1 76.8 38V94'
KEY = 'M50 8.5L51.9 11.2L50 13.8L48.0 11.2Z'
SWASH = 'M36.5 80.2C44.5 76.4 53.5 84.6 65.5 78.2C53.8 85.9 44.4 78.6 36.5 80.2Z'


def paths():
    # Initiale E : même encombrement que l'ancien F (grande et petite versions)
    e = fit_glyph(ITA, INITIAL, (35.5, 37.5, 66.5, 75.5))
    e_small = fit_glyph(ITA, INITIAL, (33.0, 37.0, 69.0, 81.0))
    # Nom : capitales de 40 unités, espacement optique large
    tracking = 14
    x0 = -ink_bounds(COR, NAME, 40, tracking)[0]
    word, adv = text_path(COR, NAME, 40, x=x0, baseline=40, tracking=tracking)
    width = round(ink_bounds(COR, NAME, 40, tracking)[2] + x0, 2)
    # STORE ◆ DAKAR justifié sur la largeur du nom
    cap, base, tt = 5.4, 56.2, 2.1
    b1 = ink_bounds(JOST, 'STORE', cap, tt)
    b2 = ink_bounds(JOST, 'DAKAR', cap, tt)
    left, _ = text_path(JOST, 'STORE', cap, x=-b1[0], baseline=base, tracking=tt)
    right_x = width - b2[2]
    right, _ = text_path(JOST, 'DAKAR', cap, x=right_x, baseline=base, tracking=tt)
    y = 53.3
    mid = width / 2
    a, b = b1[2] - b1[0] + 5, right_x + b2[0] - 5
    rules = f'M{a:.2f} {y}H{mid - 5:.2f}M{mid + 5:.2f} {y}H{b:.2f}'
    diamond = f'M{mid:.2f} {y - 2.4:.2f}L{mid + 2.4:.2f} {y}L{mid:.2f} {y + 2.4:.2f}L{mid - 2.4:.2f} {y}Z'
    return {'e': e, 'eSmall': e_small, 'word': word, 'tag': left + right, 'rules': rules, 'diamond': diamond, 'width': width}


if __name__ == '__main__' and len(sys.argv) == 1:
    p = paths()
    print('largeur du nom', p['width'])


# ---------------------------------------------------------------------------
#  Fichiers de marque : repris des modèles existants (couleurs, dégradés, guilloché),
#  seules les lettres et les largeurs changent.
# ---------------------------------------------------------------------------
def _swap(svg, old, new):
    """Remplace dans un fichier les tracés de l'ancienne marque par ceux de la nouvelle."""
    for k in ('e', 'eSmall', 'word', 'tag', 'rules', 'diamond'):
        svg = svg.replace(f'd="{old[k]}"', f'd="{new[k]}"')
    return svg


def _arc_text(text, r, center_deg, size, tracking, cx=100, cy=100, outward=True, fill='#8f544e'):
    """Lettres posées une à une sur un cercle (cachet), centrées sur l'angle center_deg (-90 = en haut)."""
    items = []
    for ch in text:
        d, adv = glyph_at(JOST, ch, size)
        items.append((ch, d, adv))
    total = sum(a for _, _, a in items) + tracking * (len(items) - 1)
    span = total / r
    sign = 1 if outward else -1
    ang = math.radians(center_deg) - sign * span / 2
    out = []
    for ch, d, adv in items:
        mid = ang + sign * (adv / 2) / r
        x, y = cx + r * math.cos(mid), cy + r * math.sin(mid)
        rot = math.degrees(mid) + (90 if outward else -90)
        if ch != ' ':
            out.append(f'<path transform="translate({x:.2f} {y:.2f}) rotate({rot:.2f}) translate({-adv / 2:.2f} {size / 2:.2f})" d="{d}" fill="{fill}"/>')
        ang += sign * (adv + tracking) / r
    return ''.join(out)


def _micro_text(fill='url(#sg)'):
    """Micro-texte de l'écrin sécurisé, le long du filet intérieur de l'arche (hors clé de voûte)."""
    size, tracking = 0.94, 0.52
    phrase = MICRO
    L1, R, L3 = 94 - 1.84 - 38, 26.8, 94 - 1.88 - 38
    arc = math.pi * R
    total = L1 + arc + L3
    gap_mid, gap_half = L1 + arc / 2, 4.2

    def at(s):
        if s < L1:
            return 23.2, 92.16 - s, -90.0
        if s < L1 + arc:
            th = math.pi - (s - L1) / R
            return 50 + R * math.cos(th), 38 - R * math.sin(th), 90 - math.degrees(th)
        return 76.8, 38 + (s - L1 - arc), 90.0

    out, s, i = [], 0.0, 0
    while True:
        ch = phrase[i % len(phrase)]
        d, adv = glyph_at(JOST, ch, size)
        if s + adv > total:
            break
        if gap_mid - gap_half < s + adv and s < gap_mid + gap_half:
            s = gap_mid + gap_half
            continue
        if ch != ' ':
            x, y, rot = at(s + adv / 2)
            out.append(f'<path transform="translate({x:.3f} {y:.3f}) rotate({rot:.2f}) translate({-adv / 2:.3f} {size / 2:.3f})" d="{d}"/>')
        s += adv + tracking
        i += 1
    return f'<g fill="{fill}">' + ''.join(out) + '</g>'


def rebuild_files(old, p, src_prefix, dst_prefix):
    """Régénère les fichiers de marque à partir de ceux de la marque précédente (mêmes couleurs, même écrin)."""
    W = p['width']
    rd = lambda n: open(os.path.join(BRAND, n), encoding='utf8').read()
    written = {}
    for suffix in ('monogramme', 'monogramme-or', 'monogramme-une-couleur'):
        written[f'{dst_prefix}-{suffix}.svg'] = _swap(rd(f'{src_prefix}-{suffix}.svg'), old, p)
    written['../favicon.svg'] = _swap(open(os.path.join(ROOT, 'public', 'favicon.svg'), encoding='utf8').read(), old, p)
    for suffix in ('logo', 'logo-clair'):
        s = _swap(rd(f'{src_prefix}-{suffix}.svg'), old, p)
        written[f'{dst_prefix}-{suffix}.svg'] = re.sub(r'viewBox="0 -7\.0 [\d.]+ 72\.0"', f'viewBox="0 -7.0 {69.33 + W + 1.5:.1f} 72.0"', s)
    for suffix in ('logo-empile', 'logo-empile-clair'):
        s = _swap(rd(f'{src_prefix}-{suffix}.svg'), old, p)
        s = re.sub(r'translate\([\d.-]+ 0\) scale\(1\.25\)', f'translate({W / 2 - 33 * 1.25:.2f} 0) scale(1.25)', s)
        written[f'{dst_prefix}-{suffix}.svg'] = re.sub(r'viewBox="-8 -2 [\d.]+ 198\.5"', f'viewBox="-8 -2 {W + 16:.1f} 198.5"', s)
    for suffix in ('cachet', 'cachet-prune'):
        s = _swap(rd(f'{src_prefix}-{suffix}.svg'), old, p)
        top = [m for m in re.finditer(r'<path transform="translate\(([\d.]+) ([\d.]+)\)[^>]*/>', s) if float(m.group(2)) < 100]
        fill = re.search(r'fill="([^"]+)"', top[0].group(0)).group(1)
        r = math.hypot(float(top[0].group(1)) - 100, float(top[0].group(2)) - 100)
        for m in reversed(top):
            s = s[:m.start()] + s[m.end():]
        at = s.index('<path', s.index('r="62"'))
        written[f'{dst_prefix}-{suffix}.svg'] = s[:at] + _arc_text(CACHET_TOP, r, -90, 6.48, 3.4, fill=fill) + s[at:]
    s = _swap(rd(f'{src_prefix}-monogramme-securise.svg'), old, p)
    a = s.index('<!--secret-->') + len('<!--secret-->')
    b = s.index('</g>', a) + len('</g>')
    written[f'{dst_prefix}-monogramme-securise.svg'] = s[:a] + _micro_text() + s[b:]
    for name, content in written.items():
        with open(os.path.join(BRAND, name), 'w', encoding='utf8') as f:
            f.write(content)
    return list(written)


def write_wordmark(p, prefix):
    """Le nom seul (+ STORE ◆ DAKAR), pour les supports où l'écrin est déjà présent."""
    W = p['width']
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 {W + 2.2:.1f} 60">'
           f'<path d="{p["word"]}" fill="#3a1f2d"/><path d="{p["tag"]}" fill="#8f544e"/>'
           f'<path d="{p["rules"]}" fill="none" stroke="#8f544e" stroke-width=".8"/><path d="{p["diamond"]}" fill="#8f544e"/></svg>')
    open(os.path.join(BRAND, f'{prefix}-nom.svg'), 'w', encoding='utf8').write(svg)


if __name__ == '__main__' and '--rebrand' in sys.argv:
    # python3 generate.py --rebrand <ancien préfixe> <nouveau préfixe>
    i = sys.argv.index('--rebrand')
    src, dst = sys.argv[i + 1], sys.argv[i + 2]
    here = os.path.dirname(os.path.abspath(__file__))
    old = json.load(open(os.path.join(here, 'paths.json')))
    new = paths()
    print(rebuild_files(old, new, src, dst))
    write_wordmark(new, dst)
    json.dump(new, open(os.path.join(here, 'paths.json'), 'w'), indent=1)
