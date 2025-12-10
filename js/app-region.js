/* Region filter map (no clustering) */
(function () {
  const DATA_FILE = 'daimyo_domains_with_man_koku.geojson'; // must match the real file
  const DATA_URL  = `data/${DATA_FILE}?v=${Date.now()}`;
  const ICON_BASE = 'img/mon/';

  const map = L.map('map').setView([36.7, 138.6], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const allLayer = L.layerGroup().addTo(map);

  fetch(DATA_URL)
    .then(r => {
      if (!r.ok) throw new Error(`GeoJSON 404/Network: ${r.status}`);
      return r.json();
    })
    .then(geo => {
      // Build markers but do NOT cluster
      const LAYERS_BY_REGION = {};
      const regions = [];

      L.geoJSON(geo, {
        pointToLayer: (feature, latlng) => {
          const p = feature.properties || {};
          const iconUrl = ICON_BASE + (p.icon || '').trim();
          const icon = L.icon({ iconUrl, iconSize: [30, 30], iconAnchor:[15,15] });
          const m = L.marker(latlng, { icon });
          m.bindPopup(makePopupHTML(p), { maxWidth: 320 });

          const r = p.region || p['Region'] || 'Unknown';
          if (!LAYERS_BY_REGION[r]) {
            LAYERS_BY_REGION[r] = L.layerGroup();
            regions.push(r);
          }
          LAYERS_BY_REGION[r].addLayer(m);
          return m;
        }
      }).addTo(allLayer);

      // Panel checkboxes
      const panel = document.getElementById('regionChecks');
      regions.sort().forEach(r => {
        const id = `r_${r.replace(/\W+/g,'_')}`;
        const row = document.createElement('label');
        row.innerHTML = `<input type="checkbox" id="${id}" checked> ${escapeHTML(r)}`;
        panel.appendChild(row);

        // start visible
        map.addLayer(LAYERS_BY_REGION[r]);

        row.querySelector('input').addEventListener('change', (ev) => {
          if (ev.target.checked) map.addLayer(LAYERS_BY_REGION[r]);
          else map.removeLayer(LAYERS_BY_REGION[r]);
        });
      });

      document.getElementById('selectAll').onclick = () => {
        panel.querySelectorAll('input[type=checkbox]').forEach(chk => {
          if (!chk.checked) chk.checked = true;
          map.addLayer(LAYERS_BY_REGION[chk.nextSibling.textContent.trim()]);
        });
      };
      document.getElementById('clearAll').onclick = () => {
        panel.querySelectorAll('input[type=checkbox]').forEach(chk => {
          if (chk.checked) chk.checked = false;
          map.removeLayer(LAYERS_BY_REGION[chk.nextSibling.textContent.trim()]);
        });
      };

      // Fit bounds to everything we loaded
      const bounds = allLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20,20] });
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
    const notes = p.notes || p['Shogunate Land, Branch Han, Notes'] || '';
    const wk = p.wikipedia_url || p.wikipedia || '';

    const iconUrl = ICON_BASE + (p.icon || '').trim();
    const stipendLine = stipend ? `<div>Stipend: ${stipend}</div>` : '';
    const notesLine   = notes   ? `<div>${escapeHTML(notes)}</div>` : '';

    return `
      <div class="popup-title">
        ${p.icon ? `<img src="${iconUrl}" alt="">` : ''}
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
