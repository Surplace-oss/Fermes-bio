// Génère data/fermes/<dept>.json pour tous les départements métropolitains.
// Lancé chaque nuit par .github/workflows/donnees.yml : la carte lit ensuite ces
// fichiers statiques (instantané, servis par le CDN), avec repli sur /api/fermes.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fermesDuDepartement } from '../api/fermes.js';

const DEPTS = [
  ...Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, '0')),
  '2A', '2B',
  ...Array.from({ length: 95 - 20 }, (_, i) => String(i + 21)),
];
const DOSSIER = new URL('../data/fermes/', import.meta.url);
const PARALLELE = 4;

await mkdir(DOSSIER, { recursive: true });
let index = { departements: {} };
try { index = JSON.parse(await readFile(new URL('index.json', DOSSIER), 'utf8')); } catch {}

const file = [...DEPTS];
const erreurs = [];
const resultats = {};
async function travailleur() {
  while (file.length) {
    const d = file.shift();
    try {
      const r = await fermesDuDepartement(d);
      resultats[d] = r;
      console.log(d, r.totalAgenceBio, '→', r.retenues);
    } catch (e) {
      // On garde le fichier de la veille s'il existe
      erreurs.push(d); console.error('ÉCHEC', d, e.message);
    }
  }
}
await Promise.all(Array.from({ length: PARALLELE }, travailleur));

// Chaque ferme va dans le fichier du département où elle se trouve réellement
// (une ferme de l'Aude dont le siège est à Paris est rangée dans l'Aude), sans doublon.
const deptDe = cp => {
  cp = String(cp || '');
  if (/^20/.test(cp)) return +cp < 20200 ? '2A' : '2B';
  return cp.slice(0, 2);
};
const paquets = Object.fromEntries(Object.keys(resultats).map(d => [d, new Map()]));
for (const [d, r] of Object.entries(resultats)) {
  for (const f of r.fermes) {
    const cible = paquets[deptDe(f.cp)] ? deptDe(f.cp) : d;
    paquets[cible].set(f.id, f);
  }
}
for (const [d, m] of Object.entries(paquets)) {
  const fermes = [...m.values()].sort((a, b) => a.id - b.id); // tri stable : le fichier ne change que si les données changent
  await writeFile(new URL(`${d}.json`, DOSSIER), JSON.stringify({ dept: d, fermes }));
  index.departements[d] = { totalAgenceBio: resultats[d].totalAgenceBio, retenues: fermes.length };
}

const total = Object.values(index.departements).reduce((s, x) => s + x.retenues, 0);
index.fermesRetenues = total;
index.misAJour = new Date().toISOString().slice(0, 10);
await writeFile(new URL('index.json', DOSSIER), JSON.stringify(index, null, 1));
console.log(`Total : ${total} fermes. Échecs : ${erreurs.join(', ') || 'aucun'}`);
if (erreurs.length > 10) process.exit(1);
