/* js/app.js — main (no region filter) */

(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains.geojson?v=mk3';
  const ICON_BASE   = 'icons/';

  // ---------- Small utils ----------
  const esc = (s) =>
    (s == null ? '' : String(s))
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function popupHTML(p) {
    // Always show name; add (notes) if present for the “F column” visibility
    const title = esc(p.name);
    const notesBadge = p.notes ? ` <span style="font-weight:600;">— ${esc(p.notes)}</span>` : '';
    const crest = p.icon ? `<img src="${ICON_BASE}${esc(p.icon)}" alt="">` : '';

    const rows = [];
    if (p.country)    rows.push(`${esc(p.country)}`);
    if (p.prefecture) rows.push(`${esc(p.prefecture)}`);
    if (p.daimyo)     rows.push(`Daimyo: ${esc(p.daimyo)}`);
    if (p.stipend || p['stipend (Man Koku)']) {
      const s = p['stipend (Man Koku)'] || p.stipend;
      rows.push(`Stipend: ${esc(s)} (Man-koku)`);
    }
    if (p.wikipedia_url) {
      const text = p.wikipedia || 'Wikipedia';
      rows.push(`<a href="${esc(p.wikipedia_url)}" target="_blank" rel="noopener">` + esc(text) + `</a>`);
    }
    return `
      <div class="popup-title">${crest}<div>${title}${notesBadge}</div></div>
      <div class="popup-body">${rows.map(r=>`<div>${r}</div>`).join('')}</div>
    `;
  }

  function makeMarker(feature, latlng) {
    const p = feature.properties || {};
    // round black frame for crests; fallbacks ok even if image missing
    const html = p.icon
      ? `<div style="width:34px;height:34px;border-radius:6px;border:2px solid #111;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;">
           <img src="${ICON_BASE}${esc(p.icon)}" style="max-width:100%;max-height:100%;" alt="">
         </div>`
      : '';
    const icon = L.divIcon({ html, className: 'mon-icon', iconSize: [36,36], iconAnchor:[18,18], popupAnchor:[0,-8] });
    return L.marker(latlng, { icon });
  }

  // ---------- Map ----------
  const map = L.map('map', { preferCanvas: false }).setView([37.5, 137.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover:false, maxClusterRadius: 50
  }).addTo(map);

  // ---------- Data ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(fc => {
      const layer = L.geoJSON(fc, {
        pointToLayer: makeMarker,
        onEachFeature: (feat, layer) => {
          layer.bindPopup(popupHTML(feat.properties || {}), { maxWidth: 320 });
        }
      });
      cluster.addLayer(layer);
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
