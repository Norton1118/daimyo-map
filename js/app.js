// Helper: unified popup builder used across both maps
function buildPopupHTML(p) {
  // Title priority: Han Name (C), else Country/B
  const title = (p["Han Name"] && p["Han Name"].trim()) ? p["Han Name"] : p["Country (region group)"];
  const notes = p["Shogunate Land, Branch Han, Notes"]; // F column
  const prefect = p["Current Prefecture"];
  const daimyo = p["Daimyo"];
  const stipend = p["Stipend"]; // numeric or string
  const wiki = p["wiki"];

  // icon path (URL-encoded so spaces work)
  let iconPath = p.icon || p["icon"];
  if (iconPath) iconPath = encodeURI(iconPath);          // handles spaces
  if (iconPath && !/^https?:/.test(iconPath)) {
    // ensure local relative path looks like "img/xxx.png"
    iconPath = encodeURI(iconPath.startsWith("img/") ? iconPath : `img/${iconPath}`);
  }

  const parts = [];
  if (iconPath) {
    parts.push(`<div class="popup-icon-wrap"><img class="popup-icon" src="${iconPath}" alt="" /></div>`);
  }
  parts.push(`<div class="popup-title">${title || ""}</div>`);
  if (notes) parts.push(`<div class="popup-line">${notes}</div>`);
  if (prefect) parts.push(`<div class="popup-line">${prefect}</div>`);
  if (daimyo) parts.push(`<div class="popup-line">Daimyo: ${daimyo}</div>`);
  if (stipend != null && `${stipend}`.trim() !== "") {
    parts.push(`<div class="popup-line">Stipend: ${stipend} (Man-koku)</div>`);
  }
  if (wiki) {
    parts.push(`<div class="popup-line" style="margin-top:4px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>`);
  }
  return parts.join("");
}

(function () {
  const map = L.map('map').setView([38.5, 137.5], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const cluster = L.markerClusterGroup();

  fetch('data/daimyo_domains.geojson?v=mk=5')
    .then(r => r.json())
    .then(geojson => {
      const layer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          const p = feature.properties || {};
          // use a small round marker; the icon image shows inside popup
          return L.marker(latlng);
        },
        onEachFeature: (feature, layer) => {
          layer.bindPopup(buildPopupHTML(feature.properties || {}));
        }
      });
      cluster.addLayer(layer);
      map.addLayer(cluster);
    })
    .catch(err => {
      console.error('Failed to load map:', err);
    });
})();
