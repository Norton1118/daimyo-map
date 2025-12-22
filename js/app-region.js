/* js/app-region.js - Region filter map (smaller marker icons) */
(function () {
  "use strict";

  // Bump this if you use cache-busting in index_region.html (recommended)
  const BUILD = "20251222-02";

  const DATA_URL = "data/daimyo_domains.geojson";

  // 🔧 Change this to control marker icon size on the Region Filter map
  const REGION_ICON_SIZE = 26; // try 24 / 26 / 28

  const errorBanner = document.getElementById("error-banner");
  function showError(msg) {
    if (errorBanner) {
      errorBanner.style.display = "block";
      errorBanner.textContent = msg;
    }
  }

  function ensurePopupApi() {
    if (!window.DaimyoPopup) {
      throw new Error("popup.js did not load (window.DaimyoPopup missing)");
    }
    if (typeof window.DaimyoPopup.buildPopupHtml !== "function") {
      throw new Error("DaimyoPopup.buildPopupHtml is not a function (popup.js mismatch)");
    }
  }

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  // Build a smaller crest icon using Leaflet's L.divIcon (so you can control size here)
  function crestDivIconSmall(p, sizePx) {
    const raw = (p && p.icon) ? String(p.icon).trim() : "";
    const hasSrc = raw.length > 0;

    // If geojson stores just filenames like "1_matsumae.png", make it "imgs/1_matsumae.png"
    // If it already starts with "imgs/" or "http", keep as-is.
    let src = raw;
    if (hasSrc) {
      const lower = src.toLowerCase();
      const isAbsolute = lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("/");
      const isImgs = lower.startsWith("imgs/");
      if (!isAbsolute && !isImgs) src = "imgs/" + src;
    }

    // A tiny framed square like your current style
    const pad = 6; // padding around the image inside the frame
    const box = sizePx + pad * 2;

    const html = hasSrc
      ? `
        <div style="
          width:${box}px;height:${box}px;
          display:flex;align-items:center;justify-content:center;
          background:#fff;border:2px solid #111;border-radius:6px;
          box-shadow:0 1px 2px rgba(0,0,0,.25);
        ">
          <img
            src="${src}"
            alt=""
            style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;"
            onerror="this.style.display='none'"
          />
        </div>
      `
      : `
        <div style="
          width:${box}px;height:${box}px;
          background:#fff;border:2px solid #111;border-radius:6px;
          box-shadow:0 1px 2px rgba(0,0,0,.25);
        "></div>
      `;

    return L.divIcon({
      html,
      className: "daimyo-crest-icon", // keep empty-ish, we style inline
      iconSize: [box, box],
      iconAnchor: [box / 2, box / 2], // centered on coordinate
      popupAnchor: [0, -box / 2],
    });
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

        // ✅ Smaller icon for region filter map
        const icon = crestDivIconSmall(p, REGION_ICON_SIZE);
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

        cb.addEventListener("change", () => setRegionEnabled(r, cb.checked));

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
