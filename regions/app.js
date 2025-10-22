/* Regions variant — no clustering + region filter */
window.__APP_BUILD__ = "regions-2025-10-22-02"; console.log("[regions] build", window.__APP_BUILD__);

// Map ------------------------------------------------
const map = L.map("map", { zoomControl: true, preferCanvas: true });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
map.setView([36.2, 138.0], 5);

// Helpers -------------------------------------------
function htmlEscape(s) {
  s = String(s ?? "");
  s = s.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
  return s;
}
function iconFor(p, px = 32) {
  const src = p.Mon_Local ? ("../" + p.Mon_Local) : "../imgs/fallback.png"; // note ../
  const size = Math.round(px);
  return L.divIcon({
    className: "crest-icon",
    html: `<img class="crest-img" src="${htmlEscape(src)}" alt="" loading="lazy" style="width:${size}px;height:${size}px;">`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2],
  });
}

// Wikipedia URL (same behavior as main map, short form)
const URL_OVERRIDES = {
  "kokura shinden": "https://ja.wikipedia.org/wiki/%E5%B0%8F%E5%80%89%E6%96%B0%E7%94%B0%E8%97%A9",
  "小倉新田": "https://ja.wikipedia.org/wiki/%E5%B0%8F%E5%80%89%E6%96%B0%E7%94%B0%E8%97%A9",
  "itoigawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itoigawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
};
function buildWikiFallback(props) {
  const title = props.Wikipedia_Title || props.Han_Name || props.Name;
  if (!title) return "";
  const lang = (props.Wikipedia_Lang || "en").toLowerCase();
  const base = lang === "ja" ? "https://ja.wikipedia.org/wiki/" : "https://en.wikipedia.org/wiki/";
  let t = title.replace(/\s+/g, "_");
  if (lang === "en" && !/(_Domain|_domain)$/i.test(t) && !/Domain$/i.test(title)) t = `${t}_Domain`;
  if (lang === "ja" && !/藩/.test(title)) t = `${t}藩`;
  return base + encodeURIComponent(t);
}
function effectiveWikiUrl(props) {
  // 1) Start from audited URL if present
  let u = props.Wikipedia_URL;
  if (typeof u === "string") u = u.trim();

  // 2) Normalizer (handles English “_Han” tails etc.)
  const normalize = (url) => {
    if (!url) return "";
    try {
      const a = new URL(url);
      // Always https
      a.protocol = "https:";
      // English wiki: make sure we land on “…_Domain”
      if (/^en\.wikipedia\.org$/i.test(a.hostname)) {
        // If the path ends in “…_Han” (or “Han” right after /wiki/)
        a.pathname = a.pathname.replace(/\/wiki\/([^?#]+?)(?:_Han|%5FHan)(?=$|[?#])/i, "/wiki/$1_Domain");
      }
      return a.toString();
    } catch {
      return url; // if URL ctor fails, return as-is
    }
  };

  // 3) If audited URL exists, use it (after normalization)
  if (u && /^https?:\/\//i.test(u)) return normalize(u);

  // 4) Try legacy fields if they are already full URLs
  const legacy = props.Wikipedia_Link || props.Wikipedia || props["Wikipedia link"] || props["Wikipedia_Link"] || "";
  if (legacy && /^https?:\/\//i.test(legacy)) return normalize(legacy);

  // 5) Fall back to building from the title (as on main map)
  return normalize(buildWikiFallback(props));
}
function popupHtml(p) {
  const title = p.Wikipedia_Title || p.Han_Name || p.Name || "Domain";
  const fam = p.Daimyo_Family ? `${htmlEscape(p.Daimyo_Family)} 家` : "";
  const kokuVal = p.Stipend_Koku ?? p.Stipend_koku ?? p["Stipend Koku"] ?? null;
  const koku = kokuVal != null ? `・ 俸禄: ${htmlEscape(kokuVal)} 石` : "";
  const town = p.Castle_Town ? htmlEscape(p.Castle_Town) : "";
  const wiki = effectiveWikiUrl(p);
  const link = wiki ? `<div class="popup-links"><a data-wiki href="${htmlEscape(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>` : "";
  return `
    <div class="popup">
      <h3>${htmlEscape(title)}</h3>
      <div class="popup-sub">${fam}${koku}</div>
      <div>${town}</div>
      ${link}
    </div>`;
}

// Regions (coarse bounding boxes) --------------------
// [westLng, southLat, eastLng, northLat]
const REGION_DEFS = {
  "Ezo–Tohoku":  [138.0, 36.8, 146.6, 46.6],
  "Kantō":       [138.0, 35.0, 141.6, 37.9],
  "Kōshin’etsu": [137.0, 35.2, 139.9, 38.9],
  "Tōkai":       [136.0, 34.2, 139.2, 36.9],
  "Kinki":       [134.0, 33.8, 136.9, 35.9],
  "Chūgoku":     [130.0, 33.8, 134.9, 35.9],
  "Shikoku":     [132.0, 32.7, 134.9, 34.5],
  "Kyūshū":      [129.0, 31.0, 132.3, 33.9],
};
const REGION_ORDER = Object.keys(REGION_DEFS);
function pointInBox(lng, lat, [w,s,e,n]) { return lng>=w && lng<=e && lat>=s && lat<=n; }
function whichRegion(lng, lat) {
  for (const name of REGION_ORDER) if (pointInBox(lng, lat, REGION_DEFS[name])) return name;
  return null;
}

// Data + markers ------------------------------------
const allMarkers = [];
const regionGroups = {};
for (const r of REGION_ORDER) regionGroups[r] = L.layerGroup().addTo(map);

(async function () {
  const url = "../data/daimyo_castles.geojson?cb=" + Date.now(); // note ../
  const resp = await fetch(url);
  if (!resp.ok) { alert("Failed to load data"); return; }
  const gj = await resp.json();

  const z0 = map.getZoom();
  const size = Math.max(20, Math.min(44, 20 + Math.max(0, (z0-4)*3)));

  gj.features.forEach((f) => {
    const g = f.geometry || {};
    if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;
    const [lng, lat] = g.coordinates;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const p = f.properties || {};
    const m = L.marker([lat, lng], { icon: iconFor(p, size) }).bindPopup(popupHtml(p));
    m.__props = p;
    m.__region = whichRegion(lng, lat) || "Kantō";
    allMarkers.push(m);
    regionGroups[m.__region].addLayer(m);
  });

  try {
    const b = L.featureGroup(allMarkers).getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.08));
  } catch {}

  map.on("zoomend", () => {
    const z = map.getZoom();
    const s = Math.max(20, Math.min(44, 20 + Math.max(0, (z-4)*3)));
    allMarkers.forEach((m) => m.setIcon(iconFor(m.__props, s)));
  });

  buildControlsUI();
})();

// UI wiring -----------------------------------------
function buildControlsUI() {
  const rows = document.getElementById("region-rows");
  rows.innerHTML = "";
  REGION_ORDER.forEach((name, i) => {
    const id = `r_${i}`;
    const el = document.createElement("label");
    el.innerHTML = `<input type="checkbox" id="${id}" checked> ${name}`;
    rows.appendChild(el);
    el.querySelector("input").addEventListener("change", (ev) => {
      if (ev.target.checked) regionGroups[name].addTo(map);
      else map.removeLayer(regionGroups[name]);
    });
  });
  document.getElementById("btn-show-all").onclick = () => {
    REGION_ORDER.forEach((name, i) => { document.getElementById(`r_${i}`).checked = true; regionGroups[name].addTo(map); });
  };
  document.getElementById("btn-hide-all").onclick = () => {
    REGION_ORDER.forEach((name, i) => { document.getElementById(`r_${i}`).checked = false; map.removeLayer(regionGroups[name]); });
  };
}




