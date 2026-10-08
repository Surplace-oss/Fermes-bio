// Exploration ponctuelle : réponses brutes de l'API Recherche d'entreprises pour quelques fermes.
import { readFile, writeFile } from 'node:fs/promises';
const ids = [158303, 553, 104147, 155963, 46122, 12821, 34315];
const f75 = JSON.parse(await readFile('data/fermes/75.json', 'utf8')).fermes;
const f19 = JSON.parse(await readFile('data/fermes/19.json', 'utf8')).fermes;
const out = { opendata: [] };
// SIRET depuis l'open data Agence Bio
for (const d of ['75', '19']) {
  const r = await fetch(`https://opendata.agencebio.org/api/gouv/operateurs/?departements=${d}&nb=3&debut=0`, { headers: { 'User-Agent': 'surplace.bio' } });
  const j = await r.json(); out.opendata.push(...(j.items || []).map(o => ({ id: o.id, siret: o.siret, adresses: o.adressesOperateurs })));
}
const sirens = [...new Set(out.opendata.map(o => String(o.siret || '').slice(0, 9)).filter(Boolean))];
out.sirene = [];
for (const s of sirens) {
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${s}&page=1&per_page=1`, { headers: { 'User-Agent': 'surplace.bio' } });
  out.sirene.push({ s, status: r.status, body: await r.json().catch(() => null) });
  await new Promise(r => setTimeout(r, 300));
}
await writeFile('rapports/sirene-exemples.json', JSON.stringify(out, null, 1));
