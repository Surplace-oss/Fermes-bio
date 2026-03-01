export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { departement = '91', page = 1 } = req.query;

  try {
    // Codes NAF agriculture : 01.11 à 01.64 + 01.70
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=&departement=${departement}&activite_principale=01.13,01.19,01.21,01.22,01.23,01.24,01.25,01.26,01.28,01.29,01.41,01.42,01.43,01.44,01.45,01.46,01.47,01.49,01.50,01.61,01.62,01.63,01.64,01.70&page=${page}&per_page=25&etat_administratif=A`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();

    const items = (data.results || []).map(r => ({
      id: r.siren,
      denominationCourante: r.nom_complet || r.nom_raison_sociale,
      adressesOperateurs: [{
        adresse: r.siege?.adresse || '',
        codePostal: r.siege?.code_postal || '',
        ville: r.siege?.commune || '',
        lat: r.siege?.latitude,
        lng: r.siege?.longitude,
      }],
      productions: [{ libelle: r.activite_principale_libelle || 'Agriculture' }],
      activites: [{ libelle: 'Producteur' }],
      numeroBio: r.siren,
      siret: r.siege?.siret,
    }));

    res.status(200).json({ items, total: data.total_results });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
