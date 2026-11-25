import { colors, inks, rand, other } from "./common.js";
export function stroop(level, progress) {
  const answer = rand(5);
  const conflict =
    Math.random() <
    Math.min(0.96, [0.18, 0.32, 0.48, 0.64, 0.8][level] + 0.14 * progress);
  const word = conflict ? other(5, answer) : answer;
  return {
    rule: "请选择字体实际显示的颜色",
    html:
      '<strong class="word" style="color:' +
      inks[answer] +
      '">' +
      colors[word] +
      "</strong>",
    options: colors,
    answer,
    conflict,
    word,
  };
}
