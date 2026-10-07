# Famille de logos Sur Place — piste « La boucle » (Archivo condensé + boucle à la main)
from _outils_texte import texte, boucle
A9 = 'archivo-900-62'
NOIR, FORET, POUSSE, PAPIER = '#000', '#1F4A2E', '#C9E86A', '#E8EADB'

def place(s, size, x, y, track=0.0):
    _, w, b = texte(A9, s, size, 0, 0, track)
    d, w, b = texte(A9, s, size, x - b[0], y - b[1], track)
    return d, b

def svg(W, H, corps, fond=None, rayon=0):
    f = f'<rect width="{W:.0f}" height="{H:.0f}" rx="{rayon}" fill="{fond}"/>' if fond else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">{f}{corps}</svg>'

def principal(encre=NOIR, trait=FORET, fond=None, epais=6):
    # SUR au-dessus, PLACE dessous, la boucle entoure PLACE (comme le premier jet)
    m = 40; size = 170
    _, bP = place('PLACE', size, 0, 0, -0.015); wP, hP = bP[2] - bP[0], bP[3] - bP[1]
    dS, bS = place('SUR', size, m + 44, m, -0.015); hS = bS[3] - bS[1]
    dP, bP = place('PLACE', size, m + 44, m + hS + 0.26 * size, -0.015)
    cx, cy = (bP[0] + bP[2]) / 2, (bP[1] + bP[3]) / 2
    rx, ry = wP / 2 + 46, hP / 2 + 28
    L = boucle(cx + 4, cy + 6, rx, ry, tours=1.08, depart=-32, rot=-3, graine=1.1, n=2.6)
    W = cx + rx * 1.12 + m; H = bP[3] + m + 20
    return svg(W, H, f'<path d="{dS} {dP}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="{epais}" stroke-linecap="round"/>', fond)

def ligne(encre=NOIR, trait=FORET, fond=None, epais=9):
    # Version sur une ligne pour l'en-tête du site
    m = 20; size = 120
    dS, bS = place('SUR', size, m + 8, m + 18, -0.015)
    dP, bP = place('PLACE', size, bS[2] + 0.42 * size, m + 18, -0.015)
    cx, cy = (bP[0] + bP[2]) / 2, (bP[1] + bP[3]) / 2
    rx, ry = (bP[2] - bP[0]) / 2 + 32, (bP[3] - bP[1]) / 2 + 22
    L = boucle(cx + 1, cy + 4, rx, ry, tours=1.07, depart=-30, rot=-3, graine=0.4, n=2.6)
    W = cx + rx * 1.12 + m; H = bP[3] + m + 22
    return svg(W, H, f'<path d="{dS} {dP}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="{epais}" stroke-linecap="round"/>', fond)

def icone(encre=NOIR, trait=FORET, fond=POUSSE, epais=16, rayon=58):
    # « SP » entouré, sur fond vert pousse
    S = 256
    _, b = place('SP', 128, 0, 0, -0.01); w, h = b[2] - b[0], b[3] - b[1]
    d, b = place('SP', 128, (S - w) / 2, (S - h) / 2 + 2, -0.01)
    L = boucle(S / 2 + 1, S / 2 + 3, 93, 84, tours=1.06, depart=-38, rot=-7, graine=2.0, n=2.3)
    return svg(S, S, f'<path d="{d}" fill="{encre}"/><path d="{L}" fill="none" stroke="{trait}" stroke-width="{epais}" stroke-linecap="round"/>', fond, rayon)

if __name__ == '__main__':
    import os, shutil; shutil.rmtree('out2', ignore_errors=True); os.makedirs('out2')
    V = {
        'logo-principal': principal(),
        'logo-principal-pousse': principal(fond=POUSSE),
        'logo-principal-negatif': principal(PAPIER, POUSSE, NOIR),
        'logo-site': ligne(),
        'logo-ligne-negatif': ligne(PAPIER, POUSSE, NOIR, 6),
        'icone-app': icone(),
        'favicon': icone(epais=22, rayon=56),
    }
    for k, v in V.items(): open(f'out2/{k}.svg', 'w').write(v)
    print(list(V))
