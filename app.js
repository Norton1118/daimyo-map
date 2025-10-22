// app.js — Daimyo Castles Map (Leaflet)
// -------------------------------------

// --- URL flags --------------------------------------------------------------
const qs = new URLSearchParams(location.search);
const NO_CLUSTER = qs.has('nocluster');
const DEBUG = qs.has('dbg') || qs.has('debug');

// --- Map --------------------------------------------------------------------
const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true,
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// A gentle default view over Japan; we’ll fit to data after load.
map.setView([36.2, 138.0], 5);

// --- Helpers ----------------------------------------------------------------
function htmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Robustly turn a Wikipedia field into a real URL
function getWikiUrl(props) {
  const raw =
    props.Wikipedia_Link ||
    props.Wikipedia ||
    props['Wikipedia link'] ||
    props['Wikipedia_Link'] ||
    '';

  if (!raw) return null;

  // If it already looks like a URL, use it.
  if (/^https?:\/\//i.test(raw)) return raw.trim();

  // Otherwise it's usually a title like "Aizu Domain - Wikipedia"
  let s = String(raw).trim();

  // Strip " - Wikipedia" (also en/em dashes and loose variants)
  s = s.replace(/\s*[-–—]\s*Wikipedia.*$/i, '');

  // If some other dash suffix remains, keep the left part
  if (/[–—-]/.test(s) && s.match(/\s*[–—-]\s*/)) {
    s = s.split(/\s*[–—-]\s*/)[0].trim();
  }

  if (!s) return null;

  // Build the page URL from the title
  const page = s.replace(/\s+/g, '_');
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page);
}

function iconFor(p) {
  // Use pre-resolved local path if present; otherwise fall back
  const src = p.Mon_Local ? p.Mon_Local : 'imgs/fallback.png';
  const cls = DEBUG ? 'crest-icon crest-icon--debug' : 'crest-icon';

  // Use a DivIcon so we can control the inner <img>
  return L.divIcon({
    className: cls,
    html: `<img class="crest-img" src="${htmlEscape(src)}" alt="" loading="lazy">`,
    iconSize: [36, 36],      // visual size; CSS scales the <img>
    iconAnchor: [18, 18],    // center on point
    popupAnchor: [0, -18],
  });
}

function popupHtml(p) {
  const title =
    p.Wikipedia_Link?.replace(/\s*[-–—]\s*Wikipedia.*$/i, '') ||
    p.Han_Name ||
    'Domain';

  const fam = p.Daimyo_Family ? `${htmlEscape(p.Daimyo_Family)} 家` : '';
  const koku =
    (p.Stipend_Koku || p.Stipend_koku || p['Stipend Koku']) != null
      ? `・ 俸禄: ${htmlEscape(p.Stipend_Koku ?? p.Stipend_koku ?? p['Stipend Koku'])} 石`
      : '';

  const town = p.Castle_Town ? htmlEscape(p.Castle_Town) : '';
  const wiki = getWikiUrl(p);

  const link = wiki
    ? `<div class="popup-links"><a href="${htmlEscape(
        wiki
      )}" target="_blank" rel="noopener">Wikipedia</a></div>`
    : '';

  return `
    <div class="popup">
      <h3>${htmlEscape(title)}</h3>
      <div class="popup-sub">${fam}${koku}</div>
      <div>${town}</div>
      ${link}
    </div>
  `;
}

// --- Data + Markers ---------------------------------------------------------
(async function () {
  const resp = await fetch('data/daimyo_castles.geojson', { cache: 'no-cache' });
  const gj = await resp.json();

  const markers = [];

  gj.features.forEach((f) => {
    const p = f.properties || {};
    const g = f.geometry || {};
    if (g.type !== 'Point' || !Array.isArray(g.coordinates)) return;

    const [lng, lat] = g.coordinates;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const m = L.marker([lat, lng], { icon: iconFor(p) }).bindPopup(popupHtml(p));
    markers.push(m);
  });

  let layer;

  if (NO_CLUSTER) {
    // Plain layer group
    layer = L.layerGroup(markers).addTo(map);
  } else {
    // Clustered
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
    });
    markers.forEach((m) => cluster.addLayer(m));
    layer = cluster.addTo(map);
  }

  // Fit map to marker bounds (fallback to default if empty)
  try {
    const b = L.featureGroup(markers).getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.08));
  } catch (_e) {
    // ignore
  }

  // Expose for quick console checks (optional)
  if (DEBUG) {
    console.log('[app] features:', gj.features?.length ?? 0);
    window.__markers = markers;
    window.__layer = layer;
  }
})();
