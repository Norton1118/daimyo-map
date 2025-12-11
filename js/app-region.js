// --- CONFIG ---
const DATA_URL  = 'data/daimyo_domains.geojson';
const ICON_DIR  = 'imgs/';
const PLACEHOLDER = ICON_DIR + '_placeholder.png';

// --- MAP ---
const map = L.map('map', { zoomControl: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// --- helpers (same as main) ---
function iconUrl(name) { return name ? ICON_DIR + String(name) : PLACEHOLDER; }
function fmtStipend(v) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `${n} 万石` : '—';
}
function popupHtml(p) {
  const crest = `<img src="${iconUrl(p.icon)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" 
                   alt="" width="28" height="28" style="border:1px solid rgba(0,0,0,.25);border-radius:4px;box-sizing:border-box;">`;
  const lines = [];
  lines.push(`<div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
                ${crest}<b>${p.name ?? p.notes ?? ''}</b>
              </div>`);
  if (p.country)    lines.push(`${p.country}`);
  if (p.prefecture) lines.push(`${p.prefecture}`);
  if (p.daimyo)     lines.push(`Daimyo: ${p.daimyo}`);
  if (p.notes && (p.stipend === null || p.stipend === undefined || p.stipend === '')) {
    lines.push(`<i>${p.notes}</i>`);
  } else {
    lines.push(`Stipend: ${fmtStipend(p.stipend)}`);
  }
  if (p.wikipedia_url)
    lines.push(`<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`);
  return `<div style="line-height:1.25">${lines.join('<br>')}</div>`;
}

// --- region UI ---
const regions = ["Chūgoku","Ezo-Tohoku","Kantō","Kinki","Kyūshū","Kōshin'etsu","Shikoku","Tōkai"];
const panel = document.getElementById('regionPanel');
panel.innerHTML = `<div class="panel"><b>Regions</b>
  <div><button id="selAll">Select all</button> <button id="clrAll">Clear</button></div>
  ${regions.map(r => `<label style="display:block"><input type="checkbox" class="rchk" value="${r}" checked> ${r}</label>`).join('')}
</div>`;

const checks = [...panel.querySelectorAll('.rchk')];
panel.querySelector('#selAll').onclick = () => checks.forEach(c => { c.checked = true; update(); });
panel.querySelector('#clrAll').onclick = () => checks.forEach(c => { c.checked = false; update(); });

// --- feature layer (plain markers) ---
let allFeatures = [];
let layerGroup = L.layerGroup().addTo(map);

function makeMarker(f) {
  return L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
    icon: L.divIcon({
      className: 'crest-pin',
      html: `<div style="width:28px;height:28px;border-radius:6px;overflow:hidden;background:#fff;border:1px solid rgba(0,0,0,.3);box-shadow:0 1px 2px rgba(0,0,0,.2)">
               <img src="${iconUrl(f.properties.icon)}" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"
                    width="28" height="28" alt="">
             </div>`,
      iconSize: [28,28],
      iconAnchor: [14,28],
      popupAnchor: [0,-28]
    })
  }).bindPopup(popupHtml(f.properties));
}

function update() {
  const allowed = new Set(checks.filter(c => c.checked).map(c => c.value));
  layerGroup.clearLayers();
  const filtered = allFeatures.filter(f => allowed.has(f.properties.region));
  filtered.forEach(f => makeMarker(f).addTo(layerGroup));
  if (filtered.length) {
    const bounds = L.geoJSON({type:'FeatureCollection',features:filtered}).getBounds();
    map.fitBounds(bounds, { padding: [20,20] });
  }
}

// --- load data, render ---
fetch(DATA_URL)
  .then(r => r.json())
  .then(geo => {
    allFeatures = geo.features;
    update();
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));
