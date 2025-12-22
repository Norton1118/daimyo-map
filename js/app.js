/* js/app.js - Clustered map */
(function () {
  "use strict";

  const BUILD = "20251222-03"; // bump this any time you change GeoJSON or app.js
  const DATA_URL = `data/daimyo_domains.geojson?v=${BUILD}`;

  const errorBanner = document.getElementById("error-banner");
  function showError(msg) {
    if (errorBanner) {
      errorBanner.style.display = "block";
      errorBanner.textContent = msg;
    }
  }
  function hideError() {
    if (errorBanner) errorBanner.style.display = "none";
  }

  function ensureDeps() {
    if (!window.L) throw new Error("Leaflet is not loaded");
    if (typeof L.markerClusterGroup !== "function") {
      throw new Error("Leaflet.markercluster is not loaded (L.markerClusterGroup missing)");
    }
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
      ensureDeps();
      hideError();

      const map = L.map("map", { zoomControl: true }).setView([36.2, 138.25], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Cluster layer
      const clusters = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
      });

      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL} (${res.status})`);
      const geojson = await res.json();

      const features = geojson && Array.isArray(geojson.features) ? geojson.features : [];
      const bounds = L.latLngBounds([]);

      features.forEach((f) => {
        const p = f.properties || {};
        const g = f.geometry || {};
        if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;

        const [lon, lat] = g.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const icon = window.DaimyoPopup.crestDivIcon(p);
        const marker = L.marker([lat, lon], { icon });

        marker.bindPopup(window.DaimyoPopup.buildPopupHtml(p), {
          maxWidth: 320,
          className: "daimyo-leaflet-popup",
        });

        marker.on("popupopen", (e) => {
          const el = e.popup.getElement();
          if (!el) return;
          const btn = el.querySelector(".popup-close");
          if (btn) btn.onclick = () => map.closePopup();
        });

        clusters.addLayer(marker);
        bounds.extend([lat, lon]);
      });

      clusters.addTo(map);

      if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));
    } catch (err) {
      console.error("Failed to load daimyo data (see console).", err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
