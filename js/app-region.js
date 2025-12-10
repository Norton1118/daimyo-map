// ------- config -------
const GEOJSON_URL = `data/daimyo_domains_with_man_koku.geojson?ts=${Date.now()}`;
const ICON_BASE = 'img/';
const ICON_FALLBACK = 'img/fallback.png';

// ------- base map -------
const map = L.map('map', { zoomControl: true }).setView([37.7, 139.6], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);

function iconUrl(iconName) {
  if (!iconName) return ICON_FALLBACK;
  return ICON_BASE + encodeURIComponent(iconName);
}
function buildIcon(iconName) {
  return L.icon({
    iconUrl: iconUrl(iconName),
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}
function popupHTML(p) {
  const titleImg = iconUrl(p.icon);
  const stipend = (p['stipend (Man Koku)'] ?? p.stipend);
  const rows = [
    p.prefecture ? `<div>${p.prefecture}</div>` : '',
    p.daimyo ? `<div>Daimyo: ${L.Util.escapeHTML(p.daimyo)}</div>` : '',
    (stipend != null && stipend !== '' && !Number.isNaN(Number(stipend)))
      ? `<div>Stipend: ${stipend} (Man-koku)</div>` : '',
    p.notes ? `<div>${L.Util.escapeHTML(p.notes)}</div>` : '',
    p.wikipedia_url ? `<a href="${p.wikipedia_url}" target="_blank">Wikipedia</a>` : ''
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

// layer to toggle by region (no clustering)
let allLayer;
let allFeatures = [];

fetch(GEOJSON_URL)
  .then(r => r.json())
  .then(geo => {
    allFeatures = geo.features || [];
    allLayer = L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        const p = feat.properties || {};
        const m = L.marker(latlng, { icon: buildIcon(p.icon) });
        m.bindPopup(popupHTML(p));
        return m;
      }
    }).addTo(map);

    buildRegionPanel();
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));

// ----- region UI -----
function buildRegionPanel() {
  const regions = Array.from(new Set(
    allFeatures.map(f => (f.properties?.region || '').trim()).filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b, 'en'));

  const checks = document.getElementById('regionChecks');
  checks.innerHTML = regions.map(r => (
    `<label><input type="checkbox" class="rchk" value="${r}" checked> ${r}</label>`
  )).join('');

  document.getElementById('selAll').onclick = () => {
    document.querySelectorAll('.rchk').forEach(c => c.checked = true);
    applyRegionFilter();
  };
  document.getElementById('clearAll').onclick = () => {
    document.querySelectorAll('.rchk').forEach(c => c.checked = false);
    applyRegionFilter();
  };
  document.querySelectorAll('.rchk').forEach(c => {
    c.addEventListener('change', applyRegionFilter);
  });
}

function applyRegionFilter() {
  const allowed = new Set(
    Array.from(document.querySelectorAll('.rchk'))
      .filter(c => c.checked)
      .map(c => c.value)
  );

  // rebuild the layer quickly (no clustering)
  if (allLayer) {
    map.removeLayer(allLayer);
  }
  const subset = {
    type: 'FeatureCollection',
    features: allFeatures.filter(f => allowed.size === 0 || allowed.has(f.properties?.region))
  };
  allLayer = L.geoJSON(subset, {
    pointToLayer: (feat, latlng) => {
      const p = feat.properties || {};
      const m = L.marker(latlng, { icon: buildIcon(p.icon) });
      m.bindPopup(popupHTML(p));
      return m;
    }
  }).addTo(map);
}
