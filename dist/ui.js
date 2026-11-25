const paths = {
  logo: '<circle cx="12" cy="12" r="8.8" stroke-dasharray="39 5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="5" stroke-dasharray="22 4"/><circle cx="12" cy="12" r="1.25" fill="currentColor"/>',
  home: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-13 4h3"/>',
  shuffle:
    '<path d="M3 6h3c4 0 7 12 11 12h4m-4-4 4 4-4 4M3 18h3c2 0 4-3 5-5m2-3c2-3 3-4 5-4h3m-4-4 4 4-4 4"/>',
  report: '<path d="M3 3v18h18M7 16v-5m5 5V6m5 10v-7"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2"/>',
  settings:
    '<path d="M3 6h8m6 0h4M3 12h2m6 0h10M3 18h11m5 0h2"/><circle cx="14" cy="6" r="3"/><circle cx="8" cy="12" r="3"/><circle cx="16" cy="18" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  complete: '<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
  flame:
    '<path d="M13 2c1 5-4 6-3 10 2-1 3-3 3-5 5 3 8 8 4 12-5 5-14 1-13-5 0-4 3-6 5-9 0 3 1 3 1 4 1-3 3-4 3-7Z"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  shield:
    '<path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5Z"/><path d="m8 12 3 3 5-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
  play: '<path d="m8 4 12 8-12 8Z" fill="currentColor" stroke="none"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18m6-18v18"/>',
  type: '<path d="M3 5h13m-7 0v15m5-8h8m-4 0v8"/>',
  compare: '<path d="m4 8 5 4-5 4m8-9h8m-8 10h8"/>',
  sequence:
    '<rect x="2" y="8" width="6" height="9" rx="1"/><path d="M10 6h5v11m2-13h5v13"/>',
  switch: '<path d="M3 7h17l-4-4m5 14H4l4 4"/>',
  shape: '<path d="M12 2 22 20H2Z"/><circle cx="12" cy="14" r="2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1m-1 6h1m-1 6h1"/>',
  book: '<path d="M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2Zm9 2v15"/>',
  trophy:
    '<path d="M7 3h10v5c0 4-2 6-5 6s-5-2-5-6Zm0 2H3c0 5 1 7 5 7m9-7h4c0 5-1 7-5 7m-4 2v5m-5 2h10"/>',
  disk: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v13c0 4 16 4 16 0V5M4 11c0 4 16 4 16 0"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-9 10 9 4 9-4m-18 5 9 4 9-4"/>',
};
export const icon = (key, size = 20) =>
  '<svg width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  (paths[key] || "") +
  "</svg>";
export const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
export const btn = (action, label, cls = "secondary") =>
  '<button type="button" class="' +
  cls +
  '" data-act="' +
  action +
  '">' +
  label +
  "</button>";
export const opts = (values, selected, labels = values) =>
  values
    .map(
      (v, i) =>
        '<option value="' +
        esc(v) +
        '" ' +
        (String(v) === String(selected) ? "selected" : "") +
        ">" +
        esc(labels[i]) +
        "</option>",
    )
    .join("");
export const heading = (title, sub, action = "") =>
  '<div class="page-heading"><div><h1>' +
  title +
  "</h1><p>" +
  sub +
  "</p></div>" +
  action +
  "</div>";
export function mini(g) {
  const art = {
    schulte:
      '<div class="tiny-grid">' +
      [8, 1, 6, 3, 5, 7, 4, 9, 2].map((n) => "<b>" + n + "</b>").join("") +
      "</div>",
    stroop: '<div class="color-words"><b>蓝</b><b>红</b><b>绿</b></div>',
    numeric: '<div class="digits"><b>2</b><i></i><b>8</b></div>',
    memory: '<div class="tiles"><b>3</b><b>7</b><b>2</b></div>',
    cue: '<div class="cue-art">←<b>→</b></div>',
    visual: '<div class="art-shapes">◐ <b>△</b> ◇</div>',
  };
  return (
    '<div aria-hidden="true" class="mini ' +
    g.tone +
    '">' +
    art[g.id] +
    "</div>"
  );
}
export function orbital() {
  const canvas = document.querySelector("#orbit");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (!w || !h) return;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * d;
  canvas.height = h * d;
  ctx.scale(d, d);
  ctx.translate(w * 0.52, h * 0.5);
  const z = Math.min(w / 330, h / 202);
  ctx.scale(z, z);
  ctx.strokeStyle = "rgba(157,232,201,.15)";
  ctx.lineWidth = 0.65;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 112 + i * 27, 48 + i * 13, -0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let ring = 0; ring < 61; ring++) {
    const v = (ring / 61) * Math.PI * 2;
    for (let j = 0; j < 134; j++) {
      const u = (j / 134) * Math.PI * 2;
      const R = 67 + 7 * Math.sin(3 * u + 0.5);
      const tube = 23 + 5 * Math.cos(2 * u);
      const x = (R + tube * Math.cos(v)) * Math.cos(u),
        y = (R + tube * Math.cos(v)) * Math.sin(u),
        s = tube * Math.sin(v) + 12 * Math.sin(2 * u);
      const yy = y * 0.64 - s * 0.77,
        depth = y * 0.77 + s * 0.64;
      const X = 1.32 * (x * 0.9 + yy * 0.44),
        Y = 1.32 * (-x * 0.44 + yy * 0.9);
      const k = (depth + 90) / 180;
      ctx.fillStyle =
        "rgba(" +
        Math.floor(70 + 151 * k) +
        ",255," +
        Math.floor(153 + 67 * k) +
        "," +
        (0.14 + 0.71 * k) +
        ")";
      ctx.fillRect(X, Y, 0.8 + k * 0.7, 0.8 + k * 0.7);
    }
  }
  for (const [x, y] of [
    [-145, -56],
    [118, 61],
    [152, -51],
    [-113, 64],
  ]) {
    ctx.strokeStyle = "rgba(169,240,213,.48)";
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + 3, y);
    ctx.moveTo(x, y - 3);
    ctx.lineTo(x, y + 3);
    ctx.stroke();
  }
}
