/* js/app-region.js — region checkboxes + unified popups */

/* ---- Safety: Leaflet 1.7 compatibility polyfill (no-op on 1.9+) ---- */
if (window.L && L.Util && typeof L.Util.escapeHTML !== 'function') {
  L.Util.escapeHTML = function (s) {
    return String(s).replace(/[&<>"'`=\/]/g, (c) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])
    );
  };
}

/* -------- CONFIG -------- */
const GEOJSON_URL = 'data/daimyo_domains.geojson';
const ICON_BASE   = 'img/mon/';
const START_VIEW  = [37.0, 138.0];
const START_ZOOM  = 6;

/* -------- Map -------- */
const map = L.map('map', { zoomControl: true }).setView(START_VIEW, START_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const cluster = L.markerClusterGroup({ spiderfyOnMaxZoom: true }).addTo(map);

/* -------- Helpers reused from app.js -------- */
function stipendText(p) {
  const v =
    p['stipend'] ??
    p['Stipend'] ??
    p['stipend (Man Koku)'] ??
    p['stipend (Man-koku)'];
  if (v == null || v === '') return '';
  return `Stipend: ${L.Util.escapeHTML(String(v))} (Man-koku)`;
}

function popupTitle(p) {
  const name = (p.name || p.han || '').trim();
  const notes = (p.notes || '').trim();
  if (!name && notes) return notes;
  if (name && notes && !p.han) return `${name} — ${notes}`;
  return name || (p.prefecture || '');
}

function popupHTML(p) {
  const lines = [];
  const title = popupTitle(p);
  if (title) lines.push(`<h3 class="popup-title">${L.Util.escapeHTML(title)}</h3>`);
  if (p.prefecture) lines.push(`<p class="popup-line">${L.Util.escapeHTML(p.prefecture)}</p>`);
  if (p.daimyo)     lines.push(`<p class="popup-line">Daimyo: ${L.Util.escapeHTML(p.daimyo)}</p>`);
  const s = stipendText(p);
  if (s)            lines.push(`<p class="popup-line">${s}</p>`);
  const url = p.wikipedia_url || p.wikipedia || '';
  if (url)          lines.push(`<a class="popup-link" href="${L.Util.escapeHTML(url)}" target="_blank" rel="noopener">Wikipedia</a>`);
  return lines.join('');
}

function crestIcon(p) {
  const file = (p.icon || '').trim();
  if (!file) return null;
  return L.icon({
    iconUrl: ICON_BASE + file,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -10]
  });
}

/* -------- Region filter plumbing -------- */
const state = {
  allFeatures: [],     // { feature, marker }
  regions: []          // unique sorted list
};

function rebuildCluster(selectedSet) {
  cluster.clearLayers();
  const toAdd = [];
  for (const item of state.allFeatures) {
    const region = (item.feature.properties?.region || '').trim();
    if (!selectedSet || selectedSet.size === 0 || selectedSet.has(region)) {
      toAdd.push(item.marker);
    }
  }
  if (toAdd.length) cluster.addLayers(toAdd);
}

function renderRegionPanel() {
  const list = document.getElementById('regionList');
  list.innerHTML = '';
  const selected = new Set();

  // Create a checkbox for each region
  state.regions.forEach((r, idx) => {
    const id = `r_${idx}`;
    const row = document.createElement('div');
    row.className = 'row';

    const cb  = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.dataset.region = r;

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = r || '(Unknown)';

    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(r);
      else selected.delete(r);
      rebuildCluster(selected);
    });

    row.appendChild(cb);
    row.appendChild(label);
    list.appendChild(row);
  });

  document.getElementById('selectAllBtn').onclick = () => {
    selected.clear();
    state.regions.forEach((r, idx) => {
      selected.add(r);
      const cb = document.getElementById(`r_${idx}`);
      if (cb) cb.checked = true;
    });
    rebuildCluster(selected);
  };

  document.getElementById('clearBtn').onclick = () => {
    selected.clear();
    state.regions.forEach((_, idx) => {
      const cb = document.getElementById(`r_${idx}`);
      if (cb) cb.checked = false;
    });
    rebuildCluster(selected);
  };
}

/* -------- Load & render -------- */
fetch(`${GEOJSON_URL}?v=mk3`)
  .then((r) => r.json())
  .then((geojson) => {
    // Prebuild markers so we can quickly filter
    const regions = new Set();

    geojson.features.forEach((f) => {
      const p = f.properties || {};
      const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
      const ic = crestIcon(p);
      const marker = ic ? L.marker(latlng, { icon: ic }) : L.marker(latlng);
      marker.bindPopup(popupHTML(p));

      state.allFeatures.push({ feature: f, marker });
      regions.add((p.region || '').trim());
    });

    state.regions = Array.from(regions).filter(Boolean).sort();
    renderRegionPanel();

    // Default: show nothing until user selects, or show all? Choose “show all” for convenience:
    rebuildCluster(new Set(state.regions));
    // Also tick all boxes visually:
    state.regions.forEach((_, idx) => {
      const cb = document.getElementById(`r_${idx}`);
      if (cb) cb.checked = true;
    });
  })
  .catch((err) => {
    console.error('Failed to load GeoJSON:', err);
  });
