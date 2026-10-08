import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const vues = [
  ['france', '/carte.html', 1400, 900],
  ['gignac', '/carte.html?lat=43.6539&lng=3.5490&r=20&l=Gignac', 1400, 900],
  ['tulle', '/carte.html?lat=45.2667&lng=1.7667&r=10&l=Tulle', 1400, 900],
  ['mobile', '/carte.html?lat=47.2184&lng=-1.5536&r=20&l=Nantes', 390, 800],
  ['tampon', '/index.html', 1300, 900],
];
for (const [n, u, w, h] of vues) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:8080' + u, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(5000);
  if (n === 'mobile') { await p.click('#bascule').catch(() => {}); await p.waitForTimeout(4000); }
  if (n === 'tampon') { const t = p.locator('.tampon').first(); await t.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await t.screenshot({ path: `out/${n}.png` }); continue; }
  await p.screenshot({ path: `out/${n}.png` });
}
await b.close();
