// Résultats de la vérification terrain (appel / mail à chaque ferme).
// Clé = id Agence Bio de l'opérateur.
//   statut "verifiee" : la ferme confirme produire ET vendre sur place → badge « Vérifiée Sur Place »
//   statut "exclue"   : pas de vente sur place, revendeur, ferme fermée… → masquée de la carte
// Champs libres : horaires, note, date de vérification.
export const VERIFICATIONS = {
  // 12345: { statut: 'verifiee', date: '2026-10-08', horaires: 'Mer. et sam. 9h-12h', note: 'Vente au hangar' },
  // 67890: { statut: 'exclue', date: '2026-10-08', note: 'Ne vend plus aux particuliers' },
};
