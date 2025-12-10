// === Region filter map (no clustering) ===
const DATA_URL = 'data/daimyo_domains.geojson';

const map = L.map('map', { preferCanvas: true }).setView([37.5, 138], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Shared helpers
function crestIcon(props) {
  let iconPath = props.icon || '';
  if (iconPath && !iconPath.startsWith('img/')) {
    iconPath = `img/mon/${iconPath}`;
  }
  const url = iconPath ? encodeURI(iconPath) : null;
  return url ? L.icon({ iconUrl: url, iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -10] }) : undefined;
}
function popupHTML(p) {
  const parts = [];
  const icon = p.icon ? (p.icon.startsWith('img/') ? p.icon : `img/mon/${p.icon}`) : null;
  if (icon) parts.push(`<img class="popup-icon" src="${encodeURI(icon)}" alt="">`);
  const title = p['Han Name'] || p.name || p.han || '—';
  parts.push(`<span class="popup-title">${title}</span>`);

  const rows = [];
  if (p['Current Prefecture'] || p.prefecture) rows.push(`<div class="popup-row">${p['Current Prefecture'] || p.prefecture}</div>`);
  if (p.Daimyo || p.daimyo) rows.push(`<div class="popup-row">Daimyo: ${p.Daimyo || p.daimyo}</div>`);
  if (p.Stipend || p.stipend) rows.push(`<div class="popup-row">Stipend: ${p.Stipend || p.stipend} (Man-koku)</div>`);
  if (p['Shogunate Land, Branch Han, Notes']) rows.push(`<div class="popup-row">${p['Shogunate Land, Branch Han, Notes']}</div>`);
  if (p.Wikipedia || p.wikipedia) rows.push(`<div class="popup-row" style="margin-top:4px;"><a href="${p.Wikipedia || p.wikipedia}" target="_blank" rel="noopener">Wikipedia</a></div>`);
  return `<div>${parts.join('')}</div>${rows.join('')}`;
}
function pointToLayer(feature, latlng) {
  const icon = crestIcon(feature.properties);
  return icon ? L.marker(latlng, { icon }) : L.marker(latlng);
}
function onEachFeature(feature, layer) {
  layer.bindPopup(popupHTML(feature.properties));
}

// Data + filtering
let allLayer;        // the complete unfiltered layer
let currentLayer;    // the currently visible layer
let regions = [];    // unique list for UI

async function loadData() {
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
  if (!res.ok) {
    console.error('GeoJSON fetch failed:', res.status, await res.text());
    return;
  }
  const gj = await res.json();

  // Build region list from props.Region (or region)
  const seen = new Set();
  gj.features.forEach(f => {
    const r = f.properties.Region || f.properties.region || null;
    if (r && !seen.has(r)) { seen.add(r); regions.push(r); }
  });
  regions.sort();

  // Build UI
  const box = document.getElementById('regionChecks');
  box.innerHTML = regions.map(r => {
    const id = `r_${r.replace(/\s+/g,'_')}`;
    return `<label><input type="checkbox" value="${r}" id="${id}" checked> ${r}</label>`;
  }).join('');
  document.getElementById('btnAll').onclick = () => { box.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true); applyFilter(); };
  document.getElementById('btnClear').onclick = () => { box.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false); applyFilter(); };
  box.addEventListener('change', applyFilter);

  // Create the full layer once (no clusters here)
  allLayer = L.geoJSON(gj, { pointToLayer, onEachFeature });
  applyFilter(); // initial render
}

function applyFilter() {
  if (currentLayer) { map.removeLayer(currentLayer); currentLayer = null; }

  const checked = new Set([...document.querySelectorAll('#regionChecks input[type=checkbox]:checked')].map(i => i.value));
  if (checked.size === 0) { return; }

  // Filter features by Region
  const filtered = L.geoJSON(allLayer.toGeoJSON(), {
    pointToLayer,
    onEachFeature,
    filter: f => checked.has(f.properties.Region || f.properties.region || '')
  });

  currentLayer = filtered;
  currentLayer.addTo(map);
}

loadData();
