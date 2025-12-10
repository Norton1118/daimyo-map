const DATA_URL = 'data/daimyo_domains.geojson';
const IMG_BASE = 'imgs/';
const PLACEHOLDER = 'img_placeholder.png';

const map = L.map('map', { preferCanvas: true }).setView([37.5, 137.5], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18, attribution: '&copy; OpenStreetMap'
}).addTo(map);

const allLayer = L.layerGroup().addTo(map);

const numLike = v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));
const crestUrl = f => IMG_BASE + encodeURIComponent(f || PLACEHOLDER);
const stipendText = s => numLike(s) ? `${Number(s)} (man-koku)` : '';

function popupHtml(p) {
  const crest = `<img class="popup-icon" src="${crestUrl(p.icon)}" alt="">`;
  const rows = [
    `<div class="popup-title">${p.name ?? ''}</div>`,
    p.region ? `<div class="popup-row">${p.region}</div>` : '',
    p.prefecture ? `<div class="popup-row">${p.prefecture}</div>` : '',
    p.daimyo ? `<div class="popup-row">Daimyo: ${p.daimyo}</div>` : '',
    stipendText(p.stipend) ? `<div class="popup-row">Stipend: ${stipendText(p.stipend)}</div>` : '',
    p.notes ? `<div class="popup-row">${p.notes}</div>` : '',
    p.wikipedia_url ? `<div class="popup-row"><a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>` : ''
  ].filter(Boolean).join('');

  return `<div style="display:flex;gap:10px;align-items:flex-start">
            ${crest}
            <div>${rows}</div>
          </div>`;
}

function markerFor(f, latlng) {
  const icon = L.divIcon({
    html: `<img src="${crestUrl(f.properties?.icon)}" alt="">`,
    className: 'crest-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  const m = L.marker(latlng, { icon });
  m.bindPopup(popupHtml(f.properties || {}), { maxWidth: 320 });
  return m;
}

let geoData = null;
let current = L.layerGroup().addTo(allLayer);

// build checkboxes from regions
function uniqueRegions(features) {
  return [...new Set(features.map(f => f.properties?.region).filter(Boolean))].sort();
}
function renderRegionChecks(regions) {
  const box = document.getElementById('regionChecks');
  box.innerHTML = regions.map(r =>
    `<label><input type="checkbox" value="${r}" checked> ${r}</label>`).join('');
  document.getElementById('selectAll').onclick = () => {
    box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    draw();
  };
  document.getElementById('clearAll').onclick = () => {
    box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    draw();
  };
  box.addEventListener('change', draw);
}

function draw() {
  current.clearLayers();
  if (!geoData) return;
  const selected = new Set(
    Array.from(document.querySelectorAll('#regionChecks input[type=checkbox]:checked'))
      .map(cb => cb.value)
  );
  const layer = L.geoJSON(geoData, {
    filter: f => selected.size === 0 ? false : selected.has(f.properties?.region),
    pointToLayer: (f, latlng) => markerFor(f, latlng)
  });
  current.addLayer(layer);
}

fetch(DATA_URL)
  .then(r => r.json())
  .then(geo => {
    geoData = geo;
    renderRegionChecks(uniqueRegions(geo.features || []));
    draw(); // draw initially with all selected
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));
