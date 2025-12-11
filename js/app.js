// --- CONFIG ---
const DATA_URL  = 'data/daimyo_domains.geojson';
const ICON_DIR  = 'imgs/';                 // ✅ your repo folder is "imgs", not "img"
const PLACEHOLDER = ICON_DIR + '_placeholder.png';

// --- MAP ---
const map = L.map('map', { zoomControl: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// --- helpers ---
function iconUrl(name) {
  if (!name) return PLACEHOLDER;
  return ICON_DIR + String(name);
}
function fmtStipend(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `${n} 万石` : '—';
}
function popupHtml(p) {
  const crest = `<img src="${iconUrl(p.icon)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" 
                   alt="" width="28" height="28" style="border:1px solid rgba(0,0,0,.25);border-radius:4px;box-sizing:border-box;">`;

  const lines = [];
  // title
  lines.push(`<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
                ${crest}<b>${p.name ?? p.notes ?? ''}</b>
              </div>`);

  if (p.country)    lines.push(`${p.country}`);
  if (p.region)     lines.push(`${p.region}`);
  if (p.prefecture) lines.push(`${p.prefecture}`);
  if (p.daimyo)     lines.push(`Daimyo: ${p.daimyo}`);

  // Stipend or notes
  if (p.notes && (p.stipend === null || p.stipend === undefined || p.stipend === '')) {
    lines.push(`<i>${p.notes}</i>`);
  } else {
    lines.push(`Stipend: ${fmtStipend(p.stipend)}`);
  }

  if (p.wikipedia_url)
    lines.push(`<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`);

  return `<div style="line-height:1.25">${lines.join('<br>')}</div>`;
}

// --- markers (clustered) ---
const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
});
map.addLayer(cluster);

// --- load data ---
fetch(DATA_URL)
  .then(r => r.json())
  .then(geo => {
    const layer = L.geoJSON(geo, {
      pointToLayer: (_, latlng) => L.marker(latlng, {
        icon: L.divIcon({
          className: 'crest-pin',
          html: `<div style="width:28px;height:28px;border-radius:6px;overflow:hidden;background:#fff;border:1px solid rgba(0,0,0,.3);box-shadow:0 1px 2px rgba(0,0,0,.2)">
                   <img src="${iconUrl(_.properties.icon)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" 
                        width="28" height="28" alt="">
                 </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
          popupAnchor: [0, -28]
        })
      }),
      onEachFeature: (f, m) => m.bindPopup(popupHtml(f.properties))
    });
    cluster.addLayer(layer);
    map.fitBounds(layer.getBounds(), { padding: [20, 20] });
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));
