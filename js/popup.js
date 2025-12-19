// js/popup.js
(function () {
  const BUILD = "20251212-2";
  const ICON_DIR = "imgs/";

  const PLACEHOLDER =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
        <rect width="100%" height="100%" rx="10" ry="10" fill="#e5e7eb"/>
        <text x="50%" y="55%" text-anchor="middle" font-size="28" fill="#6b7280" font-family="sans-serif">?</text>
      </svg>
    `.trim());

  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const s = (v) => String(v ?? "").trim();

  function isGovtLand(notes) {
    const n = s(notes).toLowerCase();
    return n.startsWith("shogunate land") || n.startsWith("territory of");
  }

  function parseStipend(raw) {
    const t = s(raw);
    if (!t || t === "-" || t === "—") return null;
    const num = Number(t.replaceAll(",", ""));
    if (!Number.isFinite(num)) return null;
    return (Math.abs(num - Math.round(num)) < 1e-9) ? String(Math.round(num)) : String(num);
  }

  function getWikiUrl(p) {
    const cand = s(p.wikipedia_url || p.wikipedia);
    if (!cand || cand === "-" || cand === "—") return null;
    try {
      const u = new URL(cand);
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {}
    return null;
  }

  function absUrl(rel) {
    return new URL(rel, document.baseURI).toString();
  }

  function crestUrl(p) {
    const file = s(p.icon);
    if (!file) return PLACEHOLDER;
    return absUrl(`${ICON_DIR}${file}`) + `?v=${encodeURIComponent(BUILD)}`;
  }

  function crestDivIcon(p, size = 28) {
    const src = crestUrl(p);
    const html = `
      <img src="${esc(src)}" width="${size}" height="${size}" alt=""
           style="display:block;width:${size}px;height:${size}px;object-fit:contain;border-radius:4px;border:1px solid rgba(0,0,0,.25)"
           onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';">
    `.trim();

    return L.divIcon({
      className: "crest-div-icon",
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    });
  }

  function buildPopupHtml(p) {
    const name = s(p.name || p["Han Name"]);
    const country = s(p.country);
    const region = s(p.region);
    const pref = s(p.prefecture || p["Current Prefecture"]);
    const daimyo = s(p.daimyo || p["Daimyo Family Name"]);
    const notes = s(p.notes);

    const crest = crestUrl(p);
    const wiki = getWikiUrl(p);

    const lines = [];

    // 1) crest
    lines.push(`
      <div class="popup-crest-wrap">
        <img class="popup-crest" src="${esc(crest)}" alt=""
             onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';">
      </div>
    `.trim());

    // 2) title
    lines.push(`<div class="popup-title">${esc(name || "—")}</div>`);

    // 3) country/region/pref
    if (country) lines.push(`<div class="popup-sub">${esc(country)}</div>`);
    if (region)  lines.push(`<div class="popup-sub">${esc(region)}</div>`);
    if (pref)    lines.push(`<div class="popup-sub">${esc(pref)}</div>`);

    if (isGovtLand(notes)) {
      // edge case: notes italic, no stipend
      if (notes) lines.push(`<div class="popup-notes"><em>${esc(notes)}</em></div>`);
    } else {
      // daimyo
      if (daimyo) lines.push(`<div class="popup-line"><b>Daimyo:</b> ${esc(daimyo)}</div>`);

      // stipend only if valid numeric
      const stipend = parseStipend(p.stipend_koku ?? p.stipend);
      if (stipend) {
        lines.push(`<div class="popup-line"><b>Stipend:</b> ${esc(stipend)} 万石 (Man Koku)</div>`);
      }
    }

    // wikipedia (only if valid)
    if (wiki) {
      lines.push(`<div class="popup-line"><a href="${esc(wiki)}" target="_blank" rel="noopener">Wikipedia</a></div>`);
    }

    // footer crest
    lines.push(`
      <div class="popup-footer">
        <img class="popup-footer-crest" src="${esc(crest)}" alt=""
             onerror="this.onerror=null;this.src='${esc(PLACEHOLDER)}';">
      </div>
    `.trim());

    return `<div class="daimyo-popup">${lines.join("\n")}</div>`;
  }

  window.DaimyoPopup = { BUILD, absUrl, crestDivIcon, buildPopupHtml };
})();
