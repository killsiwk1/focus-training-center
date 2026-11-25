import { levels } from "./games/common.js";
export { levels };
export const games = [
  {
    id: "schulte",
    name: "舒尔特方格",
    tag: "视觉搜索",
    desc: "按顺序寻找数字，练习视觉扫描与专注。",
    rule: "从 1 开始，按从小到大的顺序点完全部数字。误点后继续寻找当前目标。",
    tone: "mint",
    symbol: "grid",
  },
  {
    id: "stroop",
    name: "字色干扰",
    tag: "选择性注意",
    desc: "忽略文字含义，判断字的实际颜色。",
    rule: "只判断字体实际显示的颜色。例如用蓝色写的“红色”，请选择“蓝色”。",
    tone: "lilac",
    symbol: "type",
  },
  {
    id: "numeric",
    name: "数值干扰",
    tag: "抗干扰",
    desc: "排除字号干扰，找出数值更大的数字。",
    rule: "比较左右两个数字的实际数值，选择数值较大的一项。",
    tone: "peach",
    symbol: "compare",
  },
  {
    id: "memory",
    name: "序列记忆",
    tag: "工作记忆",
    desc: "记住依次出现的内容，再按原顺序复现。",
    rule: "观察完整序列。出现作答选项后逐个选择，系统在最后一项输入后判定整组顺序。",
    tone: "blue",
    symbol: "sequence",
  },
  {
    id: "cue",
    name: "反向线索任务",
    tag: "抑制控制",
    desc: "根据当前规则，选择相同或相反的方向。",
    rule: "先看当前规则，再看箭头。反向时选相反方向，正向时选相同方向。可使用方向键。",
    tone: "rose",
    symbol: "switch",
  },
  {
    id: "visual",
    name: "视觉完型测试",
    tag: "图形识别",
    desc: "从局部线索识别完整图形，补全图案。",
    rule: "观察轮廓和中心符号，从选项中找出对应完整图形。遇到阵列时，按提示补全最后一格。",
    tone: "sand",
    symbol: "shape",
  },
];
export const game = (id) => games.find((g) => g.id === id);
export const modes = { practice: "练习模式", challenge: "挑战模式" };
export const dateKey = (d = new Date()) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
export function duration(ms) {
  const s = Math.floor(ms / 1000);
  return s >= 60 ? Math.floor(s / 60) + " 分 " + (s % 60) + " 秒" : s + " 秒";
}
export const seconds = (ms) => (ms / 1000).toFixed(2) + " 秒";
export function score(r) {
  if (!r) return "暂无";
  if (r.game === "schulte")
    return r.completed
      ? seconds(r.duration)
      : r.correct + "/" + r.total + " 格";
  if (r.game === "memory") return r.peak + " 位";
  return r.accuracy + "%";
}
export function rank(r) {
  if (r.game === "schulte")
    return [Number(r.completed), r.correct, -r.duration, -r.errors];
  if (r.game === "memory") return [r.peak, r.accuracy, -r.mean];
  return [r.accuracy, -r.mean];
}
export function better(a, b) {
  if (!b) return true;
  const x = rank(a),
    y = rank(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}
export function same(a, b) {
  return (
    a.game === b.game &&
    a.mode === b.mode &&
    a.level === b.level &&
    a.variant === b.variant
  );
}
export function best(rows) {
  return rows.reduce((a, b) => (better(b, a) ? b : a), null);
}
export const uid = () =>
  crypto.randomUUID?.() ||
  Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
