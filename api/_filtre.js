// ─────────────────────────────────────────────────────────────────────────────
// FILTRE « VRAIE FERME EN VENTE DIRECTE » — Sur Place
//
// Établi sur ~25 000 opérateurs réels (10 départements, octobre 2026).
// L'ancien filtre (venteParticuliers seul) laissait passer des Carrefour,
// Intermarché, Biocoop… et ~1 600 opérateurs qui ne sont plus certifiés.
//
// Une fiche est retenue si TOUTES les conditions sont vraies :
//   1. Activité « Production » (id 1) déclarée            → c'est un producteur
//   2. Au moins un certificat à l'état ENGAGEE            → bio en cours de validité
//   3. Vend aux consommateurs (catégorie 1 ou venteParticuliers)
//   4. Une adresse active géolocalisée
//   5. Aucune activité annuaire de commerce (GMS, supérette, gros, épicerie…)
//   6. Pas d'enseigne / de réseau commercial (Biocoop, Carrefour…)
//   7. Une activité agricole (annuaire 1-35) ou un code NAF agricole (01/02/03)
// ─────────────────────────────────────────────────────────────────────────────

// Activités annuaire Agence Bio 1 → 35 = métiers agricoles (maraîchage,
// élevage, viticulture, apiculture, arboriculture, cueillette…)
const ANNUAIRE_AGRICOLE = new Set(Array.from({ length: 35 }, (_, i) => i + 1));

// Activités annuaire de commerce qui excluent la fiche
// 45 magasin bio, 46 grande surface, 48 proxi, 49 épicerie, 50 thés/cafés,
// 51 primeur, 52 cosmétiques, 59 jardinerie, 60+ commerce de gros & services
const ANNUAIRE_COMMERCE = new Set([45, 46, 48, 49, 50, 51, 52, 59]);
const estCommerceGros = id => id >= 60;

// Codes NAF clairement non agricoles
const NAF_EXCLUS = ['46', '47', '56', '10', '11', '20', '72'];

const ENSEIGNES = /carrefour|leclerc|lidl|aldi|monoprix|franprix|intermarch|auchan|casino|\bsuper ?u\b|\bhyper ?u\b|biocoop|naturalia|la vie claire|bio ?c'? ?bon|picard|netto|\bspar\b|vival|\bcora\b|\bmatch\b|\bg20\b|grand frais|\bmetro\b|promocash|nature ?o|l.?eau vive|satoriz|botanic|truffaut|clarins/i;

// Collectivités, administrations, prisons : produisent pour leurs cantines ou en régie, pas de vente à la ferme.
// (Les domaines viticoles municipaux, qui ont souvent un caveau, ne sont pas visés.)
const COLLECTIVITES = /p[ée]nitenc|p[ée]nitenti|\bprison\b|maison d'arr[êe]t|centre de d[ée]tention|\bmairie\b|\bville d[e'’]|^commune\b|\bcommune d[e'’u]|conseil (d[ée]partemental|r[ée]gional)|communaut[ée] (de communes|urbaine|d'agglom[ée]ration)|\bagglom[ée]ration\b|\bm[ée]tropole\b|\bepci\b|\bsivom\b|\bsivu\b|\bccas\b/i;
// Marques et laboratoires (cosmétique, pharmacie, boissons) : cultures pour l'industrie, pas d'accueil du public.
const MARQUES = /yves rocher|pierre fabre|\bsothys\b|french bloom|\blaboratoires?\b/i;

const ids = (o, k) => new Set((o[k] || []).map(x => x && x.id));

export function estEngage(o) {
  return (o.certificats || []).some(c => c.etatCertification === 'ENGAGEE');
}

// Adresse où se trouve réellement la ferme.
// Les opérateurs déclarent souvent un siège social (parfois à Paris, chez un comptable, au domicile
// d'un associé) distinct du lieu d'activité. On prend d'abord un lieu d'activité qui n'est PAS le siège.
const libelles = a => (a.typeAdresseOperateurs || []).map(t => typeof t === 'string' ? t : (t && (t.label || t.nom || t.libelle)) || '');
const estActivite = a => libelles(a).some(t => /^a$|activit/i.test(t));
const estSiege = a => libelles(a).some(t => /^s$|si[eè]ge/i.test(t));
export function adresseActivite(o, dept) {
  const adrs = (o.adressesOperateurs || []).filter(a => a && a.active !== false && a.lat && a.long);
  if (!adrs.length) return null;
  const dansDept = a => !dept || String(a.codePostal || '').startsWith(dept === '2A' || dept === '2B' ? '20' : dept);
  const rangs = [a => estActivite(a) && !estSiege(a), estActivite, a => !estSiege(a), () => true];
  for (const r of rangs) {
    const c = adrs.filter(r);
    if (c.length) return c.find(dansDept) || c[0];
  }
  return adrs[0];
}

// Paris intra-muros : seules des productions urbaines sont plausibles (maraîchage, champignons,
// plantes, miel, fleurs, plants). Vigne, olives, grandes cultures à une adresse parisienne = un siège.
const PARIS_IMPOSSIBLE = /raisin de cuve|vins? de raisin|olive|tournesol|truffe|bl[ée] |c[ée]r[ée]al|colza|lavandin|bovin|ovin|prairie/i;

export function motifRejet(o) {
  const naf = String(o.codeNAF || '');
  const act = ids(o, 'activites');
  const cat = ids(o, 'categories');
  const ann = ids(o, 'annuaireActivites');
  const nom = o.denominationcourante || o.raisonSociale || '';

  if (!act.has(1)) return 'pas_production';
  if (!estEngage(o)) return 'non_certifie';
  if (!(cat.has(1) || o.venteAnnuaire?.venteParticuliers === true)) return 'pas_vente_particuliers';
  const adr = adresseActivite(o);
  if (!adr) return 'pas_gps';
  if (String(adr.codePostal || '').startsWith('75') && PARIS_IMPOSSIBLE.test((o.productions || []).map(p => p.nom).join(' | '))) return 'siege_paris';
  if ([...ann].some(id => ANNUAIRE_COMMERCE.has(id) || estCommerceGros(id))) return 'commerce';
  if (o.reseau && !/^autre$/i.test(o.reseau.trim())) return 'reseau_commercial';
  if (ENSEIGNES.test(nom)) return 'enseigne';
  if (COLLECTIVITES.test(nom) && !/domaine/i.test(nom)) return 'collectivite';
  if (MARQUES.test(nom)) return 'marque_industrielle';
  const agricoleAnnuaire = [...ann].some(id => ANNUAIRE_AGRICOLE.has(id));
  if (NAF_EXCLUS.includes(naf.slice(0, 2)) && !agricoleAnnuaire) return 'naf_non_agricole';
  if (['20', '72'].includes(naf.slice(0, 2))) return 'naf_non_agricole';
  if (!agricoleAnnuaire && !/^0[123]/.test(naf)) return 'pas_agricole';
  return null;
}

// Niveau de confiance affiché sur la fiche
//   A = code NAF agricole + déclare explicitement « Vente aux consommateurs »
//   B = critères remplis mais un signal plus faible
export function niveau(o) {
  const naf = String(o.codeNAF || '');
  return /^0[123]/.test(naf) && ids(o, 'categories').has(1) ? 'A' : 'B';
}

const propre = s => (s || '').replace(/\s+/g, ' ').trim();

// Familles de produits lisibles pour le public (déduites des métiers + productions)
const FAMILLES = [
  ['legumes', /l[ée]gum|pommes? de terre|salade|tomate|courge|mara[iî]ch|champignon|cresson|\bail\b|oignon|carotte/i],
  ['fruits', /fruit|pommes? de table|poire|abricot|cerise|p[êe]che|prune|fraise|baie|cassis|myrtille|figue|noix|noisette|ch[âa]taigne|agrume|kiwi|amande|raisin de table|melon|framboise|arboricult/i],
  ['vin', /\bvins?\b|vigne|raisin de cuve|viticult|cidre|poir[ée]\b|spiritueux/i],
  ['viande', /viande|bovins viande|brebis viande|porcins|volaille de chair|charcut|poulets? de chair|canard|lapin/i],
  ['laitier', /lait|fromage|yaourt|beurre|cr[èe]me|brebis laiti|bovins laiti|ch[èe]vre/i],
  ['oeufs', /œuf|\boeufs?\b|poules pondeuses/i],
  ['miel', /miel|apicult|pollen|propolis|gel[ée]e royale/i],
  ['cereales', /\bbl[ée]s?\b|farine|pain|c[ée]r[ée]al|orge|seigle|[ée]peautre|avoine|\bma[iï]s\b|\briz\b|lentille|pois chiche|sarrasin|quinoa|l[ée]gumineuse/i],
  ['plantes', /aromatique|ppam|thym|romarin|lavand|huiles? essentielle|tisane|[ée]pice|safran|plantes? à parfum|m[ée]dicinal|sauge|menthe|verveine/i],
  ['huile', /olive|ol[ée]icult|huile (de|d')/i],
  ['mer', /hu[iî]tre|ostr[ée]i|moule|mytil|piscicult|truite|aquacult|algue|poisson/i],
  ['plants', /p[ée]pini[èe]re|plants? |fleurs?|semencier|semences/i],
];

// Lignes de la nomenclature PAC qui n'intéressent pas le public
const PRODUIT_BRUIT = /prairie|gel |gel,|jach[èe]re|parcours|surface|estive|alpage|bois p[âa]tur|bordure|fourrag|luzerne|sainfoin|tr[èe]fle|culture inconnue|n\.c\.a|b[ée]lier|bouc|taureau|g[ée]nisse|veaux|agnelle|renouvellement|arbres forestiers|m[ée]lange|ruches|vaches allaitantes|vaches laiti|reproducteur|m[âa]les|femelles|friche|non productive|autres produits alimentaires/i;

function telephone(o) {
  return propre(o.telephoneCommerciale || o.telephone || o.telephoneNational || '') || null;
}

export function compacter(o, dept) {
  const a = adresseActivite(o, dept);
  const metiers = (o.annuaireActivites || [])
    .filter(x => ANNUAIRE_AGRICOLE.has(x.id)).map(x => x.nom);
  const brutes = [...new Set((o.productions || []).map(p => propre(p.nom)).filter(Boolean))];
  const productions = brutes.filter(p => !PRODUIT_BRUIT.test(p)).slice(0, 10);
  const texte = [...metiers, ...brutes].join(' | ');
  const familles = FAMILLES.filter(([, re]) => re.test(texte)).map(([k]) => k);
  const certif = (o.certificats || []).find(c => c.etatCertification === 'ENGAGEE') || {};
  const site = (o.siteWebs || []).map(s => s.url || s).find(u => typeof u === 'string' && u.length > 4) || null;
  return {
    id: o.id,
    nom: propre(o.denominationcourante || o.raisonSociale),
    gerant: propre(o.gerant) || null,
    adresse: propre(a.lieu),
    cp: a.codePostal,
    ville: propre(a.ville),
    lat: a.lat,
    lng: a.long,
    metiers,
    familles,
    productions,
    tel: telephone(o),
    site,
    numeroBio: o.numeroBio,
    siret: o.siret ? String(o.siret).replace(/\D/g, '') || null : null,
    certificateur: certif.organisme || null,
    certifUrl: certif.url || null,
    bioDepuis: o.datePremierEngagement || null,
    vend: {
      particuliers: !!o.venteAnnuaire?.venteParticuliers,
      restauration: !!(o.venteAnnuaire?.venteRestauCollective || o.venteAnnuaire?.venteRestauCommerciale),
      magasins: !!o.venteAnnuaire?.venteProsDetail,
    },
    niveau: niveau(o),
    maj: o.dateMaj || null,
  };
}
