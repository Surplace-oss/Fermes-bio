// Captures d'écran du site en production (pour les dossiers de présentation).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
await mkdir('rapports/captures', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const vues = [
  ['carte-perpignan', 'https://surplace.bio/carte.html?lat=42.6987&lng=2.8956&r=20&l=Perpignan', 1600, 1000],
  ['carte-prades', 'https://surplace.bio/carte.html?lat=42.6175&lng=2.4214&r=20&l=Prades', 1600, 1000],
  ['accueil', 'https://surplace.bio/', 1600, 1000],
  ['mobile', 'https://surplace.bio/carte.html?lat=42.6987&lng=2.8956&r=20&l=Perpignan', 430, 900],
];
for (const [n, u, w, h] of vues) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(u, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(7000);
  if (n === 'mobile') { await p.click('#bascule').catch(() => {}); await p.waitForTimeout(5000); }
  await p.screenshot({ path: `rapports/captures/${n}.png` });
  if (n === 'carte-perpignan') {
    await p.click('.ferme >> nth=1').catch(() => {}); await p.waitForTimeout(5000);
    await p.screenshot({ path: 'rapports/captures/fiche.png' });
  }
  await p.close();
}
await b.close();
