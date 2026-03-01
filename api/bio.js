export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { departement = '91', page = 1 } = req.query;

  try {
    const url = `https://opendata.agencebio.org/api/gouv/operateurs/?departement=${departement}&page=${page}&limit=50&actif=true`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
