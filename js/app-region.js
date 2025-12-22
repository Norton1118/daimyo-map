// js/app-region.js
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

  function uniqSorted(arr) {
    return [...new Set(arr)].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }

  async function main() {
    const map = L.map("map", { zoomControl: true }).setView([36.2, 138.25], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
      const geojson = await res.json();

      const features = geojson?.features || [];
      const regions = uniqSorted(features.map((f) => f?.properties?.region));

      // Build markers once
      const all = []; // { region, marker }
      const DP = window.DaimyoPopup || {};

      for (const f of features) {
        const p = f?.properties || {};
        const region = p.region || "";
        const coords = f?.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;

        const latlng = L.latLng(coords[1], coords[0]);

        const icon =
          typeof DP.crestDivIcon === "function"
            ? DP.crestDivIcon(p, { size: 40 })
            : undefined;

        const marker = icon ? L.marker(latlng, { icon }) : L.marker(latlng);

        const html =
          typeof DP.buildPopupHtml === "function"
            ? DP.buildPopupHtml(p)
            : `<b>${String(p.name || "Domain")}</b>`;

        marker.bindPopup(html, { maxWidth: 320, closeButton: false, className: "daimyo-popup" });

        all.push({ region, marker });
      }

      // UI
      const panel = document.getElementById("region-panel");
      if (!panel) throw new Error("Missing #region-panel in HTML.");

      panel.innerHTML = `
        <div class="panel-title">Regions</div>
        <div class="panel-actions">
          <button id="btn-all" type="button">Select all</button>
          <button id="btn-clear" type="button">Clear</button>
        </div>
        <div id="region-list" class="panel-list"></div>
      `;

      const list = panel.querySelector("#region-list");

      // default: all checked
      const selected = new Set(regions);

      for (const r of regions) {
        const id = `rg-${r.replace(/\s+/g, "-").replace(/[^\w\-]/g, "")}`;
        const row = document.createElement("label");
        row.className = "panel-row";
        row.innerHTML = `
          <input type="checkbox" id="${id}" checked />
          <span>${r}</span>
        `;
        const cb = row.querySelector("input");
        cb.addEventListener("change", () => {
          if (cb.checked) selected.add(r);
          else selected.delete(r);
          apply();
        });
        list.appendChild(row);
      }

      function apply() {
        markerLayer.clearLayers();
        for (const item of all) {
          if (selected.has(item.region)) markerLayer.addLayer(item.marker);
        }
      }

      panel.querySelector("#btn-all").addEventListener("click", () => {
        selected.clear();
        for (const r of regions) selected.add(r);
        panel.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = true));
        apply();
      });

      panel.querySelector("#btn-clear").addEventListener("click", () => {
        selected.clear();
        panel.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = false));
        apply();
      });

      // initial draw
      apply();

      // fit bounds
      const group = L.featureGroup(all.map((x) => x.marker));
      const bounds = group.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch (err) {
      console.error(err);
      showError("Failed to load daimyo data (see console).");
    }
  }

  main();
})();
