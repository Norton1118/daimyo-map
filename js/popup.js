// js/popup.js
(function () {
  "use strict";

  // bump this whenever you edit popup.js (easy cache check in DevTools)
  const BUILD = "20251222-1";
  const ICON_DIR = "imgs/";

  // Inline SVG placeholder so missing crests still render nicely
  const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(
      `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" rx="10" ry="10" fill="#e5e7eb"/>
  <text x="50%" y="56%" text-anchor="middle" font-size="28" fill="#6b7280" font-family="sans-serif">?</text>
</svg>
`.trim()
    );

  const s = (v) => String(v ?? "").trim();

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function pick(obj, keys) {
    for (const k of keys) {
      if (!obj) continue;
      const v = obj[k];
      if (v !== null && v !== undefined && s(v) !== "") return v;
    }
    return null;
  }

  function iconUrl(iconName) {
    const name = s(iconName);
    if (!name) return PLACEHOLDER;

    // If it's already a full URL or a data URL, use as-is
    if (/^https?:\/\//i.test(name) || name.startsWith("data:")) return name;

    // Otherwise treat as filename in imgs/
    return ICON_DIR + name;
  }

  function isGovtLand(notesRaw) {
    const n = s(notesRaw).toLowerCase();
    return n.startsWith("shogunate land") || n.startsWith("territory of");
  }

  // Returns koku as a number (e.g., 120000), or null
  function parseStipendKoku(raw) {
    const t0 = s(raw);
    if (!t0 || t0 === "-" || t0 === "—") return null;

    // If already written like "12万石"
    const manMatch = t0.match(/([\d.]+)\s*万/);
    if (manMatch) {
      const man = Number(manMatch[1]);
      return Number.isFinite(man) ? man * 10000 : null;
    }

    // Otherwise try to parse plain numeric koku (allow commas / extra text)
    const cleaned = t0
      .replace(/,/g, "")
      .replace(/[^\d.\-]/g, ""); // keep digits/dot/minus only
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }

  // Formats koku -> "12万石" (1 decimal max if needed)
  function fmtManKoku(koku) {
    if (!Number.isFinite(koku)) return null;
    const man = koku / 10000;
    const rounded = Math.round(man * 10) / 10; // 1 decimal
    const text =
      Number.isInteger(rounded) ? String(rounded) : String(rounded);
    return `${text}万石`;
  }

  function html(p) {
    // Field-name fallbacks (handles different GeoJSON property keys)
    const name =
      pick(p, ["name", "han", "han_name", "hanName", "Han Name"]) ||
      pick(p, ["country", "Country"]) ||
      "";

    const country = pick(p, ["country", "Country"]) || "";
    const region = pick(p, ["region", "Region"]) || "";
    const prefecture = pick(p, ["prefecture", "Current Prefecture"]) || "";
    const daimyo =
      pick(p, ["daimyo", "Daimyo Family Name", "daimyo_family"]) || "";
    const notes = pick(p, ["notes", "Notes"]) || "";
    const wiki =
      pick(p, ["wikipedia_url", "Link to Wikipedia", "wiki", "wikipedia"]) || "";
    const icon = pick(p, ["icon", "mon", "crest", "Mon (Crest)"]) || "";

    const govt = isGovtLand(notes);

    // Stipend key fallbacks — this is usually where “missing stipend” happens
    const rawStipend = pick(p, [
      "stipend",
      "stipend_koku",
      "stipendKoku",
      "koku",
      "Stipend (Koku)",
    ]);
    const koku = parseStipendKoku(rawStipend);
    const stipendText = koku !== null ? fmtManKoku(koku) : null;

    const crestSrc = iconUrl(icon);

    const hero = `
      <div style="display:flex; justify-content:center; margin-bottom:6px;">
        <img
          src="${crestSrc}"
          onerror="this.onerror=null;this.src='${PLACEHOLDER}'"
          alt=""
          style="width:84px;height:84px;border-radius:999px;object-fit:contain;"
        />
      </div>`;

    const lines = [];

    lines.push(hero);
    lines.push(`<div class="popup-title">${esc(name)}</div>`);
    if (country) lines.push(`<div class="popup-sub">${esc(country)}</div>`);
    if (region) lines.push(`<div class="popup-sub">${esc(region)}</div>`);
    if (prefecture) lines.push(`<div class="popup-sub">${esc(prefecture)}</div>`);

    if (daimyo) lines.push(`<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`);

    // Keep your current behavior:
    // - Govt land / Territory: show notes italic, no stipend
    // - Otherwise: show stipend in 万石 when available
    if (govt) {
      if (notes) lines.push(`<div class="popup-notes"><i>${esc(notes)}</i></div>`);
    } else {
      if (stipendText) {
        lines.push(
          `<div class="popup-line"><b>Stipend:</b> ${esc(stipendText)}</div>`
        );
      }
    }

    if (wiki) {
      lines.push(
        `<div class="popup-line"><a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`
      );
    }

    const footer = `
      <div class="popup-footer">
        <img
          class="popup-footer-crest"
          src="${crestSrc}"
          onerror="this.onerror=null;this.src='${PLACEHOLDER}'"
          alt=""
        />
      </div>`;

    return `<div class="popup-card">${lines.join("")}${footer}</div>`;
  }

  // expose globally
  window.DaimyoPopup = { BUILD, html, render: html };
})();
