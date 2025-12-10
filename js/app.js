/* js/app.js — unified popups + stipend (Man-koku) + F-column note in title */

/* ---- Safety: Leaflet 1.7 compatibility polyfill (no-op on 1.9+) ---- */
if (window.L && L.Util && typeof L.Util.escapeHTML !== 'function') {
  L.Util.escapeHTML = function (s) {
    return String(s).replace(/[&<>"'`=\/]/g, (c) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[c])
    );
  };
}

/* -------- CONFIG -------- */
const GEOJSON_URL = 'data/daimyo_domains.geojson';   // adjust if needed
const ICON_BASE   = 'img/mon/';                      // adjust if needed
const START_VIEW  = [37.0, 138.0];
const START_ZOOM  = 6;

/* -------- Map -------- */
const map = L.map('map', { zoomControl: true })
  .setView(START_VIEW, START_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

/* Cluster group (optional; comment if you don’t want clustering) */
const cluster = L.markerClusterGroup({ spiderfyOnMaxZoom: true });

/* -------- Helpers -------- */
function stipendText(p) {
  // Accept several possible keys; display as “Stipend: N (Man-koku)”
  const v =
    p['stipend'] ??
    p['Stipend'] ??
    p['stipend (Man Koku)'] ??
    p['stipend (Man-koku)'];
  if (v == null || v === '') return '';
  return `Stipend: ${L.Util.escapeHTML(String(v))} (Man-koku)`;
}

function popupTitle(p) {
  // If the han name is missing/empty, show “<name> — <notes>”
  // Examples where Han name is blank: Sado, Izu, etc. (notes carries “Shogunate Land”, “Territory …”)
  const name = (p.name || p.han || '').trim();
  const notes = (p.notes || '').trim();
  if (!name && notes) return notes;               // extremely rare
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
    popupAnchor: [0, -10],
    className: 'crest-icon'
  });
}

/* -------- Load & render -------- */
fetch(`${GEOJSON_URL}?v=mk3`)
  .then((r) => r.json())
  .then((geojson) => {
    const layer = L.geoJSON(geojson, {
      pointToLayer: (feat, latlng) => {
        const p = feat.properties || {};
        const ic = crestIcon(p);
        return ic ? L.marker(latlng, { icon: ic }) : L.marker(latlng);
      },
      onEachFeature: (feat, layer) => {
        const p = feat.properties || {};
        layer.bindPopup(popupHTML(p));
      }
    });
    cluster.addLayer(layer);
    cluster.addTo(map);
  })
  .catch((err) => {
    console.error('Failed to load GeoJSON:', err);
  });
