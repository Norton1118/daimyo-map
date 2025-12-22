/* js/app.js - Clustered map */
(function () {
  "use strict";

  const BUILD = "20251222-01";
  const DATA_URL = "data/daimyo_domains.geojson";

  const errorBanner = document.getElementById("error-banner");
  function showError(msg) {
    if (errorBanner) {
      errorBanner.style.display = "block";
      errorBanner.textContent = msg;
    }
  }

  function ensurePopupApi() {
    if (!window.DaimyoPopup) throw new Error("popup.js did not load (window.DaimyoPopup missing)");
    if (typeof window.DaimyoPopup.buildPopupHtml !== "function") {
      throw new Error("DaimyoPopup.buildPopupHtml is not a function (popup.js mismatch)");
    }
    if (typeof window.DaimyoPopup.crestDivIcon !== "function") {
      throw new Error("DaimyoPopup.crestDivIcon is not a function (popup.js mismatch)");
    }
  }

  async function main() {
    try {
      ensurePopupApi();

      const map = L.map("map", { zoomControl: true }).setView([36.2, 138.25], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const clusters = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        disableClusteringAtZoom: 10,
      });

      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL} (${res.status})`);

      const geojson = await res.json();

      const layer = L.geoJSON(geojson, {
        pointToLayer: (feature, latlng) => {
          const p = feature.properties || {};
          const icon = window.DaimyoPopup.crestDivIcon(p);
          const marker = L.marker(latlng, { icon });

          const html = window.DaimyoPopup.buildPopupHtml(p);
          marker.bindPopup(html, { maxWidth: 320, className: "daimyo-leaflet-popup" });

          marker.on("popupopen", (e) => {
            // Hook close button inside popup
            const el = e.popup.getElement();
            if (!el) return;
            const btn = el.querySelector(".popup-close");
            if (btn) btn.onclick = () => map.closePopup();
          });

          return marker;
        },
      });

      clusters.addLayer(layer);
      map.addLayer(clusters);

      // Fit bounds safely
      const b = clusters.getBounds();
      if (b && b.isValid()) map.fitBounds(b.pad(0.05));
      // console.log("Clustered map loaded", BUILD, "popup", window.DaimyoPopup.BUILD);
    } catch (err) {
      console.error("Failed to load daimyo data (see console).", err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
