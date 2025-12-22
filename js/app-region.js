/* js/app-region.js - Region filter map */
(function () {
  "use strict";

  const BUILD = "20251222-03"; // bump when you change data
  const DATA_URL = `data/daimyo_domains.geojson?v=${BUILD}`;

  window.__APP_REGION_BUILD__ = BUILD;
  console.log("app-region build:", BUILD);

  // Make region-filter icons smaller here:
  const REGION_ICON_SIZE = 26; // px (try 22–28)

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

  function ensurePopupApi() {
    if (!window.DaimyoPopup) throw new Error("popup.js did not load (window.DaimyoPopup missing)");
    if (typeof window.DaimyoPopup.buildPopupHtml !== "function") {
      throw new Error("DaimyoPopup.buildPopupHtml is not a function (popup.js mismatch)");
    }
  }

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Small crest icon for the REGION map (independent of popup.js icon size)
  function makeRegionCrestDivIcon(props, sizePx) {
    const file = (props && props.icon) ? String(props.icon) : "";
    const src = file ? `imgs/${encodeURIComponent(file)}` : "";
    const alt = escapeAttr(props && props.name ? props.name : "crest");

    // If an image 404s, hide it but keep the framed square
    const imgHtml = src
      ? `<img src="${src}" alt="${alt}" loading="lazy"
              onerror="this.style.display='none';"
              style="width:100%;height:100%;object-fit:contain;display:block;" />`
      : "";

    const frameStyle = [
      `width:${sizePx}px`,
      `height:${sizePx}px`,
      `border-radius:6px`,
      `border:1px solid rgba(0,0,0,0.35)`,
      `background:#fff`,
      `box-shadow:0 1px 4px rgba(0,0,0,0.18)`,
      `overflow:hidden`,
      `display:flex`,
      `align-items:center`,
      `justify-content:center`,
    ].join(";");

    return L.divIcon({
      className: "daimyo-crest-marker",
      html: `<div style="${frameStyle}">${imgHtml}</div>`,
      iconSize: [sizePx, sizePx],
      iconAnchor: [sizePx / 2, sizePx / 2],
      popupAnchor: [0, -sizePx / 2],
    });
  }

  async function main() {
    try {
      ensurePopupApi();
      hideError();

      const map = L.map("map", { zoomControl: false }).setView([36.2, 138.25], 5);
      L.control.zoom({ position: "bottomright" }).addTo(map);

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

      // We'll compute bounds safely (no FeatureGroup over LayerGroups)
      const bounds = L.latLngBounds([]);

      // Build markers into groups
      features.forEach((f) => {
        const p = f.properties || {};
        const g = f.geometry || {};
        if (g.type !== "Point" || !Array.isArray(g.coordinates)) return;

        const [lon, lat] = g.coordinates;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

        const r = p.region;
        if (!r || !regionGroups[r]) return;

        const icon = makeRegionCrestDivIcon(p, REGION_ICON_SIZE);
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
        bounds.extend([lat, lon]);
      });

      // Add all by default
      Object.values(regionGroups).forEach((lg) => lg.addTo(map));

      // Fit bounds across all markers (SAFE)
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.05));

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

      // console.log("Region map loaded", BUILD);
    } catch (err) {
      console.error("Failed to load daimyo data (see console).", err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
