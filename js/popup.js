/* js/popup.js
 * Provides:
 *   window.DaimyoPopup.buildPopupHtml(props)
 *   window.DaimyoPopup.crestDivIcon(props)
 *   window.DaimyoPopup.iconUrl(props)
 */
(function () {
  "use strict";

  const BUILD = "20251222-01";
  const ICON_DIR = "imgs/";

  // Simple inline placeholder crest (never 404s)
  const PLACEHOLDER_SVG =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
        <rect width="100%" height="100%" rx="12" ry="12" fill="#f2f2f2"/>
        <circle cx="48" cy="48" r="26" fill="#e6e6e6" stroke="#cfcfcf" stroke-width="3"/>
        <path d="M32 48h32" stroke="#b0b0b0" stroke-width="5" stroke-linecap="round"/>
      </svg>
    `);

  function esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(s) {
    return String(s ?? "").trim();
  }

  function isGovOrTerritory(notes) {
    const n = norm(notes).toLowerCase();
    return n.startsWith("shogunate land") || n.startsWith("territory of");
  }

  function parseManKoku(val) {
    // Handles: number, "21 (Man-koku)", "6.7", etc.
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && Number.isFinite(val)) return val;

    const s = String(val).trim();
    if (!s) return null;

    const m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return null;

    const n = parseFloat(m[0]);
    return Number.isFinite(n) ? n : null;
  }

  function formatManKoku(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return null;

    // Keep up to 1 decimal if needed, but trim trailing .0
    let s = (Math.round(n * 10) / 10).toFixed(1);
    if (s.endsWith(".0")) s = s.slice(0, -2);

    // User asked for Man-Koku unit; include 万石 too
    return `${s} 万石 (Man-koku)`;
  }

  function iconUrl(props) {
    const raw = norm(props?.icon);
    if (!raw) return PLACEHOLDER_SVG;

    // If already a full/relative path, keep it
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("imgs/") || raw.startsWith("./imgs/")) return raw;

    return ICON_DIR + raw;
  }

  function crestDivIcon(props) {
    const url = iconUrl(props);

    // Use <img> for crests; if missing, swap to placeholder
    const html = `
      <div class="crest-marker">
        <img
          class="crest-marker-img"
          src="${esc(url)}"
          alt=""
          onerror="this.onerror=null;this.src='${esc(PLACEHOLDER_SVG)}';"
        />
      </div>
    `;

    return L.divIcon({
      className: "crest-divicon",
      html,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -16],
    });
  }

  function buildPopupHtml(props) {
    const name = norm(props?.name) || "Unknown";
    const country = norm(props?.country);
    const region = norm(props?.region);
    const pref = norm(props?.prefecture);
    const daimyo = norm(props?.daimyo);
    const notes = norm(props?.notes);
    const wiki = norm(props?.wikipedia);

    const crest = iconUrl(props);

    const govtOrTerritory = isGovOrTerritory(notes);

    // Stipend rule:
    // - Only show stipend if NOT (Shogunate Land / Territory of ...)
    // - Use "stipend (Man Koku)" if present
    let stipendLine = "";
    if (!govtOrTerritory) {
      const mk = parseManKoku(props?.["stipend (Man Koku)"]);
      const formatted = formatManKoku(mk);
      if (formatted) {
        stipendLine = `
          <div class="popup-line">
            <b>Stipend:</b> ${esc(formatted)}
          </div>
        `;
      }
    }

    // Daimyo line: show only if not govt/territory and daimyo exists
    const daimyoLine =
      !govtOrTerritory && daimyo
        ? `<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`
        : "";

    // Notes:
    // - If Shogunate Land / Territory..., show notes prominently (italic) and do NOT show stipend
    // - Otherwise, show notes only if it exists (e.g., Branch Han)
    const notesLine = notes
      ? govtOrTerritory
        ? `<div class="popup-line"><i>${esc(notes)}</i></div>`
        : `<div class="popup-notes"><i>${esc(notes)}</i></div>`
      : "";

    const wikiLine = wiki
      ? `<div class="popup-line"><a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`
      : "";

    return `
      <div class="popup-card">
        <div class="popup-close">×</div>

        <div class="popup-crest-wrap">
          <img
            class="popup-crest"
            src="${esc(crest)}"
            alt=""
            onerror="this.onerror=null;this.src='${esc(PLACEHOLDER_SVG)}';"
          />
        </div>

        <div class="popup-title">${esc(name)}</div>

        ${country ? `<div class="popup-sub">${esc(country)}</div>` : ""}
        ${region ? `<div class="popup-sub">${esc(region)}</div>` : ""}
        ${pref ? `<div class="popup-sub">${esc(pref)}</div>` : ""}

        ${daimyoLine}
        ${stipendLine}
        ${wikiLine}

        ${notesLine ? `<div class="popup-line">${notesLine}</div>` : ""}

        <div class="popup-footer">
          <div class="popup-footer-spacer"></div>
          <img
            class="popup-footer-crest"
            src="${esc(crest)}"
            alt=""
            onerror="this.onerror=null;this.src='${esc(PLACEHOLDER_SVG)}';"
          />
        </div>
      </div>
    `;
  }

  // Attach / overwrite safely
  window.DaimyoPopup = {
    BUILD,
    iconUrl,
    crestDivIcon,
    buildPopupHtml,
  };

  // Optional: quick console check
  // console.log("DaimyoPopup loaded", BUILD, window.DaimyoPopup);
})();
