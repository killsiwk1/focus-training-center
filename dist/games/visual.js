import { rand, shuffle, range, choose, figures } from "./common.js";
const outlines = [
  '<circle cx="50" cy="50" r="36"/>',
  '<path d="M50 10 92 86H8Z"/>',
  '<rect x="16" y="16" width="68" height="68" rx="3"/>',
  '<path d="M50 7 93 50 50 93 7 50Z"/>',
  '<path d="M28 13H72L94 50 72 87H28L6 50Z"/>',
  '<path d="m50 7 42 31-16 49H24L8 38Z"/>',
];
function tile(code, mask = 0, angle = 0) {
  const outer = code % 6,
    inner = Math.floor(code / 6) % 6;
  let cover = "";
  if (mask === 1)
    cover =
      '<rect x="59" y="0" width="27" height="100" fill="var(--stim-bg,#f4f8f7)"/>';
  if (mask === 2)
    cover = '<path d="M0 21H100M0 69H100" stroke="#c0d0ce" stroke-width="12"/>';
  return (
    '<svg class="shape" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(' +
    angle +
    ' 50 50)" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round">' +
    outlines[outer] +
    '</g><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="24">' +
    figures[inner] +
    "</text>" +
    cover +
    "</svg>"
  );
}
export function visual(level, index) {
  const kind = index % 3,
    n = level < 2 ? 3 : 4;
  if (kind === 2) {
    const selected =
      level === 4
        ? shuffle(range(6))
            .slice(0, n)
            .map((v) => v * 6 + (index % 6))
        : shuffle(range(36)).slice(0, n);
    const offset = rand(n);
    const cells = range(3 * n).map(
      (i) => selected[((i % n) + Math.floor(i / n) + offset) % n],
    );
    const missing = cells.pop(),
      choices = shuffle(selected);
    return {
      rule: "每行向左循环移动一格，请补全问号处",
      html:
        '<div class="pattern" style="--cols:' +
        n +
        '">' +
        cells.map((v) => tile(v)).join("") +
        "<b>？</b></div>",
      optionHtml: choices.map((v) => tile(v)),
      options: choices.map((_, i) => "选项" + (i + 1)),
      answer: choices.indexOf(missing),
      kind,
      key: "序" + cells.join("-"),
    };
  }
  const target = rand(36),
    angle = choose(
      level === 0
        ? [0]
        : level === 1
          ? [-8, 0, 8]
          : level === 2
            ? [-15, 0, 15]
            : [-28, -14, 0, 14, 28],
    );
  const all = range(36).filter((v) => v !== target);
  const similar = shuffle(
    all.filter(
      (v) =>
        v % 6 === target % 6 || Math.floor(v / 6) === Math.floor(target / 6),
    ),
  );
  const pool =
    level === 4
      ? shuffle(all.filter((v) => v % 6 === target % 6))
      : level === 3
        ? shuffle(
            all.filter((v) => Math.floor(v / 6) === Math.floor(target / 6)),
          )
        : level === 2
          ? similar
          : shuffle(all.filter((v) => v % 6 !== target % 6));
  const choices = shuffle([target, ...pool.slice(0, n - 1)]);
  return {
    rule: kind
      ? "观察遮挡部分，选择对应的完整图形"
      : "根据残留轮廓，选择对应的完整图形",
    html: tile(target, kind + 1, angle),
    optionHtml: choices.map((v) => tile(v, 0, angle)),
    options: choices.map((_, i) => "选项" + (i + 1)),
    answer: choices.indexOf(target),
    kind,
    key: [kind, target, angle].join("-"),
  };
}
