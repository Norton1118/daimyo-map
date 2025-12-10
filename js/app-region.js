/* daimyo-map — region filter map (no clusters) */
(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains_with_man_koku.geojson?v=mk-3';
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

  const REGIONS = [
    'Ezo-Tohoku','Kantō','Kōshin’etsu','Tōkai','Kinki','Chūgoku','Shikoku','Kyūshū'
  ];

  // ---------- MAP ----------
  const map = L.map('map', { zoomControl: true }).setView([38.5, 139.5], 6);
  L.tileLayer(TILE_URL, { attribution: ATTR, maxZoom: 19 }).addTo(map);

  // A plain layer group (NO clustering here)
  const points = L.layerGroup().addTo(map);

  // -------- helpers --------
  function iconUrlFrom(props) {
    const raw = (props.icon || '').trim();
    if (!raw) return null;
    return `img/mon/${encodeURIComponent(raw)}`;
  }

  function makeIcon(props) {
    const url = iconUrlFrom(props);
    if (!url) return null;
    return L.icon({
      iconUrl: url,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -12],
      className: 'mon-icon',
    });
  }

  function prettyStipend(props) {
    const v = props['stipend (Man Koku)'] ?? props.stipend ?? '';
    return (v === '' || v === null || v === undefined) ? '' : `Stipend: ${v} (Man-koku)`;
  }

  const F_NOTE_NAMES = new Set([
    'Izu','Kai','Sado','Hida','Iga','Oki','Hōki','Awaji','Ōsumi'
  ]);
  function columnFLine(props) {
    const f = (props.notes || props['Shogunate Land, Branch Han, Notes'] || '').trim();
    if (!f) return '';
    const name = (props.name || props['Han Name'] || '').trim();
    return F_NOTE_NAMES.has(name) ? f : '';
  }

  function popupHTML(props) {
    const title = L.Util.escapeHTML(props.name || props['Han Name'] || '—');
    const pref  = L.Util.escapeHTML(props.prefecture || props['Current Prefecture'] || '');
    const daimyo = L.Util.escapeHTML(props.daimyo || '');
    const stipend = prettyStipend(props);
    const fLine = columnFLine(props);

    const wikiTxt = props.wikipedia || 'Wikipedia';
    const wikiUrl = props.wikipedia_url || '#';
    const wiki = wikiUrl && wikiUrl !== '#'
      ? `<a href="${wikiUrl}" target="_blank" rel="noopener">${L.Util.escapeHTML(wikiTxt)}</a>`
      : '';

    return `
      <div class="popup">
        <div class="popup-title">${title}</div>
        ${pref ? `<div>${pref}</div>` : ''}
        ${daimyo ? `<div>Daimyo: ${daimyo}</div>` : ''}
        ${stipend ? `<div>${stipend}</div>` : ''}
        ${fLine ? `<div>${L.Util.escapeHTML(fLine)}</div>` : ''}
        ${wiki ? `<div>${wiki}</div>` : ''}
      </div>
    `;
  }

  // ---------- UI (checkbox panel) ----------
  const panel = document.getElementById('regionPanel');
  panel.innerHTML = `
    <div class="panel">
      <div class="panel-title">Regions</div>
      <div class="panel-row">
        <button id="selAll">Select all</button>
        <button id="clrAll">Clear</button>
      </div>
      <div id="checks"></div>
    </div>
  `;
  const checks = panel.querySelector('#checks');
  REGIONS.forEach(r => {
    const id = 'r_' + r.replace(/\W+/g,'_');
    const div = document.createElement('div');
    div.className = 'check';
    div.innerHTML = `<label><input type="checkbox" id="${id}" checked> ${r}</label>`;
    checks.appendChild(div);
  });
  document.getElementById('selAll').onclick = () =>
    checks.querySelectorAll('input[type=checkbox]').forEach(c => (c.checked = true, refresh()));
  document.getElementById('clrAll').onclick = () =>
    checks.querySelectorAll('input[type=checkbox]').forEach(c => (c.checked = false, refresh()));
  checks.addEventListener('change', refresh);

  // ---------- load + filter ----------
  let features = [];
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geo => {
      features = geo.features || [];
      refresh();
      // fit once
      const layer = L.geoJSON(geo);
      map.fitBounds(layer.getBounds(), { padding: [20,20] });
    })
    .catch(err => {
      console.error('Failed to load GeoJSON:', err);
      alert('Failed to load map data. See console for details.');
    });

  function currentRegions() {
    const on = new Set();
    checks.querySelectorAll('input[type=checkbox]').forEach(c => {
      if (c.checked) on.add(c.parentElement.textContent.trim());
    });
    return on;
  }

  function refresh() {
    points.clearLayers();
    const on = currentRegions();
    features.forEach(f => {
      const props = f.properties || {};
      if (!on.has(props.region || props['Region'])) return;
      const latlng = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
      const ic = makeIcon(props);
      const m = ic ? L.marker(latlng, { icon: ic }) : L.marker(latlng);
      m.bindPopup(popupHTML(props));
      points.addLayer(m);
    });
  }
})();
