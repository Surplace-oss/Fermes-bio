export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lat, lng, rayon = 50 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Paramètres lat et lng requis' });
  }

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const rayonKm = parseFloat(rayon);

  // Calcul distance Haversine entre deux points GPS
  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  try {
    // Récupérer plusieurs pages pour avoir assez de données
    const pages = [1, 2, 3, 4, 5];
    const allItems = [];

    await Promise.all(pages.map(async (page) => {
      const url = `https://opendata.agencebio.org/api/gouv/operateurs/?page=${page}&limit=200`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        allItems.push(...(data.items || []));
      }
    }));

    // Filtrer : producteurs avec vente directe + coordonnées GPS + dans le rayon
    const items = allItems
      .filter(op => {
        const isProducteur = op.activites?.some(a => a.id === 1 || a.nom === 'Production');
        const venteDirecte = op.categories?.some(c =>
          c.nom === 'Vente aux consommateurs' || c.nom === 'Artisans/commerçants'
        );
        const adr = op.adressesOperateurs?.[0];
        const hasCoords = adr?.lat && adr?.long;
        return isProducteur && venteDirecte && hasCoords;
      })
      .map(op => {
        const adr = op.adressesOperateurs[0];
        const dist = distanceKm(centerLat, centerLng, adr.lat, adr.long);
        return { ...op, _distance: Math.round(dist * 10) / 10 };
      })
      .filter(op => op._distance <= rayonKm)
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 50);

    res.status(200).json({ items, nbTotal: items.length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
