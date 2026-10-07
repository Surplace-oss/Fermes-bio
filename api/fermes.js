// GET /api/fermes?dept=34
// Renvoie les fermes bio d'un département qui produisent ET vendent aux particuliers,
// au format compact. Résultat mis en cache 24 h sur le CDN Vercel.
//
// Pagination Agence Bio (consigne du ministère) : paramètres `nb` (taille de page)
// et `debut` (position). Le total est donné par `nbTotal` sur la première page.
import { motifRejet, compacter } from './_filtre.js';
import { VERIFICATIONS } from './_verifications.js';

const BASE = 'https://opendata.agencebio.org/api/gouv/operateurs/';
const NB = 1000;
const DEPTS_VALIDES = /^(0[1-9]|1[0-9]|2[1-9]|2A|2B|[3-8][0-9]|9[0-5]|97[1-6])$/;

async function page(dept, debut) {
  const url = `${BASE}?departements=${dept}&nb=${NB}&debut=${debut}`;
  for (let essai = 0; essai < 3; essai++) {
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'surplace.bio (+https://surplace.bio)' } });
    if (r.ok) return r.json();
    await new Promise(res => setTimeout(res, 600 * (essai + 1)));
  }
  throw new Error(`Agence Bio indisponible (${dept}, debut=${debut})`);
}

export async function fermesDuDepartement(dept) {
  const premiere = await page(dept, 0);
  const total = parseInt(premiere.nbTotal, 10) || 0;
  const suivantes = [];
  for (let debut = NB; debut < total; debut += NB) suivantes.push(page(dept, debut));
  const pages = [premiere, ...(await Promise.all(suivantes))];

  const vus = new Set();
  const operateurs = [];
  for (const p of pages) for (const o of p.items || []) {
    if (!vus.has(o.id)) { vus.add(o.id); operateurs.push(o); }
  }

  const rejets = {};
  const fermes = [];
  for (const o of operateurs) {
    const verif = VERIFICATIONS[o.id];
    if (verif?.statut === 'exclue') { rejets.exclue_verification = (rejets.exclue_verification || 0) + 1; continue; }
    const motif = motifRejet(o);
    if (motif && verif?.statut !== 'verifiee') { rejets[motif] = (rejets[motif] || 0) + 1; continue; }
    const f = compacter(o, dept);
    if (verif?.statut === 'verifiee') Object.assign(f, { verifiee: true, horaires: verif.horaires || null, noteVerif: verif.note || null });
    fermes.push(f);
  }
  return { dept, totalAgenceBio: total, recuperes: operateurs.length, retenues: fermes.length, rejets, fermes };
}

export default async function handler(req, res) {
  const dept = String(req.query.dept || '').toUpperCase().padStart(2, '0');
  if (!DEPTS_VALIDES.test(dept)) return res.status(400).json({ erreur: 'Paramètre dept invalide (ex. ?dept=34)' });
  try {
    const data = await fermesDuDepartement(dept);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ ...data, genereLe: new Date().toISOString() });
  } catch (e) {
    console.error('[api/fermes]', dept, e);
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ erreur: e.message });
  }
}
