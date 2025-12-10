const DATA_URL   = 'data/daimyo_domains_with_man_koku.geojson?v=mk3';
const ICON_BASE  = 'img/';
const FALLBACK   = '_fallback.png';

const map = L.map('map', { minZoom: 4 }).setView([37.5, 138.5], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(map);

const regionsWanted = new Set();      // empty = show none until clicked
const checksDiv = document.getElementById('regionChecks');

const monIcon = fn => L.icon({
  iconUrl: ICON_BASE + (fn || FALLBACK),
  iconSize:[40,40], iconAnchor:[20,20], popupAnchor:[0,-18]
});

const val = (o,k,d='') => (o && o[k] != null && o[k] !== '') ? o[k] : d;

function popupHTML(p) {
  const name = val(p,'name');
  const prefecture = val(p,'prefecture') || val(p,'Current Prefecture') || '';
  const daimyo = val(p,'daimyo');
  const stipend = val(p,'stipend (Man koku)') || val(p,'stipend') || '';
  const notes = val(p,'Shogunate Land, Branch Han, Notes') || val(p,'notes') || '';
  const wiki = val(p,'wikipedia_url');
  return `
    <div class="popup">
      <div class="popup-title"><img src="${ICON_BASE + (p.icon || FALLBACK)}" onerror="this.src='${ICON_BASE + FALLBACK}'" />
        <span>${L.Util.escapeHTML(name)}</span>
      </div>
      ${prefecture ? `<div>${L.Util.escapeHTML(prefecture)}</div>` : ''}
      ${daimyo ? `<div>Daimyo: ${L.Util.escapeHTML(daimyo)}</div>` : ''}
      ${stipend ? `<div>Stipend: ${stipend} (Man-koku)</div>` : ''}
      ${notes ? `<div><em>${L.Util.escapeHTML(notes)}</em></div>` : ''}
      ${wiki ? `<div><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>` : ''}
    </div>`;
}

let allFeatures = [];     // keep raw features for filtering
let markersLayer = L.layerGroup().addTo(map);

async function load() {
  const r = await fetch(DATA_URL, {cache:'no-store'});
  if (!r.ok) throw new Error('GeoJSON fetch failed – check data path/filename');
  const gj = await r.json();
  allFeatures = gj.features || [];
  buildRegionUI(allFeatures);
  // default: show all
  regionsWanted.clear();
  new Set(allFeatures.map(f => f.properties?.region)).forEach(r => regionsWanted.add(r));
  redraw();
}
function buildRegionUI(features) {
  const regions = [...new Set(features.map(f => f.properties?.region).filter(Boolean))].sort();
  checksDiv.innerHTML = regions.map(r =>
    `<label><input type="checkbox" value="${r}" checked> ${r}</label>`).join('');
  checksDiv.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) regionsWanted.add(cb.value); else regionsWanted.delete(cb.value);
      redraw();
    });
  });
  document.getElementById('btnAll').onclick = () => {
    regions.forEach(r => regionsWanted.add(r));
    checksDiv.querySelectorAll('input').forEach(cb => cb.checked = true);
    redraw();
  };
  document.getElementById('btnNone').onclick = () => {
    regionsWanted.clear();
    checksDiv.querySelectorAll('input').forEach(cb => cb.checked = false);
    redraw();
  };
}

function redraw() {
  markersLayer.clearLayers();
  const filtered = allFeatures.filter(f => regionsWanted.has(f.properties?.region));
  const layer = L.geoJSON({type:'FeatureCollection', features: filtered}, {
    pointToLayer: (f, ll) => L.marker(ll, {icon: monIcon(f.properties?.icon)}).bindPopup(popupHTML(f.properties))
  });
  markersLayer.addLayer(layer);
  if (filtered.length) map.fitBounds(layer.getBounds().pad(0.1));
}

load().catch(err => { console.error(err); alert(err.message); });
