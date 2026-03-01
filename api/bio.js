export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { departement = '91', page = 1 } = req.query;

  try {
    // API publique data.gouv.fr - sans restriction
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=agriculture+biologique&departement=${departement}&page=${page}&per_page=25`;
    
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
      productions: [{ libelle: r.activite_principale_libelle || 'Agriculture biologique' }],
      activites: [{ libelle: 'Producteur bio' }],
      numeroBio: r.siren,
      siret: r.siege?.siret,
    }));

    res.status(200).json({ items, total: data.total_results });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
