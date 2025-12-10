/* js/app.js — main map with clustering (mk-2) */
(function () {
  // ---------- CONFIG ----------
  const VERSION     = 'mk-2';
  const GEOJSON_URL = `data/daimyo_domains.geojson?v=${VERSION}`;
  const ICON_BASE   = 'img/mon/';    // where crest PNGs live
  const ICON_SIZE   = 44;            // marker icon size

  // ---------- MAP ----------
  const map = L.map('map', {
    minZoom: 4,
    maxZoom: 19,
    zoomSnap: 0.25,
    zoomDelta: 0.5
  }).setView([36.4, 138.0], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    disableClusteringAtZoom: 10,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 50
  });
  map.addLayer(cluster);

  // ---------- HELPERS ----------
  function getNotes(p) {
    const candidates = [
      'notes',
      'Shogunate Land, Branch Han, Notes',
      'shogunate',
      'shogunate_notes',
      'description'
    ];
    for (const k of candidates) {
      const v = p && p[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  function popupHTML(p) {
    const title =
      (p.han && p.han.trim()) ||
      (p.name && p.name.trim()) ||
      p.country ||
      'Han';

    const lines = [];
    if (p.prefecture) lines.push(p.prefecture);
    if (p.daimyo)     lines.push(`Daimyo: ${p.daimyo}`);
    if (p.stipend)    lines.push(`Stipend: ${p.stipend} (Man-koku)`);

    const notes = getNotes(p);
    if (notes)       lines.push(notes);

    const wikiHtml = p.wikipedia_url
      ? `<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`
      : (p.wikipedia ? L.Util.escapeHTML(p.wikipedia) : '');

    return [
      `<div class="popup">`,
      `  <div class="popup-title">`,
      p.icon ? `<img class="popup-mon" src="${ICON_BASE}${p.icon}" alt="" />` : '',
      `    <span>${L.Util.escapeHTML(title)}</span>`,
      `  </div>`,
      ...lines.map(t => `  <div>${L.Util.escapeHTML(t)}</div>`),
      wikiHtml ? `  <div>${wikiHtml}</div>` : '',
      `</div>`
    ].join('\n');
  }

  function monIcon(p) {
    const url = p.icon ? `${ICON_BASE}${p.icon}` : null;
    return L.icon({
      iconUrl: url || undefined,
      iconSize: [ICON_SIZE, ICON_SIZE],
      iconAnchor: [ICON_SIZE/2, ICON_SIZE/2],
      popupAnchor: [0, -ICON_SIZE/2],
      className: url ? '' : 'blank-icon'
    });
  }

  // ---------- LOAD + RENDER ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(fc => {
      L.geoJSON(fc, {
        pointToLayer: (feat, latlng) => {
          const p = feat.properties || {};
          const m = L.marker(latlng, { icon: monIcon(p), title: p.han || p.name || p.country || '' });
          m.bindPopup(popupHTML(p));
          return m;
        }
      }).addTo(cluster);
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
