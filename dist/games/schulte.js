import { shuffle, range } from "./common.js";
export const sizes = [4, 5, 5, 6, 7];
export function board(level) {
  const size = sizes[level];
  return {
    size,
    tiles: shuffle(range(size * size).map((n) => n + 1)),
    hint: level < 2,
  };
}
