/* js/app-region.js — unified popups + region checkbox filter */
(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains.geojson?v=2025-12-10c';
  const START = { lat: 36.5, lon: 138.5, zoom: 5 };

  const map = L.map('map', { zoomControl: true }).setView([START.lat, START.lon], START.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
  }).addTo(map);

  // ---------- Helpers (same as app.js) ----------
  function formatStipend(v) {
    if (v == null || String(v).trim() === '') return '';
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
    if (p.notes) parts.push(p.notes); // ← include column F
    if (p.wikipedia_url) parts.push(`<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`);

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

  // ---------- Region layer store ----------
  const regionLayers = new Map();   // region -> L.LayerGroup

  // region UI
  const regions = [
    'Ezo-Tohoku', 'Kantō', 'Kōshin’etsu', 'Tōkai', 'Kinki', 'Chūgoku', 'Shikoku', 'Kyūshū'
  ];
  const ctl = L.control({ position: 'topleft' });
  ctl.onAdd = function () {
    const wrap = L.DomUtil.create('div', 'leaflet-bar');
    wrap.style.background = '#fff';
    wrap.style.padding = '8px';
    wrap.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)';
    wrap.style.borderRadius = '6px';
    wrap.innerHTML = `<div style="font-weight:600;margin-bottom:6px">Regions</div>
      <div style="display:flex;gap:8px;margin-bottom:6px">
        <button id="rsel" class="btn-min">Select all</button>
        <button id="rclr" class="btn-min">Clear</button>
      </div>
      <div id="rlist"></div>`;
    setTimeout(() => {
      const list = wrap.querySelector('#rlist');
      regions.forEach(r => {
        const id = 'r_' + r.replace(/\W+/g, '_');
        const row = document.createElement('div');
        row.innerHTML = `<label style="display:flex;gap:6px;align-items:center">
            <input type="checkbox" id="${id}"><span>${r}</span>
          </label>`;
        list.appendChild(row);
        row.querySelector('input').addEventListener('change', (e) => {
          const checked = e.target.checked;
          const g = regionLayers.get(r);
          if (!g) return;
          if (checked) map.addLayer(g); else map.removeLayer(g);
        });
      });
      wrap.querySelector('#rsel').onclick = () => {
        wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
          cb.checked = true;
          const label = cb.nextSibling.textContent.trim();
          const g = regionLayers.get(label);
          if (g && !map.hasLayer(g)) map.addLayer(g);
        });
      };
      wrap.querySelector('#rclr').onclick = () => {
        wrap.querySelectorAll('input[type=checkbox]').forEach(cb => {
          cb.checked = false;
          const label = cb.nextSibling.textContent.trim();
          const g = regionLayers.get(label);
          if (g && map.hasLayer(g)) map.removeLayer(g);
        });
      };
    }, 0);
    L.DomEvent.disableClickPropagation(wrap);
    return wrap;
  };
  ctl.addTo(map);

  // ---------- Load data ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geo => {
      // make a group per region
      regions.forEach(r => regionLayers.set(r, L.layerGroup()));

      geo.features.forEach(f => {
        const p = f.properties || {};
        const r = p.region || '';
        const g = regionLayers.get(r) || regionLayers.get(normalizeRegion(r));
        const mk = L.marker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
          icon: p.icon ? monIcon(p) : undefined
        }).bindPopup(popupHTML(p));

        if (g) {
          g.addLayer(mk);
        } else {
          // if region unknown, just add to map
          mk.addTo(map);
        }
      });

      // default: nothing checked (as in your screenshot). If you prefer all on, uncomment:
      // regionLayers.forEach(g => g.addTo(map));
    })
    .catch(err => console.error('Failed to load GeoJSON', err));

  function normalizeRegion(s) {
    return (s || '').replace(/Tohoku/i, 'Ezo-Tohoku')
                   .replace(/Kanto/i, 'Kantō')
                   .replace(/Koshin'?etsu/i, 'Kōshin’etsu')
                   .replace(/Tokai/i, 'Tōkai')
                   .replace(/Chugoku/i, 'Chūgoku')
                   .replace(/Kyushu/i, 'Kyūshū');
  }
})();
