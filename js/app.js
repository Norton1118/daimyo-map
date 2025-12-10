// --- Helpers ---------------------------------------------------------------
function iconFromFeature(feat) {
  // Expect an icon name like "108_kaga.png" in feature.properties.icon
  // If your data only has an id/slug, build the filename here.
  const iconName = feat.properties.icon || "";        // e.g., "108_kaga.png"
  const src = iconName ? `img/${iconName}` : "img/_placeholder.png";
  // Use a DivIcon with an <img> so we can onerror → fallback
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
  // normalize to number if it parses
  const n = Number(value);
  return Number.isFinite(n) ? `${n} (Man-koku)` : `${value} (Man-koku)`;
}

function popupHTML(p) {
  const parts = [];
  // Title: Han Name or fallback to Country/Region if empty
  const title = (p["Han Name"] && String(p["Han Name"]).trim()) || (p["Country (region group)"] || p.region || "—");
  parts.push(`<div><strong>${title}</strong></div>`);

  if (p["Current Prefecture"] || p.prefecture) {
    parts.push(`<div>${p["Current Prefecture"] || p.prefecture}</div>`);
  }
  if (p.daimyo) {
    parts.push(`<div>Daimyo: ${p.daimyo}</div>`);
  }
  if (p.stipend !== undefined) {
    parts.push(`<div>Stipend: ${fmtStipend(p.stipend)}</div>`);
  }
  // F-column “notes”
  if (p["Shogunate Land, Branch Han, Notes"] || p.notes) {
    parts.push(`<div style="margin-top:4px">${p["Shogunate Land, Branch Han, Notes"] || p.notes}</div>`);
  }
  if (p.wikipedia) {
    parts.push(`<div style="margin-top:4px"><a href="${p.wikipedia}" target="_blank" rel="noopener">Wikipedia</a></div>`);
  }
  // Optional icon preview in popup
  const iconName = p.icon || "";
  const iconSrc = iconName ? `img/${iconName}` : "img/_placeholder.png";
  parts.unshift(`<div class="popup-icon"><img src="${iconSrc}" alt="" onerror="this.onerror=null;this.src='img/_placeholder.png';"></div>`);
  return parts.join("");
}

// --- Map -------------------------------------------------------------------
const map = L.map('map', { zoomControl: true }).setView([36.2048, 138.2529], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  disableClusteringAtZoom: 9
});

fetch('data/daimyo_domains.geojson')
  .then(r => {
    if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
    return r.json();
  })
  .then(geo => {
    L.geoJSON(geo, {
      pointToLayer: (feat, latlng) => {
        return L.marker(latlng, { icon: iconFromFeature(feat) });
      },
      onEachFeature: (feat, layer) => {
        layer.bindPopup(popupHTML(feat.properties), { maxWidth: 300 });
      }
    }).eachLayer(m => cluster.addLayer(m));
    map.addLayer(cluster);
  })
  .catch(err => console.error('Failed to load map:', err));
