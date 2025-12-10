// ------- config -------
const GEOJSON_URL = `data/daimyo_domains_with_man_koku.geojson?ts=${Date.now()}`;
const ICON_BASE = 'img/';                 // e.g. img/271_Hitoyoshi.png
const ICON_FALLBACK = 'img/fallback.png'; // add a small generic mon icon here

// ------- map base -------
const map = L.map('map', { zoomControl: true }).setView([37.7, 139.6], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);

// cluster group
const clusterGroup = L.markerClusterGroup({
  disableClusteringAtZoom: 8,
  spiderfyDistanceMultiplier: 1.2
});
map.addLayer(clusterGroup);

// small helper for robust icon URLs
function iconUrl(iconName) {
  if (!iconName) return ICON_FALLBACK;
  // exact file name, but URL-encoded (handles spaces, parentheses, etc.)
  return ICON_BASE + encodeURIComponent(iconName);
}

function buildIcon(iconName) {
  const url = iconUrl(iconName);
  const icon = L.icon({
    iconUrl: url,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'mon-icon'
  });

  // Leaflet doesn’t emit image load errors; use a tiny overlay image trick:
  // We still provide a robust fallback in popup HTML (preview), so this is enough.

  return icon;
}

function popupHTML(p) {
  const titleImg = iconUrl(p.icon);
  const hasWiki = !!p.wikipedia_url;
  const stipend = (p['stipend (Man Koku)'] ?? p.stipend);
  const rows = [
    p.prefecture ? `<div>${p.prefecture}</div>` : '',
    p.daimyo ? `<div>Daimyo: ${L.Util.escapeHTML(p.daimyo)}</div>` : '',
    (stipend != null && stipend !== '' && !Number.isNaN(Number(stipend)))
      ? `<div>Stipend: ${stipend} (Man-koku)</div>` : '',
    p.notes ? `<div>${L.Util.escapeHTML(p.notes)}</div>` : '',
    hasWiki ? `<a href="${p.wikipedia_url}" target="_blank">Wikipedia</a>` : ''
  ].filter(Boolean).join('');

  return `
    <div class="popup">
      <div class="popup-title">
        <img src="${titleImg}" onerror="this.src='${ICON_FALLBACK}'" alt="">
        <span>${L.Util.escapeHTML(p.name ?? '')}</span>
      </div>
      ${rows}
    </div>
  `;
}

fetch(GEOJSON_URL)
  .then(r => r.json())
  .then(geo => {
    L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        const p = feat.properties || {};
        const marker = L.marker(latlng, { icon: buildIcon(p.icon) });
        marker.bindPopup(popupHTML(p));
        return marker;
      }
    }).addTo(clusterGroup);
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));
