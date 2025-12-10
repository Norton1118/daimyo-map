// Same helpers as main
function iconFromFeature(feat) {
  const iconName = feat.properties.icon || "";
  const src = iconName ? `img/${iconName}` : "img/_placeholder.png";
  return L.divIcon({
    className: "mon-div-icon",
    html: `<img src="${src}" alt="" onerror="this.onerror=null;this.src='img/_placeholder.png';">`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -12]
  });
}

function fmtStipend(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `${n} (Man-koku)` : `${value} (Man-koku)`;
}

function popupHTML(p) {
  const title = (p["Han Name"] && String(p["Han Name"]).trim()) || (p["Country (region group)"] || p.region || "—");
  const rows = [];
  // Optional small icon preview in popup
  const iconName = p.icon || "";
  const iconSrc = iconName ? `img/${iconName}` : "img/_placeholder.png";
  rows.push(`<div class="popup-icon"><img src="${iconSrc}" alt="" onerror="this.onerror=null;this.src='img/_placeholder.png';" style="width:28px;height:28px;border:2px solid rgba(0,0,0,.25);border-radius:4px;box-sizing:border-box;background:#fff"></div>`);
  rows.push(`<div><strong>${title}</strong></div>`);
  if (p["Current Prefecture"] || p.prefecture) rows.push(`<div>${p["Current Prefecture"] || p.prefecture}</div>`);
  if (p.daimyo) rows.push(`<div>Daimyo: ${p.daimyo}</div>`);
  if (p.stipend !== undefined) rows.push(`<div>Stipend: ${fmtStipend(p.stipend)}</div>`);
  if (p["Shogunate Land, Branch Han, Notes"] || p.notes) rows.push(`<div style="margin-top:4px">${p["Shogunate Land, Branch Han, Notes"] || p.notes}</div>`);
  if (p.wikipedia) rows.push(`<div style="margin-top:4px"><a href="${p.wikipedia}" target="_blank" rel="noopener">Wikipedia</a></div>`);
  return rows.join("");
}

// Map
const map = L.map('map').setView([36.2048, 138.2529], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Layers by region (no clustering here)
const regionLayers = new Map(); // region → L.LayerGroup
let allFeatures = [];            // keep raw features for re-filtering

function ensureRegionLayer(region) {
  if (!regionLayers.has(region)) regionLayers.set(region, L.layerGroup().addTo(map));
  return regionLayers.get(region);
}

function clearAllRegionLayers() {
  for (const layer of regionLayers.values()) layer.clearLayers();
}

function renderByActiveRegions(activeSet) {
  clearAllRegionLayers();
  allFeatures.forEach(({ feat, latlng }) => {
    const r = feat.properties.region || feat.properties.Region || "";
    if (!activeSet.size || activeSet.has(r)) {
      const marker = L.marker(latlng, { icon: iconFromFeature(feat) });
      marker.bindPopup(popupHTML(feat.properties), { maxWidth: 300 });
      ensureRegionLayer(r).addLayer(marker);
    }
  });
}

function buildRegionPanel(regions) {
  const listDiv = document.getElementById('regionList');
  listDiv.innerHTML = "";
  const active = new Set(regions); // start selected

  regions.sort().forEach(r => {
    const id = `r_${r.replace(/\W+/g,'_')}`;
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" id="${id}" checked> ${r}`;
    listDiv.appendChild(label);
    const cb = label.querySelector('input');
    cb.addEventListener('change', () => {
      if (cb.checked) active.add(r); else active.delete(r);
      renderByActiveRegions(active);
    });
  });

  document.getElementById('selAll').onclick = () => {
    listDiv.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    active.clear(); regions.forEach(r => active.add(r));
    renderByActiveRegions(active);
  };
  document.getElementById('clear').onclick = () => {
    listDiv.querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
    active.clear();
    renderByActiveRegions(active);
  };

  // Initial draw
  renderByActiveRegions(active);
}

fetch('data/daimyo_domains.geojson')
  .then(r => {
    if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
    return r.json();
  })
  .then(geo => {
    const regions = new Set();
    const feats = [];

    L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        const r = feat.properties.region || feat.properties.Region || "";
        if (r) regions.add(r);
        feats.push({ feat, latlng });
        return null; // we'll draw manually by regions
      }
    });

    allFeatures = feats;
    buildRegionPanel(Array.from(regions));
  })
  .catch(err => console.error('Failed to load region map:', err));
