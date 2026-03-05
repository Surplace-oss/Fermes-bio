export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { departement = '91', page = 1 } = req.query;

  try {
    const url = `https://opendata.agencebio.org/api/gouv/operateurs/?departements=${departement}&page=${page}&limit=200`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();

    // Garder uniquement les producteurs qui vendent directement aux consommateurs
    const items = (data.items || []).filter(op => {
      const isProducteur = op.activites?.some(a => a.id === 1 || a.nom === 'Production');
      const venteDirecte = op.categories?.some(c => 
        c.nom === 'Vente aux consommateurs' || c.nom === 'Artisans/commerçants'
      );
      return isProducteur && venteDirecte;
    });

    res.status(200).json({ items, nbTotal: items.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
