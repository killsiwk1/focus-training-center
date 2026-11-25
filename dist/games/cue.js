import { rand, directions, arrows } from "./common.js";
export function cue(level, previous = null, mode = "切换") {
  const switched =
    mode === "切换" &&
    previous !== null &&
    Math.random() < [0.08, 0.2, 0.35, 0.5, 0.7][level];
  const reverse =
    mode === "反向" ||
    (mode === "切换" &&
      (previous === null || (switched ? !previous : previous)));
  const stimulus = rand(level < 2 ? 2 : 4);
  const answer = reverse ? stimulus ^ 1 : stimulus;
  return {
    rule: reverse ? "反向规则 · 请选择相反方向" : "正向规则 · 请选择相同方向",
    html: '<strong class="arrow-stim">' + arrows[stimulus] + "</strong>",
    options: directions.slice(0, level < 2 ? 2 : 4),
    answer,
    reverse,
    switched,
    stimulus,
  };
}
