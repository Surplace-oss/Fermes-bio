// Extraction ponctuelle (diagnostic interne) : opérateurs Agence Bio bruts de quelques
// départements, avec le motif de rejet du filtre. La sortie est chiffrée avant commit
// (clé publique scripts/cles/rapport-public.pem) : rien de lisible n'est publié.
import { writeFile } from 'node:fs/promises';
import { motifRejet, adresseActivite } from '../api/_filtre.js';
const BASE = 'https://opendata.agencebio.org/api/gouv/operateurs/';
const UA = { Accept: 'application/json', 'User-Agent': 'surplace.bio (+https://surplace.bio)' };
async function get(u) { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); await new Promise(s => setTimeout(s, 1000 * (i + 1))); } throw new Error(u); }
const out = [];
for (const d of (process.env.DEPTS || '66,11,09').split(',')) {
  const p0 = await get(`${BASE}?departements=${d}&nb=1000&debut=0`);
  const tot = +p0.nbTotal || 0; const pages = [p0];
  for (let k = 1000; k < tot; k += 1000) pages.push(await get(`${BASE}?departements=${d}&nb=1000&debut=${k}`));
  for (const p of pages) for (const o of p.items || []) {
    let adr = null; try { adr = adresseActivite(o); } catch {}
    out.push({ _dept: d, motif: motifRejet(o), adr: adr && { cp: adr.codePostal, ville: adr.ville }, ...o });
  }
  console.log(d, tot);
}
await writeFile('/tmp/dump.json', JSON.stringify(out));
