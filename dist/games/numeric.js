import { rand } from "./common.js";
export function numeric(level, progress) {
  const limit = [10, 30, 99, 300, 999][level];
  const small = 1 + rand(limit - 1);
  const big =
    small + 1 + rand(Math.min(limit - small, level < 2 ? limit : 10 - level));
  const answer = rand(2);
  const values = answer === 0 ? [big, small] : [small, big];
  const conflict =
    Math.random() < [0.2, 0.35, 0.5, 0.65, 0.8][level] + 0.12 * progress;
  const html = values
    .map(
      (n, i) =>
        '<strong style="font-size:' +
        ((i === answer) !== conflict ? 3.4 + level * 0.34 : 2.2) +
        'rem">' +
        n +
        "</strong>",
    )
    .join('<i class="divider"></i>');
  return {
    rule: "请选择实际数值更大的数字",
    html: '<div class="number-pair">' + html + "</div>",
    options: values.map(String),
    answer,
    conflict,
    values,
  };
}
