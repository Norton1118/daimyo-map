// ---------- config ----------
const DATA_URL = 'data/daimyo_domains_with_man_koku.geojson?v=mk3'; // make sure this file exists!
const ICON_BASE = 'img/';        // your repo folder for mon images
const ICON_FALLBACK = '_fallback.png'; // add this file under /img

// ---------- map ----------
const map = L.map('map', {
  minZoom: 4
}).setView([37.5, 138.5], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 45
});
map.addLayer(cluster);

// small helper to ensure we don’t break if a field is missing
const val = (o, k, d='') => (o && o[k] != null && o[k] !== '') ? o[k] : d;

// build Leaflet icon with local fallback
function monIcon(filename) {
  const url = filename ? ICON_BASE + filename : ICON_BASE + ICON_FALLBACK;
  return L.icon({
    iconUrl: url,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
    className: 'mon-icon'
  });
}

function popupHTML(p) {
  const name = val(p, 'name');
  const region = val(p, 'region');
  const prefecture = val(p, 'prefecture') || val(p, 'Current Prefecture') || '';
  const daimyo = val(p, 'daimyo');
  const stipend = val(p, 'stipend (Man koku)') || val(p, 'stipend') || ''; // tolerate old field
  const notes = val(p, 'Shogunate Land, Branch Han, Notes') || val(p, 'notes') || '';
  const wikiUrl = val(p, 'wikipedia_url');

  const stipendLine = stipend ? `<div class="popup-line">Stipend: ${stipend} (Man-koku)</div>` : '';
  const daimyoLine  = daimyo  ? `<div class="popup-line">Daimyo: ${L.Util.escapeHTML(daimyo)}</div>` : '';
  const regionLine  = region  ? `<div class="popup-line">${L.Util.escapeHTML(region)}</div>` : '';
  const prefLine    = prefecture ? `<div class="popup-line">${L.Util.escapeHTML(prefecture)}</div>` : '';
  const notesLine   = notes ? `<div class="popup-line"><em>${L.Util.escapeHTML(notes)}</em></div>` : '';
  const wikiLine    = wikiUrl ? `<div class="popup-line"><a href="${wikiUrl}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

  return `
    <div class="popup">
      <div class="popup-title">
        <img src="${ICON_BASE + (p.icon || ICON_FALLBACK)}" onerror="this.src='${ICON_BASE + ICON_FALLBACK}'" alt="">
        <span>${L.Util.escapeHTML(name)}</span>
      </div>
      ${regionLine}
      ${prefLine}
      ${daimyoLine}
      ${stipendLine}
      ${notesLine}
      ${wikiLine}
    </div>`;
}

function pointToMarker(feature, latlng) {
  const p = feature.properties || {};
  return L.marker(latlng, { icon: monIcon(p.icon) }).bindPopup(popupHTML(p));
}

// safer fetch that fails loudly if 404
async function loadGeoJSON(url) {
  const r = await fetch(url, {cache:'no-store'});
  if (!r.ok) {
    throw new Error(`GeoJSON fetch failed: ${r.status} ${r.statusText} – check the path/filename in data/`);
  }
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json') && !ct.includes('geo+json')) {
    const text = await r.text();
    throw new Error(`Expected JSON but got:\n${text.slice(0,200)}…`);
  }
  return r.json();
}

loadGeoJSON(DATA_URL)
  .then(gj => {
    const layer = L.geoJSON(gj, { pointToLayer: pointToMarker });
    cluster.addLayer(layer);
    map.fitBounds(layer.getBounds().pad(0.1));
  })
  .catch(err => {
    console.error(err);
    alert('Could not load the GeoJSON. Open the console for details. Most common cause: wrong path/filename.');
  });
