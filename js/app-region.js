/* js/app-region.js - Region filter map */
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

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  async function main() {
    try {
      ensurePopupApi();

      const map = L.map("map", { zoomControl: true }).setView([36.2, 138.25], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL} (${res.status})`);
      const geojson = await res.json();

      const features = (geojson && geojson.features) ? geojson.features : [];
      const regions = uniqSorted(features.map((f) => (f.properties || {}).region));

      const regionGroups = {};
      regions.forEach((r) => (regionGroups[r] = L.layerGroup()));

      // Build markers into groups
      features.forEach((f) => {
        const p = f.properties || {};
        const g = f.geometry || {};
        if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;

        const [lon, lat] = g.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const r = p.region;
        if (!r || !regionGroups[r]) return;

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

        regionGroups[r].addLayer(marker);
      });

      // Add all by default
      Object.values(regionGroups).forEach((lg) => lg.addTo(map));

      // Fit bounds across all markers
      const all = L.featureGroup(Object.values(regionGroups));
      const b = all.getBounds();
      if (b && b.isValid()) map.fitBounds(b.pad(0.05));

      // Build UI
      const listEl = document.getElementById("region-list");
      const selectAllBtn = document.getElementById("btn-select-all");
      const clearBtn = document.getElementById("btn-clear");

      if (!listEl) throw new Error("Missing #region-list in index_region.html");

      function setRegionEnabled(regionName, enabled) {
        const lg = regionGroups[regionName];
        if (!lg) return;
        if (enabled) lg.addTo(map);
        else map.removeLayer(lg);
      }

      function getCheckboxes() {
        return Array.from(listEl.querySelectorAll("input[type='checkbox'][data-region]"));
      }

      listEl.innerHTML = "";
      regions.forEach((r) => {
        const id = "r_" + r.replace(/\W+/g, "_");

        const row = document.createElement("label");
        row.className = "region-row";
        row.htmlFor = id;

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.id = id;
        cb.checked = true;
        cb.dataset.region = r;

        cb.addEventListener("change", () => {
          setRegionEnabled(r, cb.checked);
        });

        const span = document.createElement("span");
        span.textContent = r;

        row.appendChild(cb);
        row.appendChild(span);
        listEl.appendChild(row);
      });

      if (selectAllBtn) {
        selectAllBtn.addEventListener("click", () => {
          getCheckboxes().forEach((cb) => {
            cb.checked = true;
            setRegionEnabled(cb.dataset.region, true);
          });
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          getCheckboxes().forEach((cb) => {
            cb.checked = false;
            setRegionEnabled(cb.dataset.region, false);
          });
        });
      }

      // console.log("Region map loaded", BUILD, "popup", window.DaimyoPopup.BUILD);
    } catch (err) {
      console.error("Failed to load daimyo data (see console).", err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
