// js/popup.js
// Popup + crest icon helpers for Daimyo Map
// - Shows Stipend in Man-koku for normal hans
// - Omits stipend for Shogunate Land / Territory-of entries
// - Provides DaimyoPopup.crestDivIcon() used by app.js / app-region.js

(() => {
  "use strict";

  const BUILD = "20251222-1";
  const ICON_DIR = "imgs/";

  // Simple inline placeholder (prevents broken image icons)
  const PLACEHOLDER_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <circle cx="40" cy="40" r="26" fill="#e5e7eb"/>
      <path d="M26 40h28" stroke="#9ca3af" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `.trim();
  const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(PLACEHOLDER_SVG);

  const s = (v) => (v == null ? "" : String(v)).trim();

  const esc = (v) =>
    String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function iconUrl(iconName) {
    const raw = s(iconName);
    if (!raw) return PLACEHOLDER;

    // already absolute / data url
    if (/^(https?:|data:)/i.test(raw)) return raw;

    // if already includes imgs/ or a path, keep it (normalize leading "./")
    if (raw.startsWith("./")) return raw.slice(2);
    if (raw.startsWith("imgs/") || raw.includes("/")) return raw;

    // otherwise assume it's a filename inside imgs/
    return ICON_DIR + raw;
  }

  function isGovOrTerritory(notes) {
    const n = s(notes).toLowerCase();
    if (!n) return false;
    return n.startsWith("shogunate land") || n.startsWith("territory of");
  }

  // GeoJSON has: "stipend (Man Koku)" like "3 (Man-koku)"
  function parseManKoku(raw) {
    if (raw == null) return null;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    const txt = s(raw);
    if (!txt || txt === "-" || txt.toLowerCase() === "na") return null;

    // first number in the string (allows commas and decimals)
    const m = txt.match(/[-+]?\d[\d,]*\.?\d*/);
    if (!m) return null;

    const num = Number(m[0].replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  }

  function formatManKoku(n) {
    if (!Number.isFinite(n)) return null;

    // integer vs decimal formatting
    const isInt = Math.abs(n - Math.round(n)) < 1e-9;
    if (isInt) return new Intl.NumberFormat("en-US").format(Math.round(n));

    // up to 2 decimals, trimmed
    const fixed = n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    const [a, b] = fixed.split(".");
    const aFmt = new Intl.NumberFormat("en-US").format(Number(a));
    return b ? `${aFmt}.${b}` : aFmt;
  }

  function crestImgTag(iconName, sizePx, extraStyle = "") {
    const url = iconUrl(iconName);
    const size = Number(sizePx) || 72;
    const style = `width:${size}px;height:${size}px;object-fit:contain;${extraStyle}`;

    // onerror swaps to placeholder so broken files don’t show as broken icons
    return `<img src="${esc(url)}"
      alt=""
      style="${esc(style)}"
      onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';"
    />`;
  }

  // Used by app.js/app-region.js in pointToLayer()
  function crestDivIcon(iconName, sizePx = 34) {
    const size = Number(sizePx) || 34;

    // If Leaflet isn't ready for some reason, let Leaflet fall back to default icon.
    if (!window.L || typeof window.L.divIcon !== "function") return undefined;

    const url = iconUrl(iconName);

    const html = `
      <div style="
        width:${size}px;height:${size}px;
        border-radius:6px;
        background:#fff;
        border:1px solid rgba(0,0,0,0.18);
        box-shadow:0 1px 4px rgba(0,0,0,0.15);
        display:flex;align-items:center;justify-content:center;
        overflow:hidden;">
        <img src="${esc(url)}" alt=""
          style="width:${Math.max(18, Math.floor(size * 0.78))}px;
                 height:${Math.max(18, Math.floor(size * 0.78))}px;
                 object-fit:contain;"
          onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';"
        />
      </div>
    `.trim();

    return window.L.divIcon({
      className: "crest-div-icon",
      html,
      iconSize: [size, size],
      iconAnchor: [Math.floor(size / 2), size], // anchor near bottom-center
      popupAnchor: [0, -size]
    });
  }

  function popupHtml(props) {
    const p = props || {};

    const name = s(p.name) || "—";
    const alias = s(p.alias);
    const country = s(p.country);
    const region = s(p.region);
    const prefecture = s(p.prefecture);
    const daimyo = s(p.daimyo);
    const notes = s(p.notes);
    const wiki = s(p.wikipedia);
    const icon = s(p.icon);

    const gov = isGovOrTerritory(notes);

    // stipend only for normal hans (not shogunate land / territories)
    const stipendRaw =
      p["stipend (Man Koku)"] ?? p["stipend (Man-koku)"] ?? p["stipend"] ?? null;
    const stipendNum = gov ? null : parseManKoku(stipendRaw);
    const stipendFmt = stipendNum == null ? null : formatManKoku(stipendNum);

    const lines = [];
    if (country) lines.push(`<div class="popup-sub">${esc(country)}</div>`);
    if (region) lines.push(`<div class="popup-sub">${esc(region)}</div>`);
    if (prefecture) lines.push(`<div class="popup-sub">${esc(prefecture)}</div>`);

    // Main body lines
    let body = "";

    // Title + alias
    body += `<div class="popup-title">${esc(name)}</div>`;
    if (alias) body += `<div class="popup-sub"><i>${esc(alias)}</i></div>`;

    // Location lines
    body += lines.join("");

    // Notes-only (Shogunate Land / Territory of ...)
    if (gov && notes) {
      body += `<div class="popup-notes"><i>${esc(notes)}</i></div>`;
    } else {
      if (daimyo) {
        body += `<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`;
      }
      if (stipendFmt) {
        body += `<div class="popup-line"><b>Stipend:</b> ${esc(
          stipendFmt
        )} Man-koku</div>`;
      }
      if (notes) {
        body += `<div class="popup-notes"><i>${esc(notes)}</i></div>`;
      }
    }

    // Wikipedia link (optional)
    if (wiki) {
      body += `<div class="popup-line">
        <a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a>
      </div>`;
    }

    // Footer crest (small)
    const footer = `
      <div class="popup-footer" style="display:flex;justify-content:flex-end;">
        <img class="popup-footer-crest"
          src="${esc(iconUrl(icon))}"
          alt=""
          onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';"
        />
      </div>
    `.trim();

    // Big crest at top (matches your current card style)
    const crestTop = `
      <div style="display:flex;justify-content:center;margin-bottom:8px;">
        ${crestImgTag(
      icon,
      76,
      "border-radius:50%;background:#fff;border:1px solid rgba(0,0,0,0.12);padding:6px;"
    )}
      </div>
    `.trim();

    return `
      <div class="popup-card">
        ${crestTop}
        <div class="t">
          ${body}
        </div>
        ${footer}
      </div>
    `.trim();
  }

  // Expose API (and keep backwards-friendly aliases)
  window.DaimyoPopup = {
    BUILD,
    ICON_DIR,
    PLACEHOLDER,
    iconUrl,
    isGovOrTerritory,
    parseManKoku,
    crestDivIcon,
    popupHtml,
    buildHtml: popupHtml,
    html: popupHtml
  };

  // Helpful sanity check in console:
  // window.DaimyoPopup.BUILD
})();
