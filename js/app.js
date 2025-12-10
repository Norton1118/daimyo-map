/* js/app.js — with NOTES and better title fallback */
(function () {
  // --------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains.geojson';
  const ICON_BASE   = 'imgs/';

  // If your GeoJSON keys differ, map them here:
  const FIELD = {
    name:      'name',          // Han Name (may be blank for shogunate lands)
    country:   'country',       // Country (region group) — used as fallback title
    prefect:   'prefecture',    // Current Prefecture
    daimyo:    'daimyo',        // Daimyo Family Name
    stipend:   'stipend',       // Stipend (Koku)
    notes:     'notes',         // Shogunate Land / Territory … (column F)
    icon:      'icon',          // Mon (Crest) filename
    wikiRaw:   'wikipedia',     // original sheet text or URL
    wikiUrl:   'wikipedia_url'  // explicit URL if present
  };

  // --------- HELPERS ----------
  function buildWikiURL(props) {
    const explicit = props[FIELD.wikiUrl];
    if (typeof explicit === 'string' && /^https?:\/\//i.test(explicit)) return explicit;

    const raw = props[FIELD.wikiRaw];
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;

    const title = String(raw).replace(/\s*-\s*Wikipedia/i, '').trim();
    return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/\s+/g, '_'));
  }

  function popupHTML(props) {
    // Title: use Han Name; if blank, fall back to Country (region group)
    const title    = props[FIELD.name] || props[FIELD.country] || '(unknown)';
    const prefect  = props[FIELD.prefect] || '';
    const notes    = props[FIELD.notes] || '';   // <— NEW: shows “Shogunate Land …”
    const daimyo   = props[FIELD.daimyo] || '';
    const stipend  = props[FIELD.stipend] || '';
    const wiki     = buildWikiURL(props);
    const iconPath = props[FIELD.icon] ? `${ICON_BASE}${props[FIELD.icon]}` : null;

    const iconImg = iconPath
      ? `<img src="${iconPath}" alt="" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;border-radius:4px;">`
      : '';

    const lines = [];
    if (notes)   lines.push(`${notes}`);                // shown first after the title
    if (prefect) lines.push(`${prefect}`);
    if (daimyo)  lines.push(`Daimyo: ${daimyo}`);
    if (stipend) lines.push(`Stipend: ${stipend}`);

    const wikiLine = wiki
      ? `<div style="margin-top:6px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>`
      : '';

    return `
      <div style="min-width:240px">
        <div style="font-weight:600;display:flex;align-items:center;">
          ${iconImg}<span>${title}</span>
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
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 45
  });
  map.addLayer(cluster);

  // --------- LOAD + RENDER ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geojson => {
      L.geoJSON(geojson, {
        pointToLayer: (feat, latlng) => {
          const props = feat.properties || {};
          const icon  = makeIcon(props);
          const m = icon ? L.marker(latlng, { icon }) : L.marker(latlng);
          m.bindPopup(popupHTML(props));
          return m;
        }
      }).eachLayer(layer => cluster.addLayer(layer));

      try {
        const b = cluster.getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.1));
      } catch {}
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
