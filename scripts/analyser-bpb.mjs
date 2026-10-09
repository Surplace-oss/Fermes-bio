// Analyse ponctuelle de la carte Bon Plan Bio (FNAB) : recoupement avec nos fermes, modes de vente.
// Publie uniquement des agrégats, la structure des champs et nos propres identifiants.
import { readFile, readdir, writeFile } from 'node:fs/promises';
const r = await fetch('https://www.bonplanbio.fr/api-v2/bpb/pois', { headers: { 'User-Agent': 'surplace.bio (+https://surplace.bio)' } });
const j = await r.json();
const prod = j.producers || [];
const masque = v => JSON.stringify(v, (k, x) => typeof x === 'string' && /@|(\d[ .]?){9,}/.test(x) ? '[masqué]' : x);
const structure = o => o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? `[${v.length}] ` + masque(v[0])?.slice(0, 400) : (typeof v === 'object' ? masque(v)?.slice(0, 400) : typeof v)])) : o;
const nos = {}; const parSiret = {};
for (const f of (await readdir('data/fermes')).filter(f => /^[0-9AB]{2,3}\.json$/.test(f)))
  for (const x of JSON.parse(await readFile(`data/fermes/${f}`, 'utf8')).fermes) { nos[x.numeroBio] = x; if (x.siret) parSiret[x.siret.slice(0, 9)] = x; }
const compte = (arr, f) => arr.reduce((m, x) => { for (const k of [].concat(f(x) ?? 'vide')) m[k] = (m[k] || 0) + 1; return m; }, {});
const rapport = {
  date: new Date().toISOString().slice(0, 10), nbProducteurs: prod.length, nbMagasins: (j.stores || []).length,
  champsProducteur: structure(prod[0]), exemplesDeliveries: prod.slice(0, 5).map(p => masque(p.deliveries)?.slice(0, 1200)),
  typesDeliveries: compte(prod, p => (p.deliveries || []).map(d => d.type || d.kind || d.mode || Object.keys(d).join('|'))),
  categories: compte(prod, p => (p.categories || []).map(c => c.name || c.label || c.slug || c)),
  labelTypes: compte(prod, p => p.label?.type), orgCodes: compte(prod, p => p.label?.orgCode),
};
const appariees = [];
for (const p of prod) {
  const x = nos[p.label?.id] || (p.siret && parSiret[String(p.siret).slice(0, 9)]) || (p.siren && parSiret[p.siren]);
  if (x) appariees.push({ id: x.id, numeroBio: x.numeroBio, cp: x.cp, modes: (p.deliveries || []).map(d => d.type || d.kind || d.mode || '?') });
}
rapport.appariesNumeroBio = appariees.length;
rapport.modesDesAppariees = compte(appariees, a => a.modes);
rapport.appariees = appariees;
await writeFile('rapports/bonplanbio.json', JSON.stringify(rapport, null, 1));
console.log(prod.length, appariees.length);
