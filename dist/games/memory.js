import { colors, figures, choose } from "./common.js";
export const alphabets = {
  数字: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  颜色: colors,
  图形: figures,
};
export function memory(type, length) {
  const options = alphabets[type];
  return { options, sequence: Array.from({ length }, () => choose(options)) };
}
export function nextLength(length, success) {
  return Math.max(2, Math.min(14, length + (success ? 1 : -1)));
}
