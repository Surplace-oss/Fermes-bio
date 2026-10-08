// Style de fond de carte Sur Place — tuiles vectorielles OpenFreeMap (OpenStreetMap), sans clé.
// Palette de la charte : papier, forêt, pousse, encre.
(function () {
  const C = {
    papier: '#E8EADB',      // terre : le papier de la charte
    papier2: '#E0E4CC',     // zones bâties
    bati: '#D5DABF',
    prairie: '#E4E8CF',     // campagne, légèrement pousse
    bois: '#D6E0BA',        // bois et forêts : pousse adouci
    eau: '#B4CDBC',         // mers et lacs : gris-bleu d'origine, voilé de vert
    eauTrait: '#98B9A4',
    route: '#FFFFFF',
    bordRoute: '#C5CBAE',
    grandeRoute: '#F7F8EF',
    bordGrande: '#AEB993',
    rail: '#9AA284',
    limite: '#1F4A2E',
    texte: '#1F2A1F',
    texte2: '#4E5A47',
    foret: '#1F4A2E',
  };
  const z = (a, b) => ['interpolate', ['exponential', 1.5], ['zoom'], ...a.flatMap((v, i) => [b[i], v])];
  const classe = (...c) => ['in', ['get', 'class'], ['literal', c]];
  const NOTO = ['Noto Sans Regular'], NOTO_B = ['Noto Sans Bold'], NOTO_I = ['Noto Sans Italic'];

  window.styleSurPlace = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': C.papier } },
      { id: 'prairie', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: classe('grass', 'farmland'), paint: { 'fill-color': C.prairie, 'fill-opacity': 0.6 } },
      { id: 'bois', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: classe('wood', 'forest'), paint: { 'fill-color': C.bois, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 12, 0.85] } },
      { id: 'parcs', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': C.bois, 'fill-opacity': 0.6 } },
      { id: 'urbain', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: classe('residential', 'suburb', 'neighbourhood', 'commercial', 'industrial'), paint: { 'fill-color': C.papier2, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 13, 0.9] } },
      { id: 'eau', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.eau } },
      { id: 'cours-eau', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, paint: { 'line-color': C.eauTrait, 'line-width': z([0.6, 1.2, 3], [8, 12, 16]) } },
      { id: 'bati', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': C.bati, 'fill-outline-color': C.bordRoute } },

      { id: 'chemins', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 13, filter: classe('path', 'track'), paint: { 'line-color': C.bordGrande, 'line-width': 0.8, 'line-dasharray': [3, 2] } },
      { id: 'routes-bord', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: classe('minor', 'service', 'tertiary'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.bordRoute, 'line-width': z([1.4, 3, 12], [11, 14, 18]) } },
      { id: 'routes', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 11, filter: classe('minor', 'service', 'tertiary'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.route, 'line-width': z([0.6, 2, 10], [11, 14, 18]) } },
      { id: 'grandes-bord', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: classe('motorway', 'trunk', 'primary', 'secondary'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.bordGrande, 'line-width': z([0.6, 2.4, 5, 16], [6, 10, 13, 18]) } },
      { id: 'grandes', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 8, filter: classe('motorway', 'trunk', 'primary', 'secondary'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.grandeRoute, 'line-width': z([0.4, 1.4, 3.4, 13], [8, 10, 13, 18]) } },
      { id: 'autoroutes', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: classe('motorway'), layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#C9E86A', 'line-width': z([0.6, 1.6, 3.6, 13], [6, 10, 13, 18]) } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: classe('rail'), paint: { 'line-color': C.rail, 'line-width': 1, 'line-dasharray': [4, 3] } },
      { id: 'limites-dept', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 6], ['!=', ['get', 'maritime'], 1]], minzoom: 6, paint: { 'line-color': C.limite, 'line-width': 0.8, 'line-dasharray': [5, 4], 'line-opacity': 0.45 } },
      { id: 'limites-pays', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': C.limite, 'line-width': 1.6, 'line-opacity': 0.8 } },

      { id: 'nom-eau', type: 'symbol', source: 'omt', 'source-layer': 'water_name', minzoom: 9, layout: { 'text-field': ['get', 'name:fr'], 'text-font': NOTO_I, 'text-size': 12 }, paint: { 'text-color': C.foret, 'text-halo-color': C.eau, 'text-halo-width': 1.2 } },
      { id: 'nom-rue', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14, layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': NOTO, 'text-size': 11 }, paint: { 'text-color': C.texte2, 'text-halo-color': C.route, 'text-halo-width': 1.5 } },
      { id: 'hameaux', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 12, filter: classe('hamlet', 'isolated_dwelling', 'locality'), layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': NOTO, 'text-size': 11 }, paint: { 'text-color': C.texte2, 'text-halo-color': C.papier, 'text-halo-width': 1.4 } },
      { id: 'villages', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 10, filter: classe('village', 'suburb'), layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': NOTO, 'text-size': z([11, 14], [10, 15]) }, paint: { 'text-color': C.texte, 'text-halo-color': C.papier, 'text-halo-width': 1.5 } },
      { id: 'villes', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 6, filter: classe('town'), layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': NOTO_B, 'text-size': z([11, 16], [7, 13]) }, paint: { 'text-color': C.texte, 'text-halo-color': C.papier, 'text-halo-width': 1.6 } },
      { id: 'grandes-villes', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: classe('city'), layout: { 'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']], 'text-font': NOTO_B, 'text-size': z([12, 20], [5, 12]), 'text-transform': 'uppercase', 'text-letter-spacing': 0.06 }, paint: { 'text-color': C.foret, 'text-halo-color': C.papier, 'text-halo-width': 2 } },
    ],
  };
})();
