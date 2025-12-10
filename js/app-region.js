// js/app-region.js
(function () {
  // ---- base map ----
  const map = L.map("map", {
    center: [37.5, 137.5],
    zoom: 6,
    preferCanvas: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // ---- UI panel ----
  const panel = L.control({ position: "topleft" });
  panel.onAdd = function () {
    const div = L.DomUtil.create("div", "panel");
    div.id = "regionPanel";
    div.innerHTML = `
      <div><b>Regions</b></div>
      <div style="margin-top:6px; display:flex; gap:6px;">
        <button id="btnAll" type="button">Select all</button>
        <button id="btnClear" type="button">Clear</button>
      </div>
      <div id="regionList" style="margin-top:8px; display:flex; flex-direction:column; gap:4px;"></div>
    `;
    return div;
  };
  panel.addTo(map);

  // ---- helpers (popup & icon) ----
  const IMG_BASE = "img/";
  const PLACEHOLDER = "_placeholder.png";

  function iconUrlFrom(props) {
    const f = (props.icon || "").trim();
    return f ? `${IMG_BASE}${f}` : `${IMG_BASE}${PLACEHOLDER}`;
  }

  function stipendText(props) {
    const raw = (props.stipend ?? "").toString().trim();
    if (!raw) return "—";
    const n = Number(raw.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return `${n} 万石`;
    return raw;
  }

  function popupHTML(p) {
    return `
      <div class="popup-card">
        <div class="popup-header">
          <img class="popup-icon" src="${iconUrlFrom(p)}" alt="${p.name || ""}"
               onerror="this.onerror=null;this.src='${IMG_BASE}${PLACEHOLDER}';"/>
          <div class="popup-title">${p.name || p.region || ""}</div>
        </div>
        ${p.country ? `<div><b>${p.country}</b></div>` : ""}
        ${p.prefecture ? `<div>${p.prefecture}</div>` : ""}
        ${p.daimyo ? `<div>Daimyo: ${p.daimyo}</div>` : ""}
        <div>Stipend: ${stipendText(p)}</div>
        ${p.wikipedia_url ? `<div style="margin-top:6px"><a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>` : ""}
      </div>
    `;
  }

  const pin = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -28],
    shadowSize: [41, 41]
  });

  // ---- state ----
  let allFeatures = [];
  let layerGroup = L.layerGroup().addTo(map);
  const selected = new Set(); // selected regions

  // ---- renderers ----
  function renderMarkers() {
    layerGroup.clearLayers();
    allFeatures.forEach(f => {
      const r = (f.properties.region || "").trim();
      if (selected.size === 0 || selected.has(r)) {
        const m = L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], { icon: pin })
          .bindPopup(popupHTML(f.properties), { maxWidth: 340 });
        layerGroup.addLayer(m);
      }
    });
  }

  function renderRegionCheckboxes(regions) {
    const list = document.getElementById("regionList");
    list.innerHTML = regions.map(r => `
      <label style="display:flex; gap:6px; align-items:center">
        <input type="checkbox" class="regionBox" value="${r}" checked>
        <span>${r}</span>
      </label>
    `).join("");

    // initialize selected to ALL
    selected.clear(); regions.forEach(r => selected.add(r));

    list.querySelectorAll(".regionBox").forEach(cb => {
      cb.addEventListener("change", () => {
        if (cb.checked) selected.add(cb.value); else selected.delete(cb.value);
        renderMarkers();
      });
    });

    document.getElementById("btnAll").onclick = () => {
      selected.clear(); regions.forEach(r => selected.add(r));
      list.querySelectorAll(".regionBox").forEach(cb => (cb.checked = true));
      renderMarkers();
    };
    document.getElementById("btnClear").onclick = () => {
      selected.clear();
      list.querySelectorAll(".regionBox").forEach(cb => (cb.checked = false));
      renderMarkers();
    };
  }

  // ---- load data (same file as main map!) ----
  fetch("data/daimyo_domains.geojson", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`GeoJSON load failed: ${r.status}`);
      return r.json();
    })
    .then(gj => {
      // store
      allFeatures = gj.features.filter(f => f && f.geometry && f.geometry.type === "Point");
      // collect unique, non-empty regions
      const regions = Array.from(new Set(allFeatures.map(f => (f.properties.region || "").trim()).filter(Boolean))).sort();
      renderRegionCheckboxes(regions);
      renderMarkers();
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load daimyo domains data (region view).");
    });

  // ---- styles ----
  const css = `
  .panel{background:#fff;padding:10px 12px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.12);font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
  .panel button{padding:4px 8px;border-radius:6px;border:1px solid #ddd;background:#f8f8f8;cursor:pointer}
  .panel button:hover{background:#f1f1f1}
  .popup-card{font:14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;min-width:240px}
  .popup-header{display:flex;gap:10px;align-items:center;margin-bottom:6px}
  .popup-icon{width:28px;height:28px;border-radius:4px;border:2px solid rgba(0,0,0,.25);box-sizing:border-box}
  .popup-title{font-weight:700}
  `;
  const tag = document.createElement("style");
  tag.textContent = css;
  document.head.appendChild(tag);
})();
