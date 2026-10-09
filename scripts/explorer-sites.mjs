// Exploration ponctuelle : comment AgriMap et Bon Plan Bio chargent leurs données.
// On ne publie que la structure (URL d'API, nombre d'éléments, noms de champs), jamais de coordonnées.
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
const SITES = [
  ['agrimap', 'https://agri-map.fr/bio/producteurs/'],
  ['bonplanbio', 'https://www.bonplanbio.fr/'],
  ['bonplanbio-carte', 'https://www.bonplanbio.fr/carte'],
];
const masque = v => typeof v === 'string' && /@|\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}[ .]?\d{2}/.test(v) ? '[masqué]' : v;
function forme(j) {
  const tab = Array.isArray(j) ? j : Object.values(j || {}).find(Array.isArray) || (j?.features) || null;
  const premier = tab && tab[0];
  const champs = premier && typeof premier === 'object' ? Object.keys(premier.properties || premier) : null;
  const ex = premier && typeof premier === 'object' ? Object.fromEntries(Object.entries(premier.properties || premier).slice(0, 40).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v)?.slice(0, 160) : masque(String(v)).slice(0, 160)])) : null;
  return { cles: j && typeof j === 'object' ? Object.keys(j).slice(0, 30) : null, n: tab ? tab.length : null, champs, exemple: ex };
}
const b = await chromium.launch();
const out = {};
for (const [nom, url] of SITES) {
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const req = [];
  p.on('response', async r => {
    const u = r.url(); const t = r.headers()['content-type'] || '';
    if (/\.(png|jpe?g|svg|woff2?|css|ico)(\?|$)|google|doubleclick|facebook|matomo|hotjar/.test(u)) return;
    const e = { u: u.slice(0, 300), s: r.status(), m: r.request().method(), post: (r.request().postData() || '').slice(0, 300), t: t.slice(0, 60) };
    if (/json|geo/.test(t) || /\.(geo)?json(\?|$)/.test(u)) { try { const j = await r.json(); e.forme = forme(j); } catch {} }
    req.push(e);
  });
  try { await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { req.push({ err: String(e).slice(0, 200) }); }
  await p.waitForTimeout(6000);
  // Cocher « vente directe » si présent, puis zoomer un peu
  for (const sel of ['text=/vente directe/i', 'text=/vente à la ferme/i']) { try { await p.locator(sel).first().click({ timeout: 3000 }); await p.waitForTimeout(4000); } catch {} }
  const liens = await p.$$eval('a', as => as.map(a => a.href).filter(h => /ferme|producteur|carte|map|vente/i.test(h)).slice(0, 40)).catch(() => []);
  out[nom] = { url, requetes: req, liens, titre: await p.title().catch(() => '') };
  await p.close();
}
await b.close();
await mkdir('rapports', { recursive: true });
await writeFile('rapports/exploration-sites.json', JSON.stringify(out, null, 1));
