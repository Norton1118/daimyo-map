(function () {
  // ---- CONFIG ----
  const GEOJSON_URL = 'data/daimyo_domains.geojson';
  const ICON_BASE   = 'imgs/';

  // Property names in your GeoJSON
  const FIELD = {
    name:     'name',
    region:   'region',
    icon:     'icon',
    notes:    'notes',
    prefect:  'prefecture'
  };

  // Your desired region order
  const REGION_ORDER = [
    'Ezo-Tohoku',
    'Kantō',
    'Kōshin’etsu',
    'Tōkai',
    'Kinki',
    'Chūgoku',
    'Shikoku',
    'Kyūshū'
  ];

  // ---- MAP ----
  const map = L.map('map', { preferCanvas: true }).setView([36.5, 137.7], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Move the default zoom control so it doesn’t overlap the panel
  map.zoomControl.setPosition('bottomright');

  const layer = L.featureGroup().addTo(map);

  // ---- UI refs ----
  const listEl = document.getElementById('regionList');
  const btnAll = document.getElementById('btnAll');
  const btnNone= document.getElementById('btnNone');

  // ---- Popup helpers ----
  function popupHTML(p) {
    const rows = [];
    if (p[FIELD.notes])    rows.push(p[FIELD.notes]);
    if (p[FIELD.prefect])  rows.push(p[FIELD.prefect]);

    const iconHtml = p[FIELD.icon]
      ? `<img class="popup-icon" src="${ICON_BASE}${p[FIELD.icon]}" alt="">` : '';

    return `
      <div>
        <div class="popup-title">${iconHtml}<span>${p[FIELD.name] || '(unknown)'}</span></div>
        <div style="margin-top:6px;line-height:1.3">${rows.join('<br>')}</div>
      </div>
    `;
  }

  function makeIcon(p) {
    const f = p[FIELD.icon];
    return f ? L.icon({
      iconUrl: ICON_BASE + f,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -16]
    }) : null;
  }

  // ---- Rendering ----
  function draw(features, selectedSet) {
    layer.clearLayers();

    const useAll = selectedSet.size === 0; // none checked = show all
    const filtered = useAll
      ? features
      : features.filter(f => selectedSet.has(f.properties?.[FIELD.region]));

    filtered.forEach(f => {
      const p = f.properties || {};
      const [lng, lat] = f.geometry.coordinates;
      const icon = makeIcon(p);
      const m = icon ? L.marker([lat, lng], { icon }) : L.marker([lat, lng]);
      m.bindPopup(popupHTML(p));
      layer.addLayer(m);
    });

    if (layer.getLayers().length) map.fitBounds(layer.getBounds().pad(0.1));
  }

  function getSelectedSet() {
    const set = new Set();
    listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.checked) set.add(cb.value);
    });
    return set;
  }

  function buildRegionList(regions) {
    listEl.innerHTML = '';
    regions.forEach(r => {
      const id = 'reg_' + r.replace(/\W+/g, '_');
      const row = document.createElement('label');
      row.className = 'region-item';
      row.innerHTML = `
        <input type="checkbox" id="${id}" value="${r}">
        <span>${r}</span>
      `;
      listEl.appendChild(row);
    });
  }

  // ---- Load & wire UI ----
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(g => {
      const features = g.features || [];

      // Collect unique regions, then sort by your custom order
      const unique = Array.from(new Set(
        features.map(f => f.properties?.[FIELD.region]).filter(Boolean)
      ));
      const ordered = unique.sort((a, b) => {
        const ia = REGION_ORDER.indexOf(a);
        const ib = REGION_ORDER.indexOf(b);
        // Anything not listed goes to the end, kept alphabetically
        if (ia === -1 && ib === -1) return a.localeCompare(b, 'en');
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

      buildRegionList(ordered);
      draw(features, new Set()); // none checked => show all

      listEl.addEventListener('change', () => draw(features, getSelectedSet()));
      btnAll.addEventListener('click', () => {
        listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
        draw(features, getSelectedSet());
      });
      btnNone.addEventListener('click', () => {
        listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        draw(features, new Set());
      });
    })
    .catch(err => {
      console.error('Failed to load GeoJSON:', err);
      alert('Error: Failed to fetch (open DevTools for details)');
    });
})();
