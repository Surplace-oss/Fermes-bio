// Vérifie chaque ferme dans le répertoire Sirene (API Recherche d'entreprises, data.gouv, sans clé)
// et retire de la carte ce qui n'est pas une exploitation en activité.
// Lancé après generer-donnees.mjs. Les réponses sont gardées en cache 30 jours (.cache/sirene.json,
// conservé entre deux nuits par actions/cache) pour ne pas réinterroger 28 000 entreprises chaque nuit.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';

const DOSSIER = new URL('../data/fermes/', import.meta.url);
const CACHE = new URL('../.cache/sirene.json', import.meta.url);
const RAPPORT = new URL('../rapports/sirene.json', import.meta.url);
const DUREE = 30 * 864e5;
const BUDGET_MS = +(process.env.SIRENE_BUDGET_MIN || 200) * 60e3; // on s'arrête avant le délai du job
const debut = Date.now();

let cache = {};
try { cache = JSON.parse(await readFile(CACHE, 'utf8')); } catch {}

// ── Ce qu'on garde de la réponse ─────────────────────────────────────────────
function resumer(siret, j) {
  // Uniquement l'entreprise dont le SIREN correspond : jamais un « résultat proche »
  const r = (j.results || []).find(x => x.siren === siret.slice(0, 9));
  if (!r) return { v: 2, introuvable: true };
  const etab = (r.matching_etablissements || []).find(e => e.siret === siret) || (r.siege?.siret === siret ? r.siege : null);
  return {
    v: 2, siren: r.siren,
    etat: r.etat_administratif, nature: r.nature_juridique, naf: r.activite_principale,
    asso: !!r.complements?.est_association, collectivite: !!r.complements?.collectivite_territoriale,
    etabEtat: etab?.etat_administratif || null, etabNaf: etab?.activite_principale || null,
  };
}

// ── Décision ─────────────────────────────────────────────────────────────────
// Prudence : on ne retire que ce qui est certain. Le reste est signalé pour vérification humaine.
//  - lycées agricoles (établissements publics d'enseignement) : souvent une boutique → signalés, pas retirés
//  - 68.20 (location de terres) ou conseil en activité principale : fréquent chez les agriculteurs → signalés
const HOLDING = /^(64\.2|64\.3|66\.)/;
function decider(s) {
  if (!s || s.introuvable || s.v !== 2) return null;
  if (s.etat === 'C') return { exclure: true, motif: 'entreprise_fermee' };
  if (/^7[12]/.test(s.nature || '') || s.collectivite) return { exclure: true, motif: 'collectivite_ou_etat' };
  if (HOLDING.test(s.naf || '') && !/^0[123]\./.test(s.etabNaf || '')) return { exclure: true, motif: 'holding_ou_finance' };
  if (/^7/.test(s.nature || '')) return { signal: 'etablissement_public' };
  if (/^(64|65|66|68|69|70|71|73|74|77|78|82)\./.test(s.naf || '') && !/^0[123]\./.test(s.etabNaf || '')) return { signal: 'activite_principale_non_agricole' };
  if (s.etabEtat === 'F') return { signal: 'etablissement_ferme' };
  if (/^(10|11|46|47|56)\./.test(s.naf || '')) return { signal: 'commerce_ou_transformation' };
  if (s.asso || /^92/.test(s.nature || '')) return { signal: 'association' };
  return null;
}

// ── Interrogation (≈ 6 requêtes / s, limite publique : 7) ────────────────────
const pause = ms => new Promise(r => setTimeout(r, ms));
async function interroger(siret) {
  for (let essai = 0; essai < 5; essai++) {
    const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&page=1&per_page=1`, { headers: { 'User-Agent': 'surplace.bio (+https://surplace.bio)' } }).catch(() => null);
    if (r && r.ok) return resumer(siret, await r.json());
    await pause(r && r.status === 429 ? 3000 * (essai + 1) : 1500);
  }
  return null;
}

const fichiers = (await readdir(DOSSIER)).filter(f => /^[0-9AB]{2,3}\.json$/.test(f));
const depts = {};
for (const f of fichiers) depts[f] = JSON.parse(await readFile(new URL(f, DOSSIER), 'utf8'));
const toutes = Object.values(depts).flatMap(d => d.fermes);
const aFaire = [...new Set(toutes.map(f => f.siret).filter(s => s && s.length === 14 && !(cache[s] && cache[s].v === 2 && Date.now() - cache[s].t < DUREE)))];
console.log(`${toutes.length} fermes, ${aFaire.length} SIRET à interroger`);

let faits = 0, arret = false;
async function travailleur() {
  while (aFaire.length && !arret) {
    if (Date.now() - debut > BUDGET_MS) { arret = true; break; }
    const s = aFaire.shift();
    const res = await interroger(s);
    if (res) cache[s] = { t: Date.now(), ...res };
    if (++faits % 1000 === 0) { console.log(faits, 'faits'); await sauverCache(); }
    await pause(450);
  }
}
async function sauverCache() { await mkdir(new URL('../.cache/', import.meta.url), { recursive: true }); await writeFile(CACHE, JSON.stringify(cache)); }
await Promise.all([travailleur(), travailleur(), travailleur()]);
await sauverCache();

// ── Application ──────────────────────────────────────────────────────────────
const rapport = { date: new Date().toISOString().slice(0, 10), verifiees: 0, sansSiret: 0, exclues: {}, signalees: {}, liste: [] };
for (const [f, d] of Object.entries(depts)) {
  const avant = d.fermes.length;
  d.fermes = d.fermes.filter(x => {
    if (!x.siret) { rapport.sansSiret++; return true; }
    const s = cache[x.siret]; if (!s) return true;
    rapport.verifiees++;
    const dec = decider(s); if (!dec) return true;
    if (dec.exclure) {
      rapport.exclues[dec.motif] = (rapport.exclues[dec.motif] || 0) + 1;
      rapport.liste.push({ id: x.id, nom: x.nom, cp: x.cp, ville: x.ville, decision: 'exclue', motif: dec.motif, naf: s.naf });
      return false;
    }
    rapport.signalees[dec.signal] = (rapport.signalees[dec.signal] || 0) + 1;
    rapport.liste.push({ id: x.id, nom: x.nom, cp: x.cp, ville: x.ville, decision: 'a_verifier', motif: dec.signal, naf: s.naf });
    return true;
  });
  if (d.fermes.length !== avant) await writeFile(new URL(f, DOSSIER), JSON.stringify(d));
}
// Index
try {
  const index = JSON.parse(await readFile(new URL('index.json', DOSSIER), 'utf8'));
  for (const [f, d] of Object.entries(depts)) { const k = f.replace('.json', ''); if (index.departements[k]) index.departements[k].retenues = d.fermes.length; }
  index.fermesRetenues = Object.values(index.departements).reduce((s, x) => s + x.retenues, 0);
  await writeFile(new URL('index.json', DOSSIER), JSON.stringify(index, null, 1));
} catch {}
rapport.restantAInterroger = aFaire.length;
await mkdir(new URL('../rapports/', import.meta.url), { recursive: true });
await writeFile(RAPPORT, JSON.stringify(rapport, null, 1));
console.log(JSON.stringify({ ...rapport, liste: rapport.liste.length }));
