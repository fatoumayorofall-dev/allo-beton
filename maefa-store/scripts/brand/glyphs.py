"""
Tracés vectoriels des lettres de l'identité Maefa (aucune police à charger sur le site).
- Cormorant (italique 500) : le E du monogramme, dans l'arche
- Cormorant 650 : le nom Maefa
- Jost 500 : STORE ◆ DAKAR, le cachet et le micro-texte de l'écrin sécurisé
Polices sous licence SIL Open Font License (fichiers dans ./fonts).
"""
import io
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

HERE = os.path.dirname(os.path.abspath(__file__))
_cache = {}


def font(name, wght):
    key = (name, wght)
    if key not in _cache:
        f = TTFont(os.path.join(HERE, 'fonts', name))
        if 'fvar' in f:
            f = instantiateVariableFont(f, {'wght': wght})
        _cache[key] = f
    return _cache[key]


def _glyph(f, ch):
    return f.getGlyphSet()[f.getBestCmap()[ord(ch)]]


def cap_height(f):
    return f['OS/2'].sCapHeight or _bounds(f, 'H')[3]


def _bounds(f, ch):
    bp = BoundsPen(f.getGlyphSet())
    _glyph(f, ch).draw(bp)
    return bp.bounds


def fmt(d):
    """Arrondit les nombres d'un tracé à 2 décimales (fichiers plus légers)."""
    import re
    return re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.2f}'.rstrip('0').rstrip('.'), d)


def text_path(f, text, size, x=0.0, baseline=0.0, tracking=0.0):
    """Tracé d'un texte : taille en unités SVG (hauteur de capitale = size), renvoie (d, largeur)."""
    upm = f['head'].unitsPerEm
    s = size / cap_height(f)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    pen = SVGPathPen(gs)
    cx = x
    for i, ch in enumerate(text):
        g = gs[cmap[ord(ch)]]
        if ch != ' ':
            g.draw(TransformPen(pen, (s, 0, 0, -s, cx, baseline)))
        cx += g.width * s + (tracking if i < len(text) - 1 else 0)
    return fmt(pen.getCommands()), cx - x


def text_width(f, text, size, tracking=0.0):
    return text_path(f, text, size, tracking=tracking)[1]


def ink_bounds(f, text, size, tracking=0.0):
    """Encre réelle (xMin, yMin, xMax, yMax) en coordonnées SVG, ligne de base à 0."""
    s = size / cap_height(f)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    bp = BoundsPen(gs)
    cx = 0
    for i, ch in enumerate(text):
        g = gs[cmap[ord(ch)]]
        if ch != ' ':
            g.draw(TransformPen(bp, (s, 0, 0, -s, cx, 0)))
        cx += g.width * s + (tracking if i < len(text) - 1 else 0)
    return bp.bounds


def fit_glyph(f, ch, box):
    """Tracé d'une lettre mise à l'échelle et centrée dans box = (x0, y0, x1, y1) (hauteur imposée)."""
    xmin, ymin, xmax, ymax = _bounds(f, ch)
    x0, y0, x1, y1 = box
    s = (y1 - y0) / (ymax - ymin)
    w = (xmax - xmin) * s
    dx = (x0 + x1) / 2 - w / 2 - xmin * s
    dy = y1 + ymin * s  # le bas de la lettre sur y1 (axe y inversé)
    pen = SVGPathPen(f.getGlyphSet())
    _glyph(f, ch).draw(TransformPen(pen, (s, 0, 0, -s, dx, dy)))
    return fmt(pen.getCommands())


def glyph_at(f, ch, size):
    """Une lettre seule, origine en bas à gauche, et sa largeur d'avance."""
    s = size / cap_height(f)
    g = _glyph(f, ch)
    pen = SVGPathPen(f.getGlyphSet())
    g.draw(TransformPen(pen, (s, 0, 0, -s, 0, 0)))
    return fmt(pen.getCommands()), g.width * s
