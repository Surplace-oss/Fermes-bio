export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lat, lng, rayon = 50 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat et lng requis' });

  const centerLat = parseFloat(lat);
  const centerLng = parseFloat(lng);
  const rayonKm = parseFloat(rayon);

  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Coordonnées centrales de chaque département
  const DEPTS = [
    ['01',46.20,5.23],['02',49.55,3.62],['03',46.34,3.30],['04',44.08,6.24],['05',44.66,6.35],
    ['06',43.93,7.11],['07',44.72,4.53],['08',49.69,4.70],['09',42.96,1.60],['10',48.32,4.07],
    ['11',43.20,2.35],['12',44.35,2.57],['13',43.53,5.44],['14',49.09,-0.36],['15',45.05,2.63],
    ['16',45.70,0.16],['17',45.75,-0.67],['18',47.08,2.40],['19',45.37,1.88],['21',47.32,4.83],
    ['22',48.46,-2.76],['23',46.10,2.04],['24',45.15,0.72],['25',47.24,6.02],['26',44.72,5.05],
    ['27',49.07,1.17],['28',48.44,1.49],['29',48.24,-4.02],['30',44.01,4.17],['31',43.60,1.44],
    ['32',43.64,0.59],['33',44.84,-0.58],['34',43.61,3.88],['35',48.10,-1.68],['36',46.81,1.69],
    ['37',47.39,0.69],['38',45.19,5.72],['39',46.67,5.55],['40',43.89,-0.50],['41',47.59,1.34],
    ['42',45.52,4.07],['43',45.04,3.88],['44',47.37,-1.85],['45',47.91,2.16],['46',44.66,1.74],
    ['47',44.35,0.46],['48',44.50,3.50],['49',47.37,-0.55],['50',49.12,-1.33],['51',49.05,4.37],
    ['52',48.11,5.14],['53',48.07,-0.77],['54',48.69,6.18],['55',48.98,5.38],['56',47.85,-2.76],
    ['57',49.12,6.77],['58',47.06,3.66],['59',50.52,3.08],['60',49.41,2.34],['61',48.56,0.09],
    ['62',50.52,2.64],['63',45.77,3.08],['64',43.30,-0.37],['65',43.23,0.08],['66',42.70,2.55],
    ['67',48.58,7.75],['68',47.83,7.29],['69',45.76,4.84],['70',47.63,6.15],['71',46.67,4.51],
    ['72',47.99,0.19],['73',45.57,6.39],['74',46.01,6.27],['75',48.86,2.35],['76',49.44,1.10],
    ['77',48.73,2.98],['78',48.80,1.85],['79',46.65,-0.37],['80',49.92,2.30],['81',43.93,2.15],
    ['82',44.02,1.35],['83',43.46,6.26],['84',43.95,5.09],['85',46.67,-1.43],['86',46.58,0.34],
    ['87',45.84,1.26],['88',48.17,6.42],['89',47.80,3.57],['90',47.63,6.85],['91',48.63,2.25],
    ['92',48.85,2.25],['93',48.92,2.48],['94',48.79,2.47],['95',49.07,2.10]
  ];

  try {
    // Départements dans le rayon (+ marge de 30km)
    const deptsProches = DEPTS
      .filter(([, dLat, dLng]) => distanceKm(centerLat, centerLng, dLat, dLng) <= rayonKm + 30)
      .map(([code]) => code);

    const depts = deptsProches.join(',');

    // Récupérer page par page séquentiellement (évite timeout)
    const allItems = [];
    let page = 1;

    while (page <= 8) {
      const url = `https://opendata.agencebio.org/api/gouv/operateurs/?departements=${depts}&page=${page}&limit=200`;
      const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) break;
      const data = await response.json();
      const items = data.items || [];
      allItems.push(...items);
      if (items.length < 200) break; // dernière page
      page++;
    }

    // Filtrer : producteur + vente directe + coordonnées + dans le rayon
    const items = allItems
      .filter(op => {
        const isProducteur = op.activites?.some(a => a.id === 1 || a.nom === 'Production');
        const venteDirecte = op.categories?.some(c =>
          c.nom === 'Vente aux consommateurs' || c.nom === 'Artisans/commerçants'
        );
        const adr = op.adressesOperateurs?.[0];
        return isProducteur && venteDirecte && adr?.lat && adr?.long;
      })
      .map(op => {
        const adr = op.adressesOperateurs[0];
        const dist = distanceKm(centerLat, centerLng, adr.lat, adr.long);
        return { ...op, _distance: Math.round(dist * 10) / 10 };
      })
      .filter(op => op._distance <= rayonKm)
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 50);

    res.status(200).json({ items, nbTotal: items.length, depts: deptsProches });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
