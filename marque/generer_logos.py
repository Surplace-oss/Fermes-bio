import math, uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
FONTS = {}
def load(name):
    if name not in FONTS:
        data = open(name + '.ttf', 'rb').read()
        FONTS[name] = (hb.Font(hb.Face(data)), TTFont(name + '.ttf'))
    return FONTS[name]
def texte(name, s, size, x=0, y=0, track=0.0):
    """Texte → (chemin SVG, largeur, (xmin,ymin,xmax,ymax)) avec crénage HarfBuzz. y = ligne de base."""
    hbf, tt = load(name); upm = tt['head'].unitsPerEm; k = size / upm
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
    hb.shape(hbf, buf, {'kern': True, 'liga': True})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    pen = SVGPathPen(gs); bp = BoundsPen(gs); cx = 0
    n = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        g = order[info.codepoint]
        gx = x + (cx + pos.x_offset) * k
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, gx, y - pos.y_offset * k)))
        gs[g].draw(TransformPen(bp, (k, 0, 0, -k, gx, y - pos.y_offset * k)))
        cx += pos.x_advance + (track * upm if i < n - 1 else 0)
    return pen.getCommands(), cx * k, bp.bounds
def boucle(cx, cy, rx, ry, tours=1.13, depart=-62, rot=-5, graine=0, n=2.0):
    """Boucle dessinée à la main : un peu plus d'un tour, qui dérive vers l'extérieur et dépasse."""
    pts = []; N = 36; tot = tours * 360
    for i in range(N + 1):
        t = i / N; a = math.radians(depart - t * tot)
        wob = 1 + 0.025 * math.sin(3.1 * a + graine) + 0.015 * math.sin(5.3 * a + 2 * graine)
        r = (0.95 + 0.13 * t) * wob
        ca, sa = math.cos(a), math.sin(a)
        e = 2 / n
        px = rx * r * math.copysign(abs(ca) ** e, ca); py = ry * r * math.copysign(abs(sa) ** e, sa)
        rr = math.radians(rot)
        pts.append((cx + px * math.cos(rr) - py * math.sin(rr), cy + px * math.sin(rr) + py * math.cos(rr)))
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d
B9, B7, I4 = 'bodoni-moda-latin-900-normal', 'bodoni-moda-latin-700-normal', 'bodoni-moda-latin-400-italic'

def svg(w, h, corps, fond=None):
    f = f'<rect width="{w}" height="{h}" fill="{fond}"/>' if fond else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}">{f}{corps}</svg>'

def place(name, s, size, x, y, track=0.0):
    """Pose le texte pour que sa boîte englobante commence en x et que son haut soit en y."""
    _, w, b = texte(name, s, size, 0, 0, track)
    d, w, b = texte(name, s, size, x - b[0], y - b[1], track)
    return d, b

def principal(encre='#000', trait='#1F4A2E', fond=None):
    # PLACE en grand, SUR en capitales espacées au-dessus, boucle autour de PLACE uniquement
    m = 46
    _, b = place(B9, 'PLACE', 150, 0, 0, -0.01); wP, hP = b[2] - b[0], b[3] - b[1]
    _, b1 = place(B7, 'SUR', 40, 0, 0, 0.5); wS, hS = b1[2] - b1[0], b1[3] - b1[1]
    W = wP + 2 * m + 96
    yP = m + hS + 66
    d2, b2 = place(B9, 'PLACE', 150, (W - wP) / 2, yP, -0.01)
    d1, b1 = place(B7, 'SUR', 40, (W - wS) / 2 + 9, m, 0.5)
    cx, cy = (b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2
    L = boucle(cx + 3, cy + 4, wP / 2 + 42, hP / 2 + 32, tours=1.08, depart=-35, rot=-2.5, graine=1.3, n=2.7)
    H = b2[3] + m + 22
    return svg(W, H, f'<path d="{d1} {d2}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="5" stroke-linecap="round"/>', fond)

def horizontal(encre='#000', trait='#1F4A2E', fond=None, epais=4.5):
    m = 30
    d1, b1 = place(B9, 'Sur', 96, m, 0)
    base_h = b1[3]
    _, bp = place(B9, 'Place', 96, 0, 0)
    # même ligne de base : on recale Place sur la ligne de base de Sur
    d1, w1, b1 = texte(B9, 'Sur', 96, m, 120)
    d2, w2, b2 = texte(B9, 'Place', 96, m + w1 + 50, 120)
    cx, cy = (b2[0] + b2[2]) / 2, (b2[1] + b2[3]) / 2
    rx, ry = (b2[2] - b2[0]) / 2 + 24, (b2[3] - b2[1]) / 2 + 22
    L = boucle(cx + 2, cy + 4, rx, ry, tours=1.07, depart=-30, rot=-2.5, graine=0.4, n=2.7)
    W = cx + rx * 1.1 + m
    return svg(W, 200, f'<g transform="translate(0 12)"><path d="{d1} {d2}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="{epais}" stroke-linecap="round"/></g>', fond)

def monogramme(encre='#000', trait='#1F4A2E', fond=None, epais=14, rayon=0):
    # Un « P » entouré : on entoure l'endroit. Boucle épaisse pour rester lisible en 16 px.
    S = 256
    _, b = place(B9, 'P', 132, 0, 0); w, h = b[2] - b[0], b[3] - b[1]
    d, b = place(B9, 'P', 132, (S - w) / 2 + 3, (S - h) / 2)
    L = boucle(S / 2, S / 2 + 2, 88, 92, tours=1.05, depart=-40, rot=-8, graine=2.0)
    f = f'<rect width="{S}" height="{S}" rx="{rayon}" fill="{fond}"/>' if fond else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">{f}<path d="{d}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="{epais}" stroke-linecap="round"/></svg>'

if __name__ == '__main__':
    import os; os.makedirs('out', exist_ok=True)
    V = {
      'logo-principal': principal(),
      'logo-principal-noir': principal('#E8EADB', '#C9E86A', '#000'),
      'logo-principal-pousse': principal('#000', '#1F4A2E', '#C9E86A'),
      'logo-horizontal': horizontal(),
      'logo-horizontal-noir': horizontal('#E8EADB', '#C9E86A', '#000'),
      'logo-site': horizontal(epais=8),
      'monogramme': monogramme(),
      'icone-app': monogramme('#E8EADB', '#C9E86A', '#000', 13, 56),
      'icone-app-pousse': monogramme('#000', '#1F4A2E', '#C9E86A', 13, 56),
      'favicon': monogramme('#000', '#1F4A2E', '#E8EADB', 20, 48),
    }
    for k, v in V.items(): open(f'out/{k}.svg', 'w').write(v)
    print(list(V))
