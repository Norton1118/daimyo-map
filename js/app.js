// js/app.js
(function () {
  const map = L.map("map", { minZoom: 4, maxZoom: 18, worldCopyJump: true })
    .setView([36.2048, 138.2529], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  function showMapError(message, err) {
    console.error(message, err);
    const div = document.createElement("div");
    div.textContent = message;
    div.style.cssText =
      "position:absolute;z-index:9999;top:12px;left:12px;right:12px;padding:10px 12px;" +
      "border-radius:10px;background:rgba(220,38,38,.95);color:#fff;font:600 14px/1.3 system-ui";
    map.getContainer().appendChild(div);
  }

  if (!window.DaimyoPopup) {
    showMapError("popup.js did not load (DaimyoPopup missing). Check script order.", null);
    return;
  }

  const dataUrl = new URL(
    `data/daimyo_domains.geojson?v=${encodeURIComponent(DaimyoPopup.BUILD)}`,
    document.baseURI
  ).toString();

  fetch(dataUrl, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status} ${r.statusText}`);
      return r.json();
    })
    .then((geo) => {
      const layer = L.geoJSON(geo, {
        pointToLayer: (feat, latlng) => {
          const p = feat.properties || {};
          return L.marker(latlng, { icon: DaimyoPopup.crestDivIcon(p, 28) })
            .bindPopup(DaimyoPopup.buildPopupHtml(p), { maxWidth: 320 });
        },
      });

      const cluster = L.markerClusterGroup({ disableClusteringAtZoom: 9 });
      cluster.addLayer(layer);
      map.addLayer(cluster);

      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    })
    .catch((err) => showMapError("Failed to load daimyo data (see console).", err));
})();
