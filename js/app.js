// js/app.js
(() => {
  const DATA_URL = `data/daimyo_domains.geojson?v=${encodeURIComponent(
    window.DaimyoPopup?.BUILD || "data-1"
  )}`;

  function showError(msg) {
    const el = document.getElementById("error-banner");
    if (!el) return;
    el.style.display = "block";
    el.textContent = msg;
  }

  async function main() {
    const map = L.map("map", { zoomControl: true }).setView([36.2, 138.25], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const hasCluster = typeof L.markerClusterGroup === "function";
    const container = hasCluster
      ? L.markerClusterGroup({ showCoverageOnHover: false })
      : L.layerGroup();

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
      const geojson = await res.json();

      const layer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          const p = feature?.properties || {};
          const DP = window.DaimyoPopup || {};

          const icon =
            typeof DP.crestDivIcon === "function"
              ? DP.crestDivIcon(p, { size: 44 })
              : undefined;

          const marker = icon ? L.marker(latlng, { icon }) : L.marker(latlng);

          const html =
            typeof DP.buildPopupHtml === "function"
              ? DP.buildPopupHtml(p)
              : `<b>${String(p.name || "Domain")}</b>`;

          marker.bindPopup(html, { maxWidth: 320, closeButton: false, className: "daimyo-popup" });
          return marker;
        },
      });

      container.addLayer(layer);
      container.addTo(map);

      const bounds = layer.getBounds?.();
      if (bounds && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch (err) {
      console.error(err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
