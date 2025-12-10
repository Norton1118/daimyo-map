/* daimyo-map — main map with clusters and (Man-koku) stipend  */
(function () {
  // ---------- CONFIG ----------
  const GEOJSON_URL = 'data/daimyo_domains_with_man_koku.geojson?v=mk-3';
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTR =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

  // ---------- MAP ----------
  const map = L.map('map', { zoomControl: true }).setView([38.5, 139.5], 6);
  L.tileLayer(TILE_URL, { attribution: ATTR, maxZoom: 19 }).addTo(map);

  // Cluster group (main map uses clusters)
  const clusters = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    disableClusteringAtZoom: 10,
  }).addTo(map);

  // -------- helpers --------
  function iconUrlFrom(props) {
    // props.icon may contain spaces / apostrophes. Encode *file name* only.
    const raw = (props.icon || '').trim();
    if (!raw) return null;
    return `img/mon/${encodeURIComponent(raw)}`;
  }

  function makeIcon(props) {
    const url = iconUrlFrom(props);
    if (!url) return null;

    // a tidy mon icon
    return L.icon({
      iconUrl: url,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -12],
      className: 'mon-icon',
    });
  }

  function prettyStipend(props) {
    const v = props['stipend (Man Koku)'] ?? props.stipend ?? '';
    if (v === '' || v === null || v === undefined) return '';
    // keep original number, add unit once
    return `Stipend: ${v} (Man-koku)`;
  }

  // Column F note logic (your list of special rows)
  const F_NOTE_NAMES = new Set([
    'Izu','Kai','Sado','Hida','Iga','Oki','Hōki','Awaji','Ōsumi'
  ]);
  function columnFLine(props) {
    const f = (props.notes || props['Shogunate Land, Branch Han, Notes'] || '').trim();
    if (!f) return '';
    const name = (props.name || props['Han Name'] || '').trim();
    if (F_NOTE_NAMES.has(name)) return f;  // show line for the special rows
    return ''; // hide elsewhere
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

  // ---------- load ----------
  fetch(GEOJSON_URL)
    .then(r => r.json())
    .then(geo => {
      const layer = L.geoJSON(geo, {
        pointToLayer: (feat, latlng) => {
          const props = feat.properties || {};
          const ic = makeIcon(props);
          const m = ic ? L.marker(latlng, { icon: ic }) : L.marker(latlng);
          m.bindPopup(popupHTML(props));
          return m;
        }
      });
      clusters.addLayer(layer);
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    })
    .catch(err => {
      console.error('Failed to load GeoJSON:', err);
      alert('Failed to load map data. See console for details.');
    });
})();
