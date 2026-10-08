// Résultats de la vérification terrain (appel / mail à chaque ferme).
// Clé = id Agence Bio de l'opérateur.
//   statut "verifiee" : la ferme confirme produire ET vendre sur place → badge « Vérifiée Sur Place »
//   statut "exclue"   : pas de vente sur place, revendeur, ferme fermée… → masquée de la carte
//   statut "maintenue": relue à la main, gardée malgré un signal automatique (ex. Sirene)
// Champs libres : horaires, note, date de vérification.
export const VERIFICATIONS = {
  158303: { statut: 'exclue', date: '2026-10-08', note: "French Bloom (Moët Hennessy) : marque de vin sans alcool, siège 32 rue Washington Paris 8e ; domaine de Tourreilles acheté fin 2025, pas de vente au public sur place annoncée." },
  38879: { statut: 'maintenue', date: '2026-10-08', note: "Agricultrice, société principale classée holding par l'Insee" },
  180: { statut: 'maintenue', date: '2026-10-08', note: "Domaine viticole municipal (régie), caveau possible" },
  60450: { statut: 'maintenue', date: '2026-10-08', note: "ESAT : vend souvent ses légumes" },
  42869: { statut: 'maintenue', date: '2026-10-08', note: "Vigneron en Champagne, holding familiale en activité principale" },
  57696: { statut: 'maintenue', date: '2026-10-08', note: "Espace test agricole : des maraîchers y vendent" },
  13675: { statut: 'maintenue', date: '2026-10-08', note: "Domaine, société classée finance par l'Insee : à vérifier" },
  49781: { statut: 'maintenue', date: '2026-10-08', note: "Jardins d'Entraygues : agriculteurs nommés, à vérifier" },
  98740: { statut: 'maintenue', date: '2026-10-08', note: "Agriculteur, société principale classée holding" },
  // 12345: { statut: 'verifiee', date: '2026-10-08', horaires: 'Mer. et sam. 9h-12h', note: 'Vente au hangar' },
  // 67890: { statut: 'exclue', date: '2026-10-08', note: 'Ne vend plus aux particuliers' },
};
