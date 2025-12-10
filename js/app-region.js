function buildPopupHTML(p) {
  const title = (p["Han Name"] && p["Han Name"].trim()) ? p["Han Name"] : p["Country (region group)"];
  const notes = p["Shogunate Land, Branch Han, Notes"];
  const prefect = p["Current Prefecture"];
  const daimyo = p["Daimyo"];
  const stipend = p["Stipend"];
  const wiki = p["wiki"];

  let iconPath = p.icon || p["icon"];
  if (iconPath) iconPath = encodeURI(iconPath);
  if (iconPath && !/^https?:/.test(iconPath)) {
    iconPath = encodeURI(iconPath.startsWith("img/") ? iconPath : `img/${iconPath}`);
  }

  const parts = [];
  if (iconPath) parts.push(`<div><img class="popup-icon" src="${iconPath}" alt="" /></div>`);
  parts.push(`<div class="popup-title">${title || ""}</div>`);
  if (notes) parts.push(`<div class="popup-line">${notes}</div>`);
  if (prefect) parts.push(`<div class="popup-line">${prefect}</div>`);
  if (daimyo) parts.push(`<div class="popup-line">Daimyo: ${daimyo}</div>`);
  if (stipend != null && `${stipend}`.trim() !== "") parts.push(`<div class="popup-line">Stipend: ${stipend} (Man-koku)</div>`);
  if (wiki) parts.push(`<div class="popup-line" style="margin-top:4px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>`);
  return parts.join("");
}

(function () {
  const map = L.map('map').setView([38.5, 137.5], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Layer buckets per Region (B/C fields in your sheet)
  const regionKey = "Region"; // column name
  const layersByRegion = {};   // { "Kantō": L.LayerGroup(), ... }
  const layerControl = L.layerGroup().addTo(map);

  // Build UI when we know distinct regions
  function renderRegionPanel(regions) {
    const panel = document.getElementById("regionPanel");
    // remove old checkboxes
    panel.querySelectorAll("label[data-r]").forEach(n => n.remove());

    regions.sort().forEach(r => {
      const id = `r_${r.replace(/[^\w]+/g, "_")}`;
      const label = document.createElement("label");
      label.setAttribute("data-r", r);
      label.innerHTML = `<input type="checkbox" id="${id}" checked> ${r}`;
      panel.appendChild(label);

      document.getElementById(id).addEventListener("change", (e) => {
        if (e.target.checked) {
          map.addLayer(layersByRegion[r]);
        } else {
          map.removeLayer(layersByRegion[r]);
        }
      });
    });

    document.getElementById("selectAll").onclick = () => {
      Object.keys(layersByRegion).forEach(r => {
        map.addLayer(layersByRegion[r]);
        panel.querySelector(`label[data-r="${r}"] input`).checked = true;
      });
    };
    document.getElementById("clearAll").onclick = () => {
      Object.keys(layersByRegion).forEach(r => {
        map.removeLayer(layersByRegion[r]);
        panel.querySelector(`label[data-r="${r}"] input`).checked = false;
      });
    };
  }

  fetch('data/daimyo_domains.geojson?v=mk=5')
    .then(r => r.json())
    .then(geojson => {
      // create empty groups by region
      const regions = new Set();

      // pre-scan to create groups
      (geojson.features || []).forEach(f => {
        const p = f.properties || {};
        const r = p[regionKey] || "Unknown";
        regions.add(r);
      });

      regions.forEach(r => { layersByRegion[r] = L.layerGroup(); });

      // build features
      const featureLayer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => L.marker(latlng),
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          layer.bindPopup(buildPopupHTML(p));
          const r = p[regionKey] || "Unknown";
          layersByRegion[r].addLayer(layer);
        }
      });

      // add all groups initially
      Object.values(layersByRegion).forEach(g => map.addLayer(g));
      renderRegionPanel([...regions]);

      // keep a reference (optional)
      layerControl.addLayer(featureLayer);
    })
    .catch(err => {
      console.error('Failed to load map (region):', err);
    });
})();
