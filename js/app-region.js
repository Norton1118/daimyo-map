/* js/app-region.js — checkbox filter + unified popup */
(function () {
  const GEOJSON_URL = 'data/daimyo_domains.geojson'; // with or without Man Koku works
  const ICON_BASE   = 'imgs/';

  const FIELD = {
    name:    'name',
    prefect: 'prefecture',
    daimyo:  'daimyo',
    region:  'region',
    icon:    'icon',
    wiki:    'wikipedia',
    wikiUrl: 'wikipedia_url'
  };

  const REGION_ORDER = [
    'Ezo-Tohoku','Kantō','Kōshin’etsu','Tōkai','Kinki','Chūgoku','Shikoku','Kyūshū'
  ];

  function getStipend(props){
    const raw = props['stipend (Man Koku)'] ?? props['stipend'];
    if (raw == null || raw === '') return null;
    const n = Number(String(raw).replace(/[^\d.-]/g,''));
    return Number.isFinite(n) ? `${n} man-koku` : String(raw);
  }

  function buildWikiURL(props){
    const explicit = props[FIELD.wikiUrl];
    if (typeof explicit === 'string' && /^https?:\/\//i.test(explicit)) return explicit;
    const raw = props[FIELD.wiki];
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const title = String(raw).replace(/\s*-\s*Wikipedia/i,'').trim();
    return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/\s+/g,'_'));
  }

  function popupHTML(props){
    const name    = props[FIELD.name]    || '(unknown)';
    const prefect = props[FIELD.prefect] || '';
    const daimyo  = props[FIELD.daimyo]  || '';
    const stipend = getStipend(props);
    const wiki    = buildWikiURL(props);
    const icon    = props[FIELD.icon] ? `${ICON_BASE}${props[FIELD.icon]}` : null;

    const iconImg = icon ? `<img src="${icon}" alt="" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;border-radius:4px;">` : '';
    const lines = [];
    if (prefect) lines.push(`${prefect}`);
    if (daimyo)  lines.push(`Daimyo: ${daimyo}`);
    if (stipend) lines.push(`Stipend: ${stipend}`);
    const wikiLine = wiki ? `<div style="margin-top:6px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>` : '';

    return `
      <div style="min-width:220px">
        <div style="font-weight:600;display:flex;align-items:center;">
          ${iconImg}<span>${name}</span>
        </div>
        <div style="margin-top:6px;line-height:1.3">${lines.join('<br>')}</div>
        ${wikiLine}
      </div>
    `;
  }

  function makeIcon(props){
    const file = props[FIELD.icon];
    if (!file) return null;
    return L.icon({
      iconUrl: ICON_BASE + file,
      iconSize: [36,36],
      iconAnchor:[18,18],
      popupAnchor:[0,-18],
      className:'crest-icon'
    });
  }

  // ---- MAP ----
  const map = L.map('map', { preferCanvas: true }).setView([36.5, 137.7], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const layerGroup = L.layerGroup().addTo(map);
  let features = [];

  // ---- UI: checkbox control ----
  function buildControl(regions) {
    const ctl = L.control({ position: 'topleft' });
    ctl.onAdd = function () {
      const div = L.DomUtil.create('div', 'leaflet-control regions-card');
      div.style.background = '#fff';
      div.style.padding = '8px 10px';
      div.style.borderRadius = '8px';
      div.style.boxShadow = '0 1px 6px rgba(0,0,0,.2)';
      div.innerHTML = `<div style="font-weight:600;margin-bottom:6px">Regions</div>
        <div style="display:flex; gap:6px; margin-bottom:6px">
          <button type="button" id="btnAll"  class="btn">Select all</button>
          <button type="button" id="btnNone" class="btn">Clear</button>
        </div>
        <div id="regionBox"></div>`;
      return div;
    };
    ctl.addTo(map);

    const box = document.getElementById('regionBox');
    const frag = document.createDocumentFragment();

    regions.forEach(r => {
      const id = 'reg_' + r.replace(/\W+/g,'_');
      const label = document.createElement('label');
      label.style.display='grid';
      label.style.gridTemplateColumns='16px 1fr';
      label.style.gap='8px';
      label.style.alignItems='center';
      label.style.margin='4px 0';

      const cb = document.createElement('input');
      cb.type='checkbox'; cb.value=r; cb.id=id;

      const span = document.createElement('span');
      span.textContent = r;

      label.appendChild(cb); label.appendChild(span);
      frag.appendChild(label);
    });
    box.appendChild(frag);

    document.getElementById('btnAll').onclick  = () => { box.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked=true);  refresh(); };
    document.getElementById('btnNone').onclick = () => { box.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.checked=false); refresh(); };
    box.onchange = refresh;
  }

  function refresh(){
    const selected = Array.from(document.querySelectorAll('#regionBox input[type=checkbox]:checked')).map(cb=>cb.value);
    layerGroup.clearLayers();
    features
      .filter(f => selected.length===0 || selected.includes((f.properties||{}).region))
      .forEach(f => {
        const latlng = L.latLng(f.geometry.coordinates[1], f.geometry.coordinates[0]);
        const props  = f.properties || {};
        const icon   = makeIcon(props);
        const marker = icon ? L.marker(latlng,{icon}) : L.marker(latlng);
        marker.bindPopup(popupHTML(props));
        layerGroup.addLayer(marker);
      });
  }

  // ---- LOAD ----
  fetch(GEOJSON_URL + '?v=man-koku-safe')
    .then(r => r.json())
    .then(fc => {
      features = (fc && fc.features) ? fc.features : [];
      const regions = Array.from(new Set(features.map(f => (f.properties||{}).region)))
                           .filter(Boolean);

      // Arrange in the preferred order
      const ordered = REGION_ORDER.filter(r => regions.includes(r))
        .concat(regions.filter(r => !REGION_ORDER.includes(r)).sort());

      buildControl(ordered);
      refresh();

      // Fit bounds if we drew anything
      try {
        const b = L.featureGroup(layerGroup.getLayers()).getBounds();
        if (b.isValid()) map.fitBounds(b.pad(0.1));
      } catch {}
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));
})();
