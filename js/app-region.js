// js/app-region.js
(function () {
  const map = L.map("map", { zoomControl: true, minZoom: 4, maxZoom: 18, worldCopyJump: true })
    .setView([36.2048, 138.2529], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
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

  const REGIONS = ["Ezo-Tohoku","Kantō","Kōshin’etsu","Tōkai","Kinki","Chūgoku","Shikoku","Kyūshū"];
  const regionLayers = Object.fromEntries(REGIONS.map((r) => [r, L.layerGroup()]));

  // Leaflet control panel (no regionPanel div needed)
  const control = L.control({ position: "topleft" });
  control.onAdd = () => {
    const el = L.DomUtil.create("div");
    el.style.cssText =
      "background:#fff;padding:10px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.18);" +
      "font:14px/1.3 system-ui; max-width:220px;";

    el.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">Regions</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button type="button" id="selAll">Select all</button>
        <button type="button" id="clrAll">Clear</button>
      </div>
      <div id="checks" style="display:grid;gap:6px;"></div>
    `;

    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);

    const checks = el.querySelector("#checks");
    for (const r of REGIONS) {
      const row = document.createElement("label");
      row.style.cssText = "display:flex;align-items:center;gap:8px;";
      row.innerHTML = `<input type="checkbox" data-region="${r}" checked> ${r}`;
      checks.appendChild(row);
    }

    const boxes = () => Array.from(checks.querySelectorAll("input[type=checkbox]"));

    function apply() {
      for (const b of boxes()) {
        const r = b.getAttribute("data-region");
        if (!r) continue;
        if (b.checked) map.addLayer(regionLayers[r]);
        else map.removeLayer(regionLayers[r]);
      }
    }

    el.querySelector("#selAll").onclick = () => { boxes().forEach(b => b.checked = true); apply(); };
    el.querySelector("#clrAll").onclick = () => { boxes().forEach(b => b.checked = false); apply(); };
    checks.addEventListener("change", apply);

    apply();
    return el;
  };
  control.addTo(map);

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
      const pts = [];

      for (const feat of (geo.features || [])) {
        const p = feat.properties || {};
        const region = String(p.region || "").trim();
        const coords = feat.geometry?.coordinates;
        const lng = coords?.[0], lat = coords?.[1];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const m = L.marker([lat, lng], { icon: DaimyoPopup.crestDivIcon(p, 28) })
          .bindPopup(DaimyoPopup.buildPopupHtml(p), { maxWidth: 320 });

        if (regionLayers[region]) regionLayers[region].addLayer(m);
        pts.push([lat, lng]);
      }

      // default: all on
      for (const r of REGIONS) map.addLayer(regionLayers[r]);

      if (pts.length) {
        const b = L.latLngBounds(pts);
        if (b.isValid()) map.fitBounds(b.pad(0.08));
      }
    })
    .catch((err) => showMapError("Failed to load daimyo data (see console).", err));
})();
