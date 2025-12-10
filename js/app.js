// Main (clustered) map
const map = L.map('map', { zoomControl: true }).setView([38.0, 139.0], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OSM'
}).addTo(map);

const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
map.addLayer(cluster);

// Build a safe icon element for each point
function markerIcon(filename) {
  // If filename missing, use a blank square
  if (!filename) {
    return L.divIcon({ className: 'mon-icon', html: '' });
  }
  // Important: encode to survive spaces & non-ASCII
  const safe = encodeURIComponent(String(filename).trim());
  const url = `img/mon/${safe}`;
  return L.divIcon({
    className: 'mon-icon',
    html: `<img src="${url}" alt="">`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -12]
  });
}

function popupHTML(p) {
  // Title fallback priority
  const title =
    p.han_name?.trim() ||
    p.name?.trim() ||
    p.country?.trim() ||
    p.current_prefecture?.trim() ||
    '—';

  // stipend string with unit
  let stipend = '';
  const val = p.stipend ?? p.koku ?? p['Stipend'];
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    stipend = `<div>Stipend: ${val} <span style="opacity:.8">(Man-koku)</span></div>`;
  }

  // notes from F column
  const notes = p.notes || p['Shogunate Land, Branch Han, Notes'] || '';
  const notesLine = notes ? `<div>${notes}</div>` : '';

  const daimyoline = p.daimyo ? `<div>Daimyo: ${p.daimyo}</div>` : '';

  const wiki = p.wikipedia ? `<div style="margin-top:4px;"><a href="${p.wikipedia}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

  // icon block in popup
  const iconBlock = p.icon ? `<div class="popup-icon"><img src="img/mon/${encodeURIComponent(p.icon)}" alt=""></div>` : '';

  return `
    <div style="min-width:180px">
      <div style="display:flex; gap:8px; align-items:center;">
        ${iconBlock}
        <div style="font-weight:600">${title}</div>
      </div>
      ${p.current_prefecture ? `<div>${p.current_prefecture}</div>` : ''}
      ${daimyoline}
      ${stipend}
      ${notesLine}
      ${wiki}
    </div>
  `;
}

// Load GeoJSON
(async function load() {
  const res = await fetch(`data/daimyo_domains.geojson?cache=${Date.now()}`);
  if (!res.ok) {
    console.error('GeoJSON load failed', res.status, await res.text());
    return;
  }
  const gj = await res.json();

  gj.features.forEach(f => {
    const p = f.properties || {};
    const [lon, lat] = f.geometry.coordinates;
    const m = L.marker([lat, lon], { icon: markerIcon(p.icon) });
    m.bindPopup(popupHTML(p));
    cluster.addLayer(m);
  });
})();
