// js/popup.js
(function () {
  "use strict";

  // Bump this when you want to force-refresh cached JS
  const BUILD = "2025-12-19-6";

  const ICON_DIR = "imgs/";

  // Inline SVG placeholder so we never 404
  const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" rx="12" ry="12" fill="#e5e7eb"/>
  <text x="50%" y="56%" text-anchor="middle" font-size="28" fill="#6b7280" font-family="sans-serif">?</text>
</svg>`.trim()
    );

  // ---------- helpers ----------
  const s = (v) => String(v ?? "").trim();

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Try multiple possible keys (keeps you safe if your GeoJSON keys change)
  function pick(props, keys) {
    for (const k of keys) {
      const v = props?.[k];
      if (v !== null && v !== undefined && s(v) !== "" && s(v) !== "—" && s(v) !== "-") return v;
    }
    return null;
  }

  function iconUrl(iconName) {
    const name = s(iconName);
    // If your GeoJSON stores just a filename like "matsumae.png"
    // this becomes "imgs/matsumae.png"
    return name ? ICON_DIR + name : PLACEHOLDER;
  }

  // These are the rows where stipend should be omitted (your list matches this rule)
  function isGovLandOrTerritory(notes) {
    const n = s(notes).toLowerCase();
    return n.startsWith("shogunate land") || n.startsWith("territory of");
  }

  function parseStipend(raw) {
    const t = s(raw);
    if (!t || t === "—" || t === "-") return null;

    // remove commas
    const num = Number(t.replaceAll(",", ""));
    if (!Number.isFinite(num)) return null;

    return num;
  }

  function fmtManKoku(num) {
    // show integers cleanly; allow halves/decimals if they exist
    const asInt = Math.round(num);
    const shown =
      Math.abs(num - asInt) < 1e-9
        ? String(asInt)
        : String(Math.round(num * 10) / 10);

    return `${shown} 万石 (Man Koku)`;
  }

  // ---------- main popup builder ----------
  function popupHtml(props) {
    const name = pick(props, ["name", "han_name", "Han Name"]) ?? "(Unknown)";
    const country = pick(props, ["country", "Country (region group)"]);
    const region = pick(props, ["region", "Region"]);
    const prefecture = pick(props, ["prefecture", "Current Prefecture", "current_prefecture"]);

    const notes = pick(props, ["notes", "Shogunate Land, Branch Han, Notes"]);
    const daimyo = pick(props, ["daimyo", "Daimyo Family Name", "daimyo_family"]);

    const stipendRaw = pick(props, ["stipend", "Stipend (Koku)", "stipend_koku"]);
    const stipendNum = parseStipend(stipendRaw);

    const wiki = pick(props, ["wikipedia_url", "Link to Wikipedia", "wikipedia"]);
    const icon = pick(props, ["icon", "Mon (Crest)", "mon", "crest"]);

    const isGov = isGovLandOrTerritory(notes);

    const crest = iconUrl(icon);

    const lines = [];

    // Big crest at top
    lines.push(`
      <div style="display:flex;justify-content:center;margin:2px 0 10px;">
        <img src="${crest}" alt=""
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'"
             style="width:72px;height:72px;border-radius:50%;border:2px solid rgba(0,0,0,.12);background:#fff;object-fit:contain;">
      </div>
    `);

    // Title
    lines.push(`<div class="popup-title">${esc(name)}</div>`);

    // Sub lines (Country / Region / Prefecture)
    if (country) lines.push(`<div class="popup-sub">${esc(country)}</div>`);
    if (region) lines.push(`<div class="popup-sub">${esc(region)}</div>`);
    if (prefecture) lines.push(`<div class="popup-sub">${esc(prefecture)}</div>`);

    // Notes for Shogunate Land / Territory
    if (isGov && notes) {
      lines.push(`<div class="popup-notes"><i>${esc(notes)}</i></div>`);
    } else {
      // Normal han: Daimyo line
      if (daimyo) {
        lines.push(`<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`);
      }

      // Normal han: Stipend line ONLY if we have a number
      if (stipendNum !== null) {
        lines.push(`<div class="popup-line"><b>Stipend:</b> ${esc(fmtManKoku(stipendNum))}</div>`);
      }
    }

    // Wikipedia link
    if (wiki) {
      lines.push(
        `<div class="popup-line"><a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`
      );
    }

    // Footer crest (small)
    lines.push(`
      <div class="popup-footer">
        <img class="popup-footer-crest" src="${crest}" alt=""
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
      </div>
    `);

    return `<div class="popup-card">${lines.join("")}</div>`;
  }

  // Expose globally
  window.DaimyoPopup = {
    BUILD,
    popupHtml,
    iconUrl,
    isGovLandOrTerritory,
    parseStipend,
  };
})();
