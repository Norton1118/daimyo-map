// ---- shared config + helpers (match app.js) ----
const FIELD = {
  name:      'name',
  prefect:   'prefecture',
  daimyo:    'daimyo',
  stipend:   'stipend',
  icon:      'icon',
  wikiRaw:   'wikipedia',
  wikiUrl:   'wikipedia_url',
  notes:     'notes',
  region:    'region'
};
const ICON_BASE = 'imgs/';

function buildWikiURL(props) {
  const explicit = props[FIELD.wikiUrl];
  if (typeof explicit === 'string' && /^https?:\/\//i.test(explicit)) return explicit;
  const raw = props[FIELD.wikiRaw];
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const title = String(raw).replace(/\s*-\s*Wikipedia/i, '').trim();
  return 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/\s+/g, '_'));
}

function formatStipend(v) {
  if (v == null || v === '') return '';
  const s = String(v).trim();
  if (/[万]|man|koku/i.test(s)) return s;
  const n = Number(s);
  return Number.isFinite(n) ? `${s} man-koku` : s;
}

function popupHTML(props) {
  const name    = props[FIELD.name]    || '(unknown)';
  const prefect = props[FIELD.prefect] || '';
  const daimyo  = props[FIELD.daimyo]  || '';
  const stipend = formatStipend(props[FIELD.stipend]);
  const wiki    = buildWikiURL(props);
  const icon    = props[FIELD.icon] ? `${ICON_BASE}${props[FIELD.icon]}` : null;

  const iconImg = icon
    ? `<img src="${icon}" alt="" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;border-radius:4px;">`
    : '';

  const lines = [];
  if (prefect) lines.push(`${prefect}`);
  if (daimyo)  lines.push(`Daimyo: ${daimyo}`);
  if (stipend) lines.push(`Stipend: ${stipend}`);

  const wikiLine = wiki
    ? `<div style="margin-top:6px;"><a href="${wiki}" target="_blank" rel="noopener">Wikipedia</a></div>`
    : '';

  return `
    <div style="min-width:220px">
      <div style="font-weight:600;display:flex;align-items:center;">
        ${iconImg}<span>${name}</span>
      </div>
      <div style="margin-top:6px;line-height:1.3">${lines.join('<br>')}</div>
      ${wikiLine}
    </div>
  `;
}

function makeIcon(props) {
  const file = props[FIELD.icon];
  if (!file) return null;
  return L.icon({
    iconUrl: ICON_BASE + file,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    className: 'crest-icon'
  });
}
