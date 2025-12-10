// js/app.js
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

  // ---- helpers ----
  const IMG_BASE = "img/";                    // relative to repo root
  const PLACEHOLDER = "_placeholder.png";     // put a tiny generic crest here if you want

  function iconUrlFrom(props) {
    const f = (props.icon || "").trim();
    return f ? `${IMG_BASE}${f}` : `${IMG_BASE}${PLACEHOLDER}`;
  }

  function formatStipend(props) {
    // Your GeoJSON has stipend as a string number (e.g., "3").
    // Show "Stipend: 3 万石". If missing/empty, show "—".
    const raw = (props.stipend ?? "").toString().trim();
    if (!raw) return "—";
    const n = Number(raw.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return `${n} 万石`;
    return raw; // if it’s some text, just show it
  }

  function popupHTML(props) {
    const stipend = formatStipend(props);
    const lines = [
      `<div class="popup-card">`,
      `<div class="popup-header">`,
      `<img class="popup-icon" src="${iconUrlFrom(props)}" alt="${props.name || ""}" onerror="this.onerror=null;this.src='${IMG_BASE}${PLACEHOLDER}';"/>`,
      `<div class="popup-title">${props.name || props.region || ""}</div>`,
      `</div>`,
      `<div class="popup-body">`,
      props.country ? `<div><b>${props.country}</b></div>` : "",
      props.prefecture ? `<div>${props.prefecture}</div>` : "",
      props.daimyo ? `<div>Daimyo: ${props.daimyo}</div>` : "",
      `<div>Stipend: ${stipend}</div>`,
      props.wikipedia_url
        ? `<div style="margin-top:6px"><a href="${props.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>`
        : "",
      `</div>`,
      `</div>`
    ].join("");
    return lines;
  }

  // simple marker icon so the crest shows **inside** the popup, not as marker icon
  const bluePin = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -28],
    shadowSize: [41, 41]
  });

  // ---- load data ----
  fetch("data/daimyo_domains.geojson", { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`GeoJSON load failed: ${r.status}`);
      return r.json();
    })
    .then(geojson => {
      L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: bluePin }),
        onEachFeature: (feature, layer) => {
          layer.bindPopup(popupHTML(feature.properties), { maxWidth: 340 });
        }
      }).addTo(map);
    })
    .catch(err => {
      console.error(err);
      alert("Failed to load daimyo domains data.");
    });

  // ---- minimal styles injected once ----
  const css = `
  .popup-card{font:14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
              min-width:240px}
  .popup-header{display:flex; gap:10px; align-items:center; margin-bottom:6px}
  .popup-icon{width:28px; height:28px; border-radius:4px; border:2px solid rgba(0,0,0,.25); box-sizing:border-box}
  .popup-title{font-weight:700}
  `;
  const tag = document.createElement("style");
  tag.textContent = css;
  document.head.appendChild(tag);
})();
