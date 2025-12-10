/* js/app-region.js — map with region filters (mk-2) */
(function () {
  // ---------- CONFIG ----------
  const VERSION     = 'mk-2';
  const GEOJSON_URL = `data/daimyo_domains.geojson?v=${VERSION}`;
  const ICON_BASE   = 'img/mon/';
  const ICON_SIZE   = 44;

  // Expected region names in the GeoJSON `properties.region` field:
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

  // ---------- MAP ----------
  const map = L.map('map', {
    minZoom: 4,
    maxZoom: 19,
    zoomSnap: 0.25,
    zoomDelta: 0.5
  }).setView([36.4, 138.0], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
  }).addTo(map);

  // A LayerGroup per region to toggle on/off
  const regionGroups = new Map();
  REGION_ORDER.forEach(r => regionGroups.set(r, L.layerGroup().addTo(map)));

  // ---------- HELPERS ----------
  function getNotes(p) {
    const candidates = [
      'notes',
      'Shogunate Land, Branch Han, Notes',
      'shogunate',
      'shogunate_notes',
      'description'
    ];
    for (const k of candidates) {
      const v = p && p[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  function popupHTML(p) {
    const title =
      (p.han && p.han.trim()) ||
      (p.name && p.name.trim()) ||
      p.country ||
      'Han';

    const lines = [];
    if (p.prefecture) lines.push(p.prefecture);
    if (p.daimyo)     lines.push(`Daimyo: ${p.daimyo}`);
    if (p.stipend)    lines.push(`Stipend: ${p.stipend} (Man-koku)`);

    const notes = getNotes(p);
    if (notes)       lines.push(notes);

    const wikiHtml = p.wikipedia_url
      ? `<a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a>`
      : (p.wikipedia ? L.Util.escapeHTML(p.wikipedia) : '');

    return [
      `<div class="popup">`,
      `  <div class="popup-title">`,
      p.icon ? `<img class="popup-mon" src="${ICON_BASE}${p.icon}" alt="" />` : '',
      `    <span>${L.Util.escapeHTML(title)}</span>`,
      `  </div>`,
      ...lines.map(t => `  <div>${L.Util.escapeHTML(t)}</div>`),
      wikiHtml ? `  <div>${wikiHtml}</div>` : '',
      `</div>`
    ].join('\n');
  }

  function monIcon(p) {
    const url = p.icon ? `${ICON_BASE}${p.icon}` : null;
    return L.icon({
      iconUrl: url || undefined,
      iconSize: [ICON_SIZE, ICON_SIZE],
      iconAnchor: [ICON_SIZE/2, ICON_SIZE/2],
      popupAnchor: [0, -ICON_SIZE/2],
      className: url ? '' : 'blank-icon'
    });
  }

  // ---------- LOAD + RENDER ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(fc => {
      L.geoJSON(fc, {
        pointToLayer: (feat, latlng) => {
          const p = feat.properties || {};
          const marker = L.marker(latlng, { icon: monIcon(p), title: p.han || p.name || p.country || '' });
          marker.bindPopup(popupHTML(p));

          const region = (p.region || '').trim();
          const group  = regionGroups.get(region) || regionGroups.get('Uncategorized') || L.layerGroup().addTo(map);
          group.addLayer(marker);
          return marker;
        }
      });

      buildRegionUI();
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));

  // ---------- UI ----------
  function buildRegionUI() {
    const list = document.getElementById('regionList');
    list.innerHTML = '';
    REGION_ORDER.forEach(name => {
      const id = `r_${name.replace(/[^\w]/g, '')}`;
      const row = document.createElement('label');
      row.innerHTML = `<input type="checkbox" id="${id}" data-region="${name}" /> ${name}`;
      list.appendChild(row);

      const cb = row.querySelector('input');
      cb.addEventListener('change', () => {
        const g = regionGroups.get(name);
        if (!g) return;
        if (cb.checked) map.addLayer(g); else map.removeLayer(g);
      });
    });

    // Select all / Clear buttons
    document.getElementById('btnAll').onclick  = () => setAll(true);
    document.getElementById('btnNone').onclick = () => setAll(false);

    function setAll(on) {
      REGION_ORDER.forEach(name => {
        const g = regionGroups.get(name);
        const cb = list.querySelector(`[data-region="${name}"]`);
        if (!g || !cb) return;
        cb.checked = on;
        if (on) map.addLayer(g); else map.removeLayer(g);
      });
    }

    // Start with everything off: user picks regions
    setAll(false);
  }
})();
