/* js/app.js — unified popup, resilient stipend key */
(function () {
  // --------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains.geojson'; // or with_man_koku; both work
  const ICON_BASE   = 'imgs/';

  // If your GeoJSON uses different keys, map them here
  const FIELD = {
    name:    'name',
    prefect: 'prefecture',
    daimyo:  'daimyo',
    icon:    'icon',
    wiki:    'wikipedia',
    wikiUrl: 'wikipedia_url'
  };

  // --------- HELPERS ----------
  function getStipend(props) {
    // Accept either "stipend (Man Koku)" or "stipend"
    const raw = props['stipend (Man Koku)'] ?? props['stipend'];
    if (raw == null || raw === '') return null;

    // Coerce to number when possible (allow strings like "28")
    const n = Number(String(raw).replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) {
      return `${n} man-koku`;
    }
    // Fallback: show whatever text was provided
    return String(raw);
  }

  function buildWikiURL(props) {
    const explicit = props[FIELD.wikiUrl];
    if (typeof explicit === 'string' && /^https?:\/\//i.test(explicit)) return explicit;
    const raw = props[FIELD.wiki];
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const title = String(raw).replace(/\s*-\s*Wikipedia/i, '').trim();
    return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/\s+/g, '_'));
  }

  function popupHTML(props) {
    const name    = props[FIELD.name]    || '(unknown)';
    const prefect = props[FIELD.prefect] || '';
    const daimyo  = props[FIELD.daimyo]  || '';
    const stipend = getStipend(props);
    const wiki    = buildWikiURL(props);
    const icon    = props[FIELD.icon] ? `${ICON_BASE}${props[FIELD.icon]}` : null;

    const iconImg = icon ? `<img src="${icon}" alt="" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;border-radius:4px;">` : '';
    const lines = [];
    if (prefect) lines.push(`${prefect}`);
    if (daimyo)  lines.push(`Daimyo: ${daimyo}`);
    if (stipend) lines.push(`Stipend: ${stipend}`);

    const wikiLine = wiki ? `<div style="margin-top:6px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

    return `
      <div style="min-width:220px">
        <div style="font-weight:600;display:flex;align-items:center;">
          ${iconImg}<span>${name}</span>
        </div>
        <div style="margin-top:6px;line-height:1.3">${lines.join('<br>')}</div>
        ${wikiLine}
      </div>
    `;
  }

  function makeIcon(props) {
    const file = props[FIELD.icon];
    if (!file) return null;
    return L.icon({
      iconUrl: ICON_BASE + file,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
      className: 'crest-icon'
    });
  }

  // --------- MAP ----------
  const map = L.map('map', { preferCanvas: true }).setView([36.5, 137.7], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 45
  });
  map.addLayer(cluster);

  // --------- LOAD + RENDER ----------
  fetch(GEOJSON_URL + '?v=man-koku-safe')
    .then(r => r.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        pointToLayer: (feat, latlng) => {
          const props = feat.properties || {};
          const icon  = makeIcon(props);
          const marker = icon ? L.marker(latlng, { icon }) : L.marker(latlng);
          marker.bindPopup(popupHTML(props));
          return marker;
        }
      }).eachLayer(layer => cluster.addLayer(layer));

      try {
        const b = cluster.getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.1));
      } catch {}
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
