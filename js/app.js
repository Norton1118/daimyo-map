/* Main map with clustering */
(function () {
  // ---- settings ------------------------------------------------------------
  // Use the ONE name that actually exists in /data on GitHub (case-sensitive).
  // If your file is daimyo_domains.geojson, change DATA_FILE below.
  const DATA_FILE = 'daimyo_domains_with_man_koku.geojson'; // <-- make sure it exists
  const DATA_URL  = `data/${DATA_FILE}?v=${Date.now()}`;

  // icon base folder
  const ICON_BASE = 'img/mon/';

  const map = L.map('map', { zoomControl: true })
    .setView([38.3, 139.5], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const clusters = L.markerClusterGroup({
    disableClusteringAtZoom: 9,
    spiderfyOnMaxZoom: true,
  });
  map.addLayer(clusters);

  fetch(DATA_URL)
    .then(r => {
      if (!r.ok) throw new Error(`GeoJSON 404/Network: ${r.status}`);
      return r.json();
    })
    .then(geo => {
      const layer = L.geoJSON(geo, {
        pointToLayer: (feature, latlng) => {
          const p = feature.properties || {};
          // icon filename is stored in the data (e.g., "2_aizu.png")
          const iconFile = (p.icon || '').trim();
          const iconUrl  = ICON_BASE + iconFile; // no extension guessing

          const icon = L.icon({
            iconUrl,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: 'mon-icon'
          });

          const m = L.marker(latlng, { icon });

          m.bindPopup(makePopupHTML(p), { maxWidth: 320 });
          return m;
        }
      });

      clusters.addLayer(layer);
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    })
    .catch(err => {
      console.error('Failed to load map:', err);
      alert('Could not load the map data. Check that /data/' + DATA_FILE + ' exists on GitHub (case-sensitive).');
    });

  function makePopupHTML(p) {
    const name = p.name || p['Han Name'] || 'Unknown';
    const pref = p.prefecture || p['Current Prefecture'] || '';
    const dai  = p.daimyo || '';
    const stipend = p['stipend (Man Koku)'] || p['stipend (Man-koku)'] || p['stipend'] || '';
    const wk = p.wikipedia_url || p.wikipedia || '';

    // F-column notes (Shogunate Land, Branch Han, Notes)
    const notes = p.notes || p['Shogunate Land, Branch Han, Notes'] || '';

    const iconFile = (p.icon || '').trim();
    const iconUrl  = ICON_BASE + iconFile;

    const stipendLine = stipend ? `<div>Stipend: ${stipend}</div>` : '';
    const notesLine   = notes   ? `<div>${escapeHTML(notes)}</div>` : '';

    return `
      <div class="popup-title">
        ${iconFile ? `<img src="${iconUrl}" alt="">` : ''}
        <div>${escapeHTML(name)}</div>
      </div>
      ${pref ? `<div>${escapeHTML(pref)}</div>` : ''}
      ${dai ? `<div>Daimyo: ${escapeHTML(dai)}</div>` : ''}
      ${stipendLine}
      ${notesLine}
      ${wk ? `<div style="margin-top:6px"><a href="${wk}" target="_blank" rel="noopener">Wikipedia</a></div>` : ''}
    `;
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
})();
