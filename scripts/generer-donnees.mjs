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
async function travailleur() {
  while (file.length) {
    const d = file.shift();
    try {
      const r = await fermesDuDepartement(d);
      // Tri stable pour que le fichier ne change que si les données changent
      r.fermes.sort((a, b) => a.id - b.id);
      await writeFile(new URL(`${d}.json`, DOSSIER), JSON.stringify({ dept: d, fermes: r.fermes }));
      index.departements[d] = { totalAgenceBio: r.totalAgenceBio, retenues: r.retenues };
      console.log(d, r.totalAgenceBio, '→', r.retenues);
    } catch (e) {
      // On garde le fichier de la veille s'il existe
      erreurs.push(d); console.error('ÉCHEC', d, e.message);
    }
  }
}
await Promise.all(Array.from({ length: PARALLELE }, travailleur));

const total = Object.values(index.departements).reduce((s, x) => s + x.retenues, 0);
index.fermesRetenues = total;
index.misAJour = new Date().toISOString().slice(0, 10);
await writeFile(new URL('index.json', DOSSIER), JSON.stringify(index, null, 1));
console.log(`Total : ${total} fermes. Échecs : ${erreurs.join(', ') || 'aucun'}`);
if (erreurs.length > 10) process.exit(1);
