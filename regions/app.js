/* Regions variant — no clustering + region filter
   daimyo-map/regions/app.js
*/
window.__APP_BUILD__ = "regions-2025-10-22-14";

// ------------------------ Map ------------------------
const map = L.map("map", { zoomControl: true, preferCanvas: true });
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);
map.setView([36.2, 138.0], 5);

// ---------------------- Helpers ----------------------
function htmlEscape(s) {
  s = String(s ?? "");
  s = s.split("&").join("&amp;");
  s = s.split("<").join("&lt;");
  s = s.split(">").join("&gt;");
  s = s.split('"').join("&quot;");
  return s;
}

// DivIcon with <img> so we can resize on zoom
function iconFor(p, px = 32) {
  const src = p.Mon_Local ? ("../" + p.Mon_Local) : "../imgs/fallback.png"; // NOTE ../
  const size = Math.round(px);
  return L.divIcon({
    className: "crest-icon",
    html:
      `<img class="crest-img" src="${htmlEscape(src)}" alt="" loading="lazy"` +
      ` style="width:${size}px;height:${size}px;">`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Smooth-ish size curve: clamp 20–44 px across zoom 4–12
function sizeForZoom(z) {
  const px = 20 + Math.max(0, (z - 4) * 3);
  return Math.max(20, Math.min(44, px));
}

// ---------------- Wikipedia URLs ---------------------
const URL_OVERRIDES = {
  // Specific audits/fixes
  "itoigawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itoigawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  // JA wiki override requested
  "kokura shinden": "https://ja.wikipedia.org/wiki/%E5%B0%8F%E5%80%89%E6%96%B0%E7%94%B0%E8%97%A9",
  "小倉新田": "https://ja.wikipedia.org/wiki/%E5%B0%8F%E5%80%89%E6%96%B0%E7%94%B0%E8%97%A9",
};

function buildWikiFallback(props) {
  const title = props.Wikipedia_Title || props.Han_Name || props.Name;
  if (!title) return "";
  const lang = (props.Wikipedia_Lang || "en").toLowerCase();
  const base = lang === "ja"
    ? "https://ja.wikipedia.org/wiki/"
    : "https://en.wikipedia.org/wiki/";
  let t = title.replace(/\s+/g, "_");
  if (lang === "en" && !/(_Domain|_domain)$/i.test(t) && !/Domain$/i.test(title)) {
    t = `${t}_Domain`;
  }
  if (lang === "ja" && !/藩/.test(title)) {
    t = `${t}藩`;
  }
  return base + encodeURIComponent(t);
}

function effectiveWikiUrl(props) {
  const key = (props.Han_Name || props.Name || "").toLowerCase();
  if (URL_OVERRIDES[key]) return URL_OVERRIDES[key];

  const normalize = (url) => {
    if (!url) return "";
    try {
      const a = new URL(url);
      a.protocol = "https:";
      if (/^en\.wikipedia\.org$/i.test(a.hostname)) {
        // Force “…_Domain” if needed (also handles %5F encodings)
        a.pathname = a.pathname.replace(
          /\/wiki\/([^?#]+?)(?:_Han|%5FHan)(?=$|[?#])/i,
          "/wiki/$1_Domain"
        );
      }
      return a.toString();
    } catch {
      return url;
    }
  };

  let u = props.Wikipedia_URL;
  if (typeof u === "string" && /^https?:\/\//i.test(u)) return normalize(u);

  const legacy =
    props.Wikipedia_Link ||
    props.Wikipedia ||
    props["Wikipedia link"] ||
    props["Wikipedia_Link"] ||
    "";
  if (legacy && /^https?:\/\//i.test(legacy)) return normalize(legacy);

  return normalize(buildWikiFallback(props));
}

function popupHtml(p) {
  const title = p.Wikipedia_Title || p.Han_Name || p.Name || "Domain";
  const fam = p.Daimyo_Family ? `${htmlEscape(p.Daimyo_Family)} 家` : "";
  const kokuVal = p.Stipend_Koku ?? p.Stipend_koku ?? p["Stipend Koku"] ?? null;
  const koku = kokuVal != null ? `・ 俸禄: ${htmlEscape(kokuVal)} 石` : "";
  const town = p.Castle_Town ? htmlEscape(p.Castle_Town) : "";
  const wiki = effectiveWikiUrl(p);
  const link = wiki
    ? `<div class="popup-links"><a data-wiki href="${htmlEscape(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`
    : "";
  return `
    <div class="popup">
      <h3>${htmlEscape(title)}</h3>
      <div class="popup-sub">${fam}${koku}</div>
      <div>${town}</div>
      ${link}
    </div>`;
}

// ---------------- Regions (boxes) --------------------
// [westLng, southLat, eastLng, northLat]
const REGION_DEFS = {
  "Ezo–Tohoku":  [138.0, 36.8, 146.6, 46.6],
  "Kantō":       [138.3, 34.5, 141.6, 37.9],
  "Kōshin’etsu": [137.0, 35.0, 140.2, 38.9],
  "Tōkai":       [136.0, 33.5, 139.4, 36.9],
  "Kinki":       [133.0, 33.2, 137.9, 36.3],
  "Chūgoku":     [130.0, 33.3, 135.2, 36.3],
  "Shikoku":     [132.0, 32.5, 135.1, 34.6],
  "Kyūshū":      [127.0, 24.0, 132.6, 35.3], // includes Tsushima, Gotō, Okinawa
};

const REGION_ORDER = Object.keys(REGION_DEFS);

// Name-based overrides (run before boxes)
const REGION_NAME_OVERRIDES = [
  // Shikoku fixes
  { test: /(marugame|丸亀)/i,                           region: "Shikoku" },
  { test: /(tadotsu|多度津)/i,                           region: "Shikoku" },
  { test: /(saij[oō]|西条)/i,                            region: "Shikoku" },
  { test: /(iyo).*komatsu|komatsu.*(iyo)|伊予小松/i,      region: "Shikoku" },
  { test: /(imabari|今治)/i,                             region: "Shikoku" },
  { test: /(iyo).*matsuyama|matsuyama.*(iyo)|伊予松山/i,  region: "Shikoku" },
  // Kyūshū fixes
  { test: /(kokura).*shinden|小倉新田/i,                 region: "Kyūshū" },
  { test: /(ryūkyū|ryukyu|琉球|okinawa|沖縄)/i,          region: "Kyūshū" },
  { test: /(tsushima|対馬)/i,                            region: "Kyūshū" },
  { test: /(fukue|福江|五島|goto)/i,                     region: "Kyūshū" },
  // Hokuriku → Kōshin’etsu fixes
  { test: /(kaga|加賀)/i,                                region: "Kōshin’etsu" },
  { test: /(daish[oō]ji|大聖寺)/i,                       region: "Kōshin’etsu" },
  { test: /(maruoka|丸岡)/i,                             region: "Kōshin’etsu" },
  { test: /(fukui|福井)/i,                               region: "Kōshin’etsu" },
  { test: /(sabae|鯖江)/i,                               region: "Kōshin’etsu" },
  { test: /(maruyama|丸山)/i,                            region: "Kōshin’etsu" },
  { test: /(katsuyama|勝山)/i,                            region: "Kōshin’etsu" },
  { test: /(^|\b)(ono|大野)(\b|藩)/i,                     region: "Kōshin’etsu" },
  // Chūgoku fixes
  { test: /(shikano|鹿野)/i,                             region: "Chūgoku" },
  { test: /(tottori).*nishitate.*shinden|鳥取西館新田/i,  region: "Chūgoku" },
  { test: /(tsuyama|津山)/i,                             region: "Chūgoku" },
  { test: /(mikusa|三日市|三草)/i,                        region: "Chūgoku" },
  // Shikoku (re-check)
  { test: /(takamatsu|高松).*domain|^高松藩$/i,           region: "Shikoku" },
  { test: /(tokushima|徳島)/i,                           region: "Shikoku" },
];

// Tiny helpers required by resolver
function pointInBox(lng, lat, box) {
  const [w, s, e, n] = box;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

function whichRegion(lng, lat) {
  for (const name of REGION_ORDER) {
    if (pointInBox(lng, lat, REGION_DEFS[name])) return name;
  }
  return "Kantō";
}

// Master resolver: try name override, else box, else fallback
function resolveRegionForFeature(props, lng, lat) {
  const name = (props.Han_Name || props.Name || "").toLowerCase();
  for (const rule of REGION_NAME_OVERRIDES) {
    try { if (rule.test.test(name)) return rule.region; } catch (e) {}
  }
  return whichRegion(lng, lat) || "Kantō";
}

// ---------------- Data + markers ---------------------
const allMarkers = [];
const regionGroups = {};
for (const r of REGION_ORDER) regionGroups[r] = L.layerGroup().addTo(map);

(async function () {
  const url = "../data/daimyo_castles.geojson?cb=" + Date.now(); // NOTE ../
  let gj;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`GeoJSON fetch failed: ${resp.status} ${resp.statusText}`);
    gj = await resp.json();
  } catch (err) {
    console.error(err);
    alert("Failed to load data. Please reload.");
    return;
  }

  const z0 = map.getZoom();
  const size = sizeForZoom(z0);

  gj.features.forEach((f) => {
    const g = f.geometry || {};
    if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;
    const [lng, lat] = g.coordinates;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const p = f.properties || {};
    const m = L.marker([lat, lng], { icon: iconFor(p, size) }).bindPopup(popupHtml(p));
    m.__props = p;
    m.__region = resolveRegionForFeature(p, lng, lat);
    allMarkers.push(m);
    regionGroups[m.__region]?.addLayer(m);
  });

  try {
    const b = L.featureGroup(allMarkers).getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.08));
  } catch {}

  map.on("zoomend", () => {
    const s = sizeForZoom(map.getZoom());
    allMarkers.forEach((m) => m.setIcon(iconFor(m.__props, s)));
  });

  buildControlsUI();
})();

// ---------------------- UI ---------------------------
function buildControlsUI() {
  const rows = document.getElementById("region-rows");
  if (rows) rows.innerHTML = ""; // in case you later add checkboxes per-region

  // Minimal UI: Show all / Hide all buttons wired to groups
  const show = document.getElementById("btn-show-all");
  const hide = document.getElementById("btn-hide-all");
  if (show) show.onclick = () => {
    REGION_ORDER.forEach((name) => regionGroups[name]?.addTo(map));
  };
  if (hide) hide.onclick = () => {
    REGION_ORDER.forEach((name) => map.removeLayer(regionGroups[name]));
  };
}


