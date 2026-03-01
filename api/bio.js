export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { departement = '91', page = 1 } = req.query;

  try {
    // On récupère beaucoup de résultats et on filtre par code postal
    const url = `https://opendata.agencebio.org/api/gouv/operateurs/?page=${page}&limit=500`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    
    // Filtrer par département (les 2 premiers chiffres du code postal)
    const items = (data.items || []).filter(op => {
      return op.adressesOperateurs?.some(adr => 
        adr.codePostal?.startsWith(departement)
      );
    });

    res.status(200).json({ items, nbTotal: items.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
