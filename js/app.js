//// app.js — Daimyo Castles Map (Leaflet)
//// -------------------------------------
window.__APP_BUILD__ = "2025-10-22-13";
console.log("[app] build", window.__APP_BUILD__);

// --- URL flags --------------------------------------------------------------
const qs = new URLSearchParams(location.search);
const NO_CLUSTER = qs.has("nocluster");
const DEBUG = qs.has("dbg") || qs.has("debug");

// --- Map --------------------------------------------------------------------
const map = L.map("map", { zoomControl: true, preferCanvas: true });

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Default view; we’ll fit to data after load.
map.setView([36.2, 138.0], 5);

// --- Helpers ----------------------------------------------------------------
function htmlEscape(s) {
  s = String(s ?? "");
  s = s.split("&").join("&amp;");
  s = s.split("<").join("&lt;");
  s = s.split(">").join("&gt;");
  s = s.split("\"").join("&quot;");
  return s;
}

// Render-time URL overrides (belt & suspenders)
const URL_OVERRIDES = {
  "itoigawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itoigawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
  "itogawa han": "https://en.wikipedia.org/wiki/Itoigawa_Domain",
};

// Build a Wikipedia URL from title/name (fallback only)
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

// Prefer audited URL; only build if missing. Also apply overrides.
function effectiveWikiUrl(props) {
  const key = (props.Han_Name || props.Name || "").toLowerCase();
  if (URL_OVERRIDES[key]) return URL_OVERRIDES[key];

  const u = props.Wikipedia_URL;
  if (typeof u === "string" && /^https?:\/\//i.test(u)) return u.trim();

  const legacy =
    props.Wikipedia_Link ||
    props.Wikipedia ||
    props["Wikipedia link"] ||
    props["Wikipedia_Link"] || "";
  if (legacy && /^https?:\/\//i.test(legacy)) return legacy.trim();

  return buildWikiFallback(props);
}

// Marker icon (DivIcon with an <img> so we can resize on zoom)
function iconFor(p, px = 32) {
  const src = p.Mon_Local ? p.Mon_Local : "imgs/fallback.png";
  const cls = DEBUG ? "crest-icon crest-icon--debug" : "crest-icon";
  const size = Math.round(px);

  return L.divIcon({
    className: cls,
    html: `<img class="crest-img" src="${htmlEscape(src)}" alt="" loading="lazy" style="width:${size}px;height:${size}px;">`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Smooth-ish size curve: clamp 20–44 px across zoom 4–12
function sizeForZoom(z) {
  const px = 20 + (z - 4) * 3;
  return Math.max(20, Math.min(44, px));
}

function popupHtml(p) {
  const title = p.Wikipedia_Title || p.Han_Name || p.Name || "Domain";
  const fam = p.Daimyo_Family ? `${htmlEscape(p.Daimyo_Family)} 家` : "";
  const kokuVal = p.Stipend_Koku ?? p.Stipend_koku ?? p["Stipend Koku"] ?? null;
  const koku = kokuVal != null ? `・ 俸禄: ${htmlEscape(kokuVal)} 石` : "";
  const town = p.Castle_Town ? htmlEscape(p.Castle_Town) : "";
  const wiki = normalizeWikiUrl(effectiveWikiUrl(p), p);
  const link = wiki
    ? `<div class="popup-links"><a data-wiki href="${htmlEscape(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`
    : "";

  return `
    <div class="popup">
      <h3>${htmlEscape(title)}</h3>
      <div class="popup-sub">${fam}${koku}</div>
      <div>${town}</div>
      ${link}
    </div>
  `;
}

// --- Data + Markers ---------------------------------------------------------
(async function () {
  const geojsonUrl = `data/daimyo_castles.geojson?cb=${Date.now()}`;

  let gj;
  try {
    const resp = await fetch(geojsonUrl);
    if (!resp.ok) throw new Error(`GeoJSON fetch failed: ${resp.status} ${resp.statusText}`);
    gj = await resp.json();
  } catch (err) {
    console.error(err);
    alert("Failed to load map data. Please reload.");
    return;
  }

  const markers = [];
  const z0 = map.getZoom();

  gj.features.forEach((f) => {
    const p = f.properties || {};
    const g = f.geometry || {};
    if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;

    const [lng, lat] = g.coordinates;
    if (!isFinite(lat) || !isFinite(lng)) return;

    const px = sizeForZoom(z0);
    const m = L.marker([lat, lng], { icon: iconFor(p, px) }).bindPopup(popupHtml(p));
    m.__props = p;
    markers.push(m);
  });

  let layer;
  if (NO_CLUSTER) {
    layer = L.layerGroup(markers).addTo(map);
  } else {
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
    });
    markers.forEach((m) => cluster.addLayer(m));
    layer = cluster.addTo(map);
  }

  try {
    const b = L.featureGroup(markers).getBounds();
    if (b.isValid()) map.fitBounds(b.pad(0.08));
  } catch (_e) {}

  map.on("zoomend", () => {
    const px = sizeForZoom(map.getZoom());
    markers.forEach((m) => m.__props && m.setIcon(iconFor(m.__props, px)));
  });

  if (DEBUG) {
    console.log("[app] features:", gj.features?.length ?? 0);
    window.__features = gj.features;
    window.__markers = markers;
    window.__layer = layer;
  }
})();


function normalizeWikiUrl(u, props) {
  try {
    if (!u) return "";
    const m = u.match(/^https?:\/\/([^\/]+)\/wiki\/([^?#]+)/i);
    if (!m) return u;

    const host = m[1].toLowerCase();
    let page = decodeURIComponent(m[2]);

    // English Wikipedia uses "Domain", not "Han"
    if (host.startsWith("en.wikipedia.org")) {
      page = page.replace(/_Han$/i, "_Domain");
    }

    // Common misspelling safeguard
    page = page.replace(/^Itogawa/i, "Itoigawa");

    return `https://${host}/wiki/${encodeURIComponent(page)}`;
  } catch (_e) {
    return u;
  }
}

