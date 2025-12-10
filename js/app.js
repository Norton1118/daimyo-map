/* js/app.js — unified popups (with Notes + Man-koku) */
(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains.geojson?v=2025-12-10c';

  const START = { lat: 36.5, lon: 138.5, zoom: 5 };

  // ---------- MAP ----------
  const map = L.map('map', { zoomControl: true }).setView([START.lat, START.lon], START.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
  }).addTo(map);

  // ---------- Helpers ----------
  function formatStipend(v) {
    if (v == null || String(v).trim() === '') return '';
    // If it already includes "koku"/"Man", keep it; else append Man-koku
    const s = String(v).trim();
    if (/\b(koku|Man)/i.test(s)) return s;
    return `${s} (Man-koku)`;
  }

  function popupHTML(p) {
    const parts = [];

    if (p.prefecture) parts.push(p.prefecture);
    if (p.daimyo) parts.push(`Daimyo: ${p.daimyo}`);

    const stipend = formatStipend(p['stipend'] ?? p['stipend (Man Koku)']);
    if (stipend) parts.push(`Stipend: ${stipend}`);

    // ← NEW: always include Notes (column F) if present
    if (p.notes) parts.push(p.notes);

    if (p.wikipedia_url) {
      parts.push(`<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`);
    }

    const titleIcon = p.icon ? `<img src="icons/${p.icon}" style="width:22px;height:22px;vertical-align:middle;margin-right:6px;border-radius:3px;border:1px solid #333;background:#fff;">` : '';
    const title = `<div style="font-weight:600;font-size:14px;margin-bottom:6px;">${titleIcon}${p.name || p.han || ''}</div>`;

    return `${title}<div style="line-height:1.25">${parts.join('<br>')}</div>`;
  }

  function monIcon(p) {
    return L.icon({
      iconUrl: `icons/${p.icon}`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -10],
      className: 'mon-icon'
    });
  }

  // ---------- Data & Markers ----------
  const cluster = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50
  });

  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geo => {
      geo.features.forEach(f => {
        const p = f.properties || {};
        // build marker
        const m = L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
          icon: p.icon ? monIcon(p) : undefined
        });
        m.bindPopup(popupHTML(p));
        cluster.addLayer(m);
      });
      map.addLayer(cluster);
    })
    .catch(err => console.error('Failed to load GeoJSON', err));
})();
