// ---------- Config ----------
const DATA_URL = 'data/daimyo_domains.geojson';
const IMG_BASE = 'imgs/';               // << your folder is 'imgs/'
const PLACEHOLDER = 'img_placeholder.png'; // add a tiny placeholder in /imgs (optional)

// ---------- Helpers ----------
const numLike = v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v));

function crestUrl(iconFile) {
  if (!iconFile) return IMG_BASE + PLACEHOLDER;
  return IMG_BASE + encodeURIComponent(iconFile);
}

function stipendText(stipend) {
  if (numLike(stipend)) return `${Number(stipend)} (man-koku)`;
  return ''; // e.g., Shogunate land etc.
}

function popupHtml(p) {
  const crest = `<img class="popup-icon" src="${crestUrl(p.icon)}" alt="">`;
  const rows = [
    `<div class="popup-title">${p.name ?? ''}</div>`,
    p.region ? `<div class="popup-row">${p.region}</div>` : '',
    p.prefecture ? `<div class="popup-row">${p.prefecture}</div>` : '',
    p.daimyo ? `<div class="popup-row">Daimyo: ${p.daimyo}</div>` : '',
    stipendText(p.stipend) ? `<div class="popup-row">Stipend: ${stipendText(p.stipend)}</div>` : '',
    p.notes ? `<div class="popup-row">${p.notes}</div>` : '',
    p.wikipedia_url ? `<div class="popup-row"><a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>` : ''
  ].filter(Boolean).join('');

  return `<div style="display:flex;gap:10px;align-items:flex-start">
            ${crest}
            <div>${rows}</div>
          </div>`;
}

// ---------- Map ----------
const map = L.map('map', { preferCanvas: true }).setView([37.5, 137.5], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18, attribution: '&copy; OpenStreetMap'
}).addTo(map);

const cluster = L.markerClusterGroup({ showCoverageOnHover:false, maxClusterRadius: 48 });
map.addLayer(cluster);

// load data
fetch(DATA_URL)
  .then(r => r.json())
  .then(geo => {
    const layer = L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        const url = crestUrl(feat.properties?.icon);
        const icon = L.divIcon({
          html: `<img src="${url}" alt="">`,
          className: 'crest-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        return L.marker(latlng, { icon });
      },
      onEachFeature: (feat, layer) => {
        layer.bindPopup(popupHtml(feat.properties || {}), { maxWidth: 320 });
      }
    });
    cluster.addLayer(layer);
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));
