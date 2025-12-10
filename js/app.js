/* Main map (clustered) */

(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains_with_man_koku.geojson';
  const ICON_BASE   = 'img/mon/';
  const DEFAULT_ICON = 'default.png';

  // ---------- MAP ----------
  const map = L.map('map', { minZoom: 4 }).setView([37.5, 137.5], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // cluster group
  const clusters = L.markerClusterGroup({ spiderfyOnMaxZoom: true });

  // helper: build icon (divIcon so <img onerror> can fallback)
  function monDivIcon(p) {
    const file = (p.icon && String(p.icon).trim()) ? p.icon.trim() : DEFAULT_ICON;
    const url  = ICON_BASE + file;
    const html = `<img src="${url}" alt="" onerror="this.onerror=null;this.src='${ICON_BASE + DEFAULT_ICON}'">`;
    return L.divIcon({
      className: 'mon-icon',
      html,
      iconSize: [36,36],
      iconAnchor: [18,18],
      popupAnchor: [0,-18]
    });
  }

  // helper: popup html
  function popupHTML(p) {
    const title = p.name || p.han || p.country || 'Domain';
    const notes = (p.notes && String(p.notes).trim()) ? p.notes.trim() : '';
    const rows = [];
    if (p.prefecture) rows.push(`<div><b>${p.prefecture}</b></div>`);
    if (p.daimyo)     rows.push(`<div>Daimyo: ${p.daimyo}</div>`);
    if (p.stipend)    rows.push(`<div>Stipend: ${p.stipend} (Man-koku)</div>`);
    if (notes)        rows.push(`<div style="margin-top:4px">${notes}</div>`);
    if (p.wikipedia_url) rows.push(`<div style="margin-top:6px"><a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>`);

    // small icon preview left of title
    const iconFile = (p.icon && String(p.icon).trim()) ? p.icon.trim() : DEFAULT_ICON;
    const iconUrl  = ICON_BASE + iconFile;

    return `
      <div class="popup-body">
        <div class="popup-title">
          <img src="${iconUrl}" alt="" onerror="this.onerror=null;this.src='${ICON_BASE + DEFAULT_ICON}'">
          <div>${title}</div>
        </div>
        <div style="margin-top:6px">${rows.join('')}</div>
      </div>
    `;
  }

  // load GeoJSON
  fetch(GEOJSON_URL + '?v=mk-3')
    .then(r => r.json())
    .then(geo => {
      geo.features.forEach(f => {
        const p = f.properties || {};
        if (!f.geometry || f.geometry.type !== 'Point') return;
        const [lon, lat] = f.geometry.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const m = L.marker([lat, lon], { icon: monDivIcon(p) }).bindPopup(popupHTML(p));
        clusters.addLayer(m);
      });

      map.addLayer(clusters);
      if (clusters.getLayers().length) {
        map.fitBounds(clusters.getBounds().pad(0.2));
      }
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
