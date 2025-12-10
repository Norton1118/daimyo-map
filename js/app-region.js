/* Region-filter map (no clustering) */

(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains_with_man_koku.geojson';
  const ICON_BASE   = 'img/mon/';
  const DEFAULT_ICON = 'default.png';

  // Regions list (as in your sheet): keep spelling exactly as GeoJSON properties.region
  const REGION_LABELS = [
    'Ezo-Tohoku','Kantō','Kōshin’etsu','Tōkai','Kinki','Chūgoku','Shikoku','Kyūshū'
  ];

  // ---------- MAP ----------
  const map = L.map('map', { minZoom: 4 }).setView([37.5, 137.5], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // layer container for markers per region
  const regionLayers = new Map();       // region -> L.LayerGroup
  const allMarkers   = [];              // for fitBounds when filters change

  // helpers
  function monDivIcon(p) {
    const file = (p.icon && String(p.icon).trim()) ? p.icon.trim() : DEFAULT_ICON;
    const url  = ICON_BASE + file;
    const html = `<img src="${url}" alt="" onerror="this.onerror=null;this.src='${ICON_BASE + DEFAULT_ICON}'">`;
    return L.divIcon({ className: 'mon-icon', html, iconSize:[36,36], iconAnchor:[18,18], popupAnchor:[0,-18] });
  }

  function popupHTML(p) {
    const title = p.name || p.han || p.country || 'Domain';
    const notes = (p.notes && String(p.notes).trim()) ? p.notes.trim() : '';
    const rows = [];
    if (p.prefecture) rows.push(`<div><b>${p.prefecture}</b></div>`);
    if (p.daimyo)     rows.push(`<div>Daimyo: ${p.daimyo}</div>`);
    if (p.stipend)    rows.push(`<div>Stipend: ${p.stipend} (Man-koku)</div>`);
    if (notes)        rows.push(`<div style="margin-top:4px">${notes}</div>`);
    if (p.wikipedia_url) rows.push(`<div style="margin-top:6px"><a href="${p.wikipedia_url}" target="_blank" rel="noopener">Wikipedia</a></div>`);

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

  // create UI checkboxes
  const checksWrap = document.getElementById('regionChecks');
  function addCheck(name) {
    const id = 'r_' + name.replace(/\W+/g,'_');
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<label><input type="checkbox" id="${id}" data-region="${name}"> ${name}</label>`;
    checksWrap.appendChild(div);
    return document.getElementById(id);
  }
  const checkboxes = REGION_LABELS.map(addCheck);
  document.getElementById('selectAll').onclick = () => { checkboxes.forEach(c=>{c.checked=true;}); applyFilter(); };
  document.getElementById('clearAll').onclick  = () => { checkboxes.forEach(c=>{c.checked=false;}); applyFilter(); };
  checkboxes.forEach(c => c.addEventListener('change', applyFilter));

  // load GeoJSON and build markers
  fetch(GEOJSON_URL + '?v=mk-3')
    .then(r => r.json())
    .then(geo => {
      REGION_LABELS.forEach(r => regionLayers.set(r, L.layerGroup().addTo(map)));

      geo.features.forEach(f => {
        const p = f.properties || {};
        const region = p.region || '';
        if (!regionLayers.has(region)) return;
        if (!f.geometry || f.geometry.type !== 'Point') return;
        const [lon, lat] = f.geometry.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const m = L.marker([lat, lon], { icon: monDivIcon(p) }).bindPopup(popupHTML(p));
        regionLayers.get(region).addLayer(m);
        allMarkers.push(m);
      });

      // start with all regions visible
      checkboxes.forEach(c => c.checked = true);
      applyFilter();
    })
    .catch(err => console.error('Failed to load GeoJSON:', err));

  function applyFilter() {
    // toggle layers by region
    REGION_LABELS.forEach(name => {
      const lg = regionLayers.get(name);
      const cb = checkboxes.find(c => c.dataset.region === name);
      if (!lg) return;
      if (cb && cb.checked) {
        if (!map.hasLayer(lg)) map.addLayer(lg);
      } else {
        if (map.hasLayer(lg)) map.removeLayer(lg);
      }
    });

    // fit to visible markers
    const visible = [];
    REGION_LABELS.forEach(name => {
      const lg = regionLayers.get(name);
      if (lg && map.hasLayer(lg)) lg.eachLayer(m => visible.push(m));
    });
    if (visible.length) {
      const grp = L.featureGroup(visible);
      map.fitBounds(grp.getBounds().pad(0.2));
    }
  }
})();
