import test from "node:test";
import assert from "node:assert/strict";
import { board, sizes } from "../dist/games/schulte.js";
import { stroop } from "../dist/games/stroop.js";
import { numeric } from "../dist/games/numeric.js";
import { memory, nextLength, alphabets } from "../dist/games/memory.js";
import { cue } from "../dist/games/cue.js";
import { visual } from "../dist/games/visual.js";
import { better, same, score } from "../dist/catalog.js";
for (let level = 0; level < 5; level++)
  test("难度 " + level + " 的随机出题与唯一答案", () => {
    const seen = new Set();
    let previous = true,
      switches = 0;
    for (let i = 0; i < 500; i++) {
      const b = board(level);
      assert.equal(b.size, sizes[level]);
      assert.deepEqual(
        [...b.tiles].sort((a, b) => a - b),
        Array.from({ length: b.size ** 2 }, (_, j) => j + 1),
      );
      const s = stroop(level, i / 500);
      assert.equal(s.conflict, s.word !== s.answer);
      assert.match(s.options[s.answer], /^[红蓝绿黄紫]色$/);
      const n = numeric(level, i / 500);
      assert.equal(n.values[n.answer], Math.max(...n.values));
      assert.notEqual(n.values[0], n.values[1]);
      const q = cue(level, previous);
      assert.equal(q.answer, q.reverse ? q.stimulus ^ 1 : q.stimulus);
      assert.equal(q.switched, previous !== q.reverse);
      previous = q.reverse;
      switches += q.switched;
      const v = visual(level, i);
      assert.equal(new Set(v.optionHtml).size, v.options.length);
      assert.ok(v.optionHtml[v.answer]);
      seen.add(v.key);
    }
    assert.ok(seen.size > 120);
    assert.ok(switches > 0);
  });
test("序列内容、长度与自适应边界", () => {
  for (const type of Object.keys(alphabets))
    for (let n = 2; n <= 14; n++) {
      const q = memory(type, n);
      assert.equal(q.sequence.length, n);
      assert.ok(q.sequence.every((v) => q.options.includes(v)));
    }
  assert.equal(nextLength(14, true), 14);
  assert.equal(nextLength(2, false), 2);
});
test("按模式和条件比较成绩", () => {
  const a = {
    game: "stroop",
    accuracy: 90,
    mean: 510,
    level: 2,
    mode: "challenge",
    variant: "常规",
  };
  assert.ok(better({ ...a, mean: 509 }, a));
  assert.ok(!better({ ...a, accuracy: 89 }, a));
  assert.ok(!same({ ...a, mode: "practice" }, a));
  assert.ok(!same({ ...a, variant: "限时" }, a));
  assert.equal(score(a), "90%");
});
