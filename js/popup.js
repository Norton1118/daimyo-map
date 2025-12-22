// js/popup.js
(() => {
  const BUILD = "2025-12-22-POPUP-1";
  const ICON_DIR = "imgs/";

  // Simple inline placeholder crest (so missing img files won't break popups/markers)
  const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
  <rect width="100%" height="100%" rx="10" ry="10" fill="#f2f2f2"/>
  <circle cx="40" cy="40" r="28" fill="white" stroke="#333" stroke-width="3"/>
  <path d="M40 18 L55 40 L40 62 L25 40 Z" fill="#333"/>
</svg>`;
  const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(PLACEHOLDER_SVG);

  const esc = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const str = (v) => {
    const t = String(v ?? "").trim();
    if (!t || t === "-" || t === "—") return "";
    return t;
  };

  function isGovtLand(notesRaw) {
    const notes = str(notesRaw).toLowerCase();
    if (!notes) return false;
    if (notes.includes("shogunate land")) return true;
    // covers "Territory of the Tsu Domain" etc.
    if (notes.includes("territory of")) return true;
    return false;
  }

  function parseManKoku(raw) {
    if (raw == null) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    const t = str(raw);
    if (!t) return null;

    // Handles: "3 (Man-koku)", "10.5", "10,5", "30000" etc.
    const m = t.replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;

    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function formatManKoku(n) {
    if (n == null) return "";
    const isInt = Math.abs(n - Math.round(n)) < 1e-9;
    if (isInt) return String(Math.round(n));
    return String(Math.round(n * 10) / 10); // 1 decimal if needed
  }

  function resolveIconUrl(iconValue) {
    const icon = str(iconValue);
    if (!icon) return PLACEHOLDER;
    if (/^data:/.test(icon)) return icon;
    if (/^https?:\/\//i.test(icon)) return icon;
    if (icon.includes("/")) return icon; // already a path like "imgs/xxx.png"
    return ICON_DIR + icon;
  }

  function crestDivIcon(props, opts = {}) {
    const size = Number(opts.size ?? 44);
    const url = resolveIconUrl(props?.icon);

    const html = `
<div class="crest-pin" style="width:${size}px;height:${size}px;">
  <img
    src="${esc(url)}"
    alt="crest"
    style="width:100%;height:100%;object-fit:contain;border-radius:8px;"
    onerror="this.onerror=null;this.src='${PLACEHOLDER}'"
  />
</div>`;

    return L.divIcon({
      className: "crest-divicon",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }

  function buildPopupHtml(p) {
    const name = str(p?.name) || "Unknown";
    const country = str(p?.country);
    const region = str(p?.region);
    const prefecture = str(p?.prefecture);
    const daimyo = str(p?.daimyo);
    const notes = str(p?.notes);
    const wikipedia = str(p?.wikipedia);
    const crest = resolveIconUrl(p?.icon);

    const stipendN = parseManKoku(p?.["stipend (Man Koku)"]);
    const showStipend = stipendN != null && !isGovtLand(notes);

    const lines = [];
    if (country) lines.push(`<div class="popup-line">${esc(country)}</div>`);
    if (region) lines.push(`<div class="popup-line">${esc(region)}</div>`);
    if (prefecture) lines.push(`<div class="popup-line">${esc(prefecture)}</div>`);

    const body = [];
    if (daimyo) body.push(`<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`);

    // Keep current style for Shogunate Land / Territory-of: show notes, no stipend
    if (notes && isGovtLand(notes)) {
      body.push(`<div class="popup-notes"><i>${esc(notes)}</i></div>`);
    } else if (notes) {
      body.push(`<div class="popup-notes">${esc(notes)}</div>`);
    }

    if (showStipend) {
      const v = formatManKoku(stipendN);
      body.push(
        `<div class="popup-line"><b>Stipend:</b> ${esc(v)} 万石 <span class="popup-unit">(Man-koku)</span></div>`
      );
    }

    if (wikipedia) {
      body.push(
        `<div class="popup-line"><a href="${esc(wikipedia)}" target="_blank" rel="noopener">Wikipedia</a></div>`
      );
    }

    return `
<div class="popup-card">
  <button class="popup-close" type="button" onclick="this.closest('.leaflet-popup').querySelector('.leaflet-popup-close-button')?.click()">×</button>

  <div class="popup-crest">
    <img src="${esc(crest)}" alt="" onerror="this.onerror=null;this.src='${PLACEHOLDER}'" />
  </div>

  <div class="popup-title">${esc(name)}</div>

  <div class="popup-sub">
    ${lines.join("")}
  </div>

  <div class="popup-body">
    ${body.join("")}
  </div>

  <div class="popup-footer">
    <img class="popup-footer-crest" src="${esc(crest)}" alt="" onerror="this.onerror=null;this.src='${PLACEHOLDER}'"/>
  </div>
</div>`;
  }

  window.DaimyoPopup = window.DaimyoPopup || {};
  Object.assign(window.DaimyoPopup, {
    BUILD,
    crestDivIcon,
    buildPopupHtml,
    isGovtLand,
    parseManKoku,
  });

  // Optional: uncomment for debugging
  // console.log("DaimyoPopup loaded:", BUILD);
})();
