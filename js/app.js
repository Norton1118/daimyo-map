// app.js  — Daimyo castles map (with Wikipedia link in popup)

// ---------- Config ----------
const DATA_URL = 'data/daimyo_castles.geojson';

// icon sizes (square)
const ICON_PX = 36;                 // marker icon size
const ICON_HTML_PX = 36;            // <img> size inside the divIcon

// enable ?nocluster=1 to render raw markers (useful for debugging)
const params = new URLSearchParams(location.search);
const NO_CLUSTER = params.get('nocluster') === '1';

// ---------- Helpers ----------
function getWikiUrl(props) {
  const raw =
    props.Wikipedia_Link ||
    props.Wikipedia ||
    props['Wikipedia link'] ||
    props['Wikipedia_Link'] ||
    '';

  if (!raw) return null;

  // If it's already a URL, just use it
  if (/^https?:\/\//i.test(raw)) return raw.trim();

  // Normalize whitespace & dashes
  let s = String(raw).trim();

  // Common patterns like "Title - Wikipedia", "Title – Wikipedia", "Title — Wikipedia"
  s = s.replace(/\s*[-–—]\s*Wikipedia.*$/i, '');

  // If the string still has a " - something" suffix, keep only the part before the first dash
  if (/[–—-]/.test(s) && s.match(/\s*[–—-]\s*/)) {
    s = s.split(/\s*[–—-]\s*/)[0].trim();
  }

  if (!s) return null;

  // Build a wiki URL from the title
  const page = s.replace(/\s+/g, '_');     // spaces -> underscores
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(page);
}

function makePopupHtml(props) {
  const title =
    (props.Han_Name || props.Domain || 'Domain').toString().replace(/_/g, ' ');

  // Family + koku line (only if we have data)
  const family = props.Daimyo_Family ? `${props.Daimyo_Family} 家` : '';
  const koku =
    (props.Stipend_Koku || props.Stipend_koku || props.Stipend) != null
      ? `・ 俸禄: ${props.Stipend_Koku ?? props.Stipend_koku ?? props.Stipend} 石`
      : '';
  const line1 = [family, koku].filter(Boolean).join(' ');

  // Town line (Kanji + Romaji if present)
  let town = props.Castle_Town || '';
  // If there is "(Romaji)" inside, keep it; otherwise just show what we have
  const line2 = town ? town : '';

  // wiki link if we can build one
  const wiki = getWikiUrl(props);
  const linkHtml = wiki
    ? `<div class="popup-links"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>`
    : '';

  return `
    <div class="popup">
      <h3>${title}</h3>
      ${line1 ? `<div class="popup-sub">${line1}</div>` : ''}
      ${line2 ? `<div>${line2}</div>` : ''}
      ${linkHtml}
    </div>
  `;
}

function crestIcon(src, title) {
  const html = `
    <div class="crest-icon">
      <img class="crest-img" src="${src}" alt="${title}">
    </div>
  `;
  return L.divIcon({
    className: 'crest-icon-wrap',
    html,
    iconSize: [ICON_PX, ICON_PX],
    iconAnchor: [ICON_PX / 2, ICON_PX / 2],
    popupAnchor: [0, -ICON_PX / 2]
  });
}

// ---------- Map ----------
const map = L.map('map', {
  center: [36.5, 137.5],
  zoom: 6,
  minZoom: 4,
  maxZoom: 18,
  zoomControl: true
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ---------- Data ----------
fetch(DATA_URL)
  .then((r) => r.json())
  .then((geojson) => {
    const layer = NO_CLUSTER
      ? L.layerGroup().addTo(map)
      : L.markerClusterGroup({
          maxClusterRadius: 50,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true
        }).addTo(map);

    geojson.features.forEach((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const p = f.properties || {};

      // If we saved a local crest path during your PowerShell pass, use it; else fall back
      const crest =
        p.Mon_Local ||
        p.Mon_Image_URL ||
        p.crest ||
        'imgs/fallback.png';

      const title = p.Han_Name || p.Domain || 'Domain';

      const m = L.marker([lat, lng], {
        icon: crestIcon(crest, title)
      }).bindPopup(makePopupHtml(p), { closeButton: true });

      layer.addLayer(m);
    });
  })
  .catch((e) => {
    console.error('Failed to load GeoJSON:', e);
    alert('Failed to load data: ' + e);
  });
