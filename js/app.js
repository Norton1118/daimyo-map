// === Main map with clustering ===
const DATA_URL = 'data/daimyo_domains.geojson';  // <-- single source of truth

const map = L.map('map', {
  preferCanvas: true
}).setView([37.5, 138], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

// marker cluster
const clusters = L.markerClusterGroup({
  disableClusteringAtZoom: 9,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false
});
map.addLayer(clusters);

// icon factory (reads props.icon; accepts filename or relative path)
function crestIcon(props) {
  let iconPath = props.icon || '';
  if (iconPath && !iconPath.startsWith('img/')) {
    iconPath = `img/mon/${iconPath}`;
  }
  // URL-encode spaces etc., but keep slashes
  const url = iconPath ? encodeURI(iconPath) : null;

  return url ? L.icon({
    iconUrl: url,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -10],
    className: 'crest-icon'
  }) : undefined;
}

// popup HTML (shared structure)
function popupHTML(p) {
  const parts = [];
  const icon = p.icon ? (p.icon.startsWith('img/') ? p.icon : `img/mon/${p.icon}`) : null;
  if (icon) {
    parts.push(`<img class="popup-icon" src="${encodeURI(icon)}" alt="">`);
  }
  const title = p['Han Name'] || p.name || p.han || p.title || '—';
  parts.push(`<span class="popup-title">${title}</span>`);

  const rows = [];
  if (p['Current Prefecture'] || p.prefecture) {
    rows.push(`<div class="popup-row">${p['Current Prefecture'] || p.prefecture}</div>`);
  } else if (p.notes) {
    rows.push(`<div class="popup-row">${p.notes}</div>`);
  }

  if (p.Daimyo || p.daimyo) {
    rows.push(`<div class="popup-row">Daimyo: ${p.Daimyo || p.daimyo}</div>`);
  }
  if (p.Stipend || p.stipend) {
    const val = p.Stipend || p.stipend;
    rows.push(`<div class="popup-row">Stipend: ${val} (Man-koku)</div>`);
  }
  if (p['Shogunate Land, Branch Han, Notes']) {
    rows.push(`<div class="popup-row">${p['Shogunate Land, Branch Han, Notes']}</div>`);
  }
  if (p.Wikipedia || p.wikipedia) {
    const href = p.Wikipedia || p.wikipedia;
    rows.push(
      `<div class="popup-row" style="margin-top:4px;"><a href="${href}" target="_blank" rel="noopener">Wikipedia</a></div>`
    );
  }

  return `<div>${parts.join('')}</div>${rows.join('')}`;
}

function pointToLayer(feature, latlng) {
  const icon = crestIcon(feature.properties);
  return icon ? L.marker(latlng, { icon }) : L.marker(latlng);
}

function onEachFeature(feature, layer) {
  layer.bindPopup(popupHTML(feature.properties));
}

async function loadGeoJSON() {
  const res = await fetch(`${DATA_URL}?t=${Date.now()}`); // cache-buster while iterating
  if (!res.ok) {
    console.error('GeoJSON fetch failed:', res.status, await res.text());
    return;
  }
  const gj = await res.json();
  const layer = L.geoJSON(gj, { pointToLayer, onEachFeature });
  clusters.addLayer(layer);
}

loadGeoJSON();
