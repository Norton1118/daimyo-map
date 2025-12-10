// Region-filter map (no clustering)
const map = L.map('map', { zoomControl: true }).setView([38.0, 139.0], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OSM'
}).addTo(map);

// Simple icons (same encoding fix)
function markerIcon(filename) {
  if (!filename) return L.divIcon({ className: 'mon-icon', html: '' });
  const safe = encodeURIComponent(String(filename).trim());
  return L.divIcon({ className: 'mon-icon', html: `<img src="img/mon/${safe}" alt="">`, iconSize:[28,28], iconAnchor:[14,14], popupAnchor:[0,-12] });
}

function popupHTML(p) {
  const title = p.han_name?.trim() || p.name?.trim() || p.country?.trim() || p.current_prefecture?.trim() || '—';
  const notes = p.notes || p['Shogunate Land, Branch Han, Notes'] || '';
  const stipendVal = p.stipend ?? p.koku ?? p['Stipend'];
  const stipend = (stipendVal !== undefined && stipendVal !== null && String(stipendVal).trim() !== '')
    ? `<div>Stipend: ${stipendVal} <span style="opacity:.8">(Man-koku)</span></div>` : '';

  const iconBlock = p.icon ? `<div class="popup-icon"><img src="img/mon/${encodeURIComponent(p.icon)}" alt=""></div>` : '';
  const wiki = p.wikipedia ? `<div style="margin-top:4px;"><a href="${p.wikipedia}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

  return `
    <div style="min-width:180px">
      <div style="display:flex; gap:8px; align-items:center;">
        ${iconBlock}
        <div style="font-weight:600">${title}</div>
      </div>
      ${p.current_prefecture ? `<div>${p.current_prefecture}</div>` : ''}
      ${p.daimyo ? `<div>Daimyo: ${p.daimyo}</div>` : ''}
      ${stipend}
      ${notes ? `<div>${notes}</div>` : ''}
      ${wiki}
    </div>
  `;
}

const allLayer = L.layerGroup().addTo(map);
const regionLayers = new Map(); // region => LayerGroup

function ensureRegionLayer(region) {
  if (!regionLayers.has(region)) {
    regionLayers.set(region, L.layerGroup());
  }
  return regionLayers.get(region);
}

function setRegionVisibility(region, visible) {
  const lg = regionLayers.get(region);
  if (!lg) return;
  if (visible) lg.addTo(map); else map.removeLayer(lg);
}

(async function load() {
  const res = await fetch(`data/daimyo_domains.geojson?cache=${Date.now()}`);
  if (!res.ok) {
    console.error('GeoJSON load failed', res.status, await res.text());
    return;
  }
  const gj = await res.json();

  // collect unique regions (property name "region" in the new file)
  const regions = [...new Set(gj.features.map(f => (f.properties?.region || '').trim()).filter(Boolean))].sort();

  // build checkbox UI
  const list = document.getElementById('regionList');
  regions.forEach(r => {
    const id = `r_${r.replace(/\W+/g, '_')}`;
    const row = document.createElement('label');
    row.innerHTML = `<input type="checkbox" id="${id}" checked> ${r}`;
    list.appendChild(row);

    // ensure we have a layer for this region
    ensureRegionLayer(r);

    row.querySelector('input').addEventListener('change', (e) => {
      setRegionVisibility(r, e.target.checked);
    });
  });

  document.getElementById('selectAll').onclick = () => {
    list.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change')); });
  };
  document.getElementById('clearBtn').onclick = () => {
    list.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; cb.dispatchEvent(new Event('change')); });
  };

  // create markers, assign to region layers
  gj.features.forEach(f => {
    const p = f.properties || {};
    const region = (p.region || '').trim();
    const lg = region ? ensureRegionLayer(region) : allLayer;

    const [lon, lat] = f.geometry.coordinates;
    const m = L.marker([lat, lon], { icon: markerIcon(p.icon) }).bindPopup(popupHTML(p));
    lg.addLayer(m);
  });

  // initially show all regions
  regionLayers.forEach(lg => lg.addTo(map));
})();
