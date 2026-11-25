import { game, levels, modes, uid } from "./catalog.js";
import { counts, pct, colors, inks } from "./games/common.js";
import { board } from "./games/schulte.js";
import { stroop } from "./games/stroop.js";
import { numeric } from "./games/numeric.js";
import { memory, nextLength } from "./games/memory.js";
import { cue } from "./games/cue.js";
import { visual } from "./games/visual.js";
import { btn, icon, opts, heading, esc } from "./ui.js";
const root = () => document.querySelector("#main");
export function setup(id, level, mode = "practice") {
  const g = game(id);
  return (
    heading(g.name, g.desc) +
    '<section class="setup panel"><div class="section-title">' +
    icon(g.symbol) +
    '<h2>训练设置</h2></div><div class="instruction">' +
    icon("book") +
    "<p>" +
    g.rule +
    '</p></div><form id="setup"><div class="fields"><label>训练模式<select name="mode">' +
    opts(["practice", "challenge"], mode, Object.values(modes)) +
    '</select></label><label>训练难度<select name="level">' +
    opts([0, 1, 2, 3, 4], level, levels) +
    "</select></label>" +
    extra(id) +
    '</div><p class="help" id="config-note"></p><div class="controls"><button class="primary" type="submit">' +
    icon("play", 16) +
    "开始训练</button>" +
    btn("nav/home", "返回总览") +
    "</div></form></section>"
  );
}
function extra(id) {
  if (id === "memory")
    return (
      '<label>序列内容<select name="type">' +
      opts(["数字", "颜色", "图形"], "数字") +
      '</select></label><label>起始长度<select name="length"><option value="0">随难度调整</option>' +
      opts([2, 3, 4, 5, 6, 7, 8, 9, 10], 0) +
      '</select></label><label>元素显示时间<select name="display">' +
      opts([350, 600, 900, 1200], 600, [
        "350 毫秒",
        "600 毫秒",
        "900 毫秒",
        "1200 毫秒",
      ]) +
      '</select></label><label>元素间隔<select name="gap">' +
      opts([150, 300, 500, 800], 300, [
        "150 毫秒",
        "300 毫秒",
        "500 毫秒",
        "800 毫秒",
      ]) +
      "</select></label>"
    );
  if (id === "cue")
    return (
      '<label>方向规则<select name="rule">' +
      opts(["切换", "反向", "正向"], "切换", [
        "正反向切换",
        "固定反向",
        "固定正向",
      ]) +
      "</select></label>"
    );
  return "";
}
export function config(form, id) {
  const v = Object.fromEntries(new FormData(form));
  return {
    id,
    mode: v.mode,
    level: Number(v.level),
    type: v.type || "数字",
    length: Number(v.length) || 0,
    display: Number(v.display) || 600,
    gap: Number(v.gap) || 300,
    rule: v.rule || "切换",
  };
}
export function note(c) {
  const n = c.level;
  const desc = {
    schulte: [
      "4 × 4 方格",
      "5 × 5 方格",
      "5 × 5 方格，隐藏已找到标记",
      "6 × 6 方格，隐藏已找到标记",
      "7 × 7 方格，隐藏已找到标记",
    ][n],
    stroop: "基础冲突概率 " + [18, 32, 48, 64, 80][n] + "%，随本轮进度递增",
    numeric: "数值范围 1 至 " + [10, 30, 99, 300, 999][n],
    memory: "起始长度 " + (c.length || n + 2) + " 位，答对加一位，答错减一位",
    cue:
      c.rule === "切换"
        ? "每题规则切换概率 " + [8, 20, 35, 50, 70][n] + "%"
        : "使用固定" + c.rule + "规则",
    visual:
      n < 2 ? "每题三个候选图形" : "每题四个候选图形，包含近似轮廓或中心图案",
  }[c.id];
  return (
    desc +
    "。" +
    (c.id === "schulte"
      ? c.mode === "practice"
        ? "正常计时，找完全部数字后结算。"
        : "挑战限时 30 秒，到时自动结算。"
      : c.mode === "challenge"
        ? "挑战共 " +
          (c.id === "memory" ? 3 + n : counts[n]) +
          " 题，完成后自动结算。"
        : "自由练习，可随时结算或重新开始。")
  );
}
export class Trainer {
  constructor(c, onFinish) {
    this.c = c;
    this.onFinish = onFinish;
    this.trials = [];
    this.peak = 0;
    this.switchErrors = 0;
    this.index = 0;
    this.seen = new Set();
    this.startWall = Date.now();
    this.anchor = performance.now();
    this.elapsed = 0;
    this.paused = false;
    this.ended = false;
    this.lock = false;
    this.id = uid();
    this.initial = c.length || c.level + 2;
    this.length = this.initial;
    this.limit =
      c.id === "schulte" && c.mode === "challenge"
        ? 30000
        : c.minutes
          ? c.minutes * 60000
          : 0;
    this.quota = c.id === "memory" ? 3 + c.level : counts[c.level];
    this.board = c.id === "schulte" ? board(c.level) : null;
    root().innerHTML =
      heading(
        game(c.id).name,
        modes[c.mode] +
          " · " +
          levels[c.level] +
          (c.batch
            ? " · " + (c.batch.type === "daily" ? "每日训练" : "随机挑战")
            : ""),
      ) +
      '<section class="arena panel"><div class="arena-top"><b id="progress"></b><span class="time">' +
      icon("clock", 16) +
      '<b id="time">0.0 秒</b></span></div><div class="track"><i id="progressbar"></i></div><div id="stage"></div><p id="feedback" role="status"></p><div class="arena-foot">' +
      btn("help", "操作说明", "textbtn") +
      btn("pause", "暂停训练", "textbtn") +
      (c.mode === "practice" && !c.batch
        ? btn("restart", "重新开始", "textbtn") +
          btn("settle", "结束并保存", "textbtn")
        : "") +
      btn("quit", "退出训练", "textbtn") +
      "</div></section>";
    this.next();
    this.interval = setInterval(() => this.tick(), 70);
    this.tick();
  }
  time() {
    return this.elapsed + (this.paused ? 0 : performance.now() - this.anchor);
  }
  tick() {
    if (this.ended || this.paused) return;
    const t = this.time();
    if (this.limit && t >= this.limit) {
      this.finish("到达时限");
      return;
    }
    document.querySelector("#time").textContent =
      (this.limit ? "剩余 " : "") +
      ((this.limit ? this.limit - t : t) / 1000).toFixed(1) +
      " 秒";
  }
  record(ok, meta = {}) {
    this.trials.push({
      ok,
      ms: Math.max(0, Math.round(this.time() - this.shown)),
      ...meta,
    });
  }
  schedule(delay, fn) {
    this.pending = { at: this.time() + delay, fn };
    this.timer = setTimeout(() => {
      this.pending = null;
      if (!this.ended && !this.paused) fn();
    }, delay);
  }
  progress() {
    const c = this.c,
      grid = this.board,
      qty = grid ? grid.tiles.length : this.quota;
    document.querySelector("#progress").textContent = grid
      ? "已找到 " + this.index + " / " + qty
      : "第 " +
        (this.index + 1) +
        " 题" +
        (c.mode === "challenge" && !c.minutes ? " / " + qty : "");
    document.querySelector("#progressbar").style.width =
      (grid || (c.mode === "challenge" && !c.minutes)
        ? Math.min(100, (this.index / qty) * 100)
        : 0) + "%";
  }
  next() {
    if (this.ended) return;
    this.lock = false;
    this.progress();
    this.feedback("");
    const c = this.c,
      stage = document.querySelector("#stage");
    this.shown = this.time();
    if (this.board) {
      stage.innerHTML =
        "<h2>请寻找数字 <em>" +
        (this.index + 1) +
        '</em></h2><div class="schulte" style="--cols:' +
        this.board.size +
        '">' +
        this.board.tiles
          .map((n) => '<button data-tile="' + n + '">' + n + "</button>")
          .join("") +
        "</div>";
      return;
    }
    if (c.id === "memory") {
      this.q = memory(c.type, this.length);
      this.input = [];
      this.lock = true;
      this.showElement(0);
      return;
    }
    const ratio = Math.min(1, this.index / this.quota);
    if (c.id === "stroop") this.q = stroop(c.level, ratio);
    if (c.id === "numeric") this.q = numeric(c.level, ratio);
    if (c.id === "cue") this.q = cue(c.level, this.q?.reverse ?? null, c.rule);
    if (c.id === "visual") {
      for (let i = 0; i < 100; i++) {
        this.q = visual(c.level, this.index);
        if (!this.seen.has(this.q.key)) break;
      }
      this.seen.add(this.q.key);
    }
    stage.innerHTML =
      '<h2 class="' +
      (c.id === "cue" ? "rule-tag" : "") +
      '">' +
      this.q.rule +
      '</h2><div class="stimulus">' +
      this.q.html +
      "</div>" +
      this.options();
    this.shown = this.time();
  }
  options() {
    return (
      '<div class="answers">' +
      this.q.options
        .map(
          (o, i) =>
            '<button data-answer="' +
            i +
            '" aria-label="' +
            esc(o) +
            '">' +
            (this.q.optionHtml?.[i] || esc(o)) +
            "</button>",
        )
        .join("") +
      "</div>"
    );
  }
  element(value) {
    return this.c.type === "颜色"
      ? '<span style="color:' +
          inks[colors.indexOf(value)] +
          '">' +
          value +
          "</span>"
      : esc(value);
  }
  showElement(i) {
    const s = document.querySelector("#stage");
    s.innerHTML =
      '<h2>请记住出现的顺序</h2><div class="stimulus word">' +
      this.element(this.q.sequence[i]) +
      '</div><p class="center muted">' +
      (i + 1) +
      " / " +
      this.length +
      "</p>";
    this.schedule(this.c.display, () => {
      s.querySelector(".stimulus").innerHTML = "";
      this.schedule(this.c.gap, () => {
        if (i + 1 < this.length) this.showElement(i + 1);
        else {
          this.lock = false;
          s.innerHTML =
            '<h2>请按原顺序复现</h2><div class="recall" id="recall">等待输入 · 共 ' +
            this.length +
            " 位</div>" +
            this.options();
          this.shown = this.time();
        }
      });
    });
  }
  feedback(msg, ok = true) {
    const el = document.querySelector("#feedback");
    if (el) {
      el.textContent = msg;
      el.className = ok ? "good" : "bad";
    }
  }
  answer(value, tile = false) {
    if (this.ended || this.paused || this.lock) return;
    if (this.limit && this.time() >= this.limit) {
      this.finish("到达时限");
      return;
    }
    if (this.board) {
      if (!tile) return;
      const ok = value === this.index + 1;
      this.record(ok, { target: this.index + 1, choice: value });
      this.shown = this.time();
      if (!ok) {
        this.feedback("请继续寻找 " + (this.index + 1), false);
        return;
      }
      this.index++;
      if (this.index === this.board.tiles.length) {
        this.finish("完成训练");
        return;
      }
      if (this.board.hint)
        document
          .querySelector('[data-tile="' + value + '"]')
          .classList.add("found");
      document.querySelector("#stage em").textContent = this.index + 1;
      this.progress();
      this.feedback("已找到 " + value);
      return;
    }
    if (tile || value < 0 || value >= this.q.options.length) return;
    let ok, meta;
    const q = this.q;
    if (this.c.id === "memory") {
      this.input.push(q.options[value]);
      document.querySelector("#recall").textContent = this.input.join("　");
      if (this.input.length < this.length) return;
      ok = this.input.every((v, i) => v === q.sequence[i]);
      meta = { sequence: q.sequence, choice: [...this.input] };
      if (ok) this.peak = Math.max(this.peak, this.length);
      this.length = nextLength(this.length, ok);
    } else {
      ok = value === q.answer;
      meta = {
        choice: value,
        answer: q.answer,
        ...(q.conflict !== undefined ? { conflict: q.conflict } : {}),
        ...(q.switched !== undefined
          ? { switched: q.switched, reverse: q.reverse }
          : {}),
      };
      if (q.switched && !ok) this.switchErrors++;
    }
    this.record(ok, meta);
    this.index++;
    this.lock = true;
    document.querySelectorAll("[data-answer]").forEach((b) => {
      b.disabled = true;
      if (this.c.id !== "memory" && Number(b.dataset.answer) === q.answer)
        b.classList.add("correct");
    });
    this.feedback(
      ok
        ? "回答正确"
        : this.c.id === "memory"
          ? "正确顺序：" + q.sequence.join("、")
          : "正确答案：" + q.options[q.answer],
      ok,
    );
    if (
      this.c.mode === "challenge" &&
      !this.c.minutes &&
      this.index >= this.quota
    ) {
      this.finish("完成训练");
      return;
    }
    this.schedule(ok ? 360 : 850, () => this.next());
  }
  freeze() {
    if (this.paused || this.ended) return;
    this.elapsed = this.time();
    this.paused = true;
    clearTimeout(this.timer);
    document.querySelector("#stage").style.visibility = "hidden";
  }
  resume() {
    if (!this.paused || this.ended) return;
    this.anchor = performance.now();
    this.paused = false;
    document.querySelector("#stage").style.visibility = "";
    if (this.pending)
      this.schedule(
        Math.max(0, this.pending.at - this.elapsed),
        this.pending.fn,
      );
    this.tick();
  }
  dispose() {
    clearInterval(this.interval);
    clearTimeout(this.timer);
    this.ended = true;
  }
  finish(reason) {
    if (this.ended) return;
    const c = this.c;
    const ms = Math.round(reason === "到达时限" ? this.limit : this.time());
    this.dispose();
    const correct = this.trials.filter((t) => t.ok).length;
    const variant = [
      c.id === "memory"
        ? [c.type, this.initial, c.display, c.gap].join("/")
        : "",
      c.id === "cue" ? c.rule : "",
      this.limit ? "限时" + this.limit / 1000 + "秒" : "常规",
    ]
      .filter(Boolean)
      .join(" · ");
    this.onFinish({
      id: this.id,
      game: c.id,
      mode: c.mode,
      level: c.level,
      start: this.startWall,
      end: Date.now(),
      duration: ms,
      correct,
      errors: this.trials.length - correct,
      accuracy: pct(correct, this.trials.length),
      mean: this.trials.length
        ? Math.round(
            this.trials.reduce((s, t) => s + t.ms, 0) / this.trials.length,
          )
        : 0,
      peak: this.peak,
      switchErrors: this.switchErrors,
      total: this.board?.tiles.length || this.index,
      completed: this.board
        ? this.index === this.board.tiles.length
        : !!this.trials.length,
      reason,
      variant,
      trials: this.trials,
      batch: c.batch || null,
    });
  }
  key(e) {
    if (
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      this.ended ||
      this.paused ||
      this.board ||
      document.querySelector("dialog[open]")
    )
      return;
    let i = "123456789".indexOf(e.key);
    if (e.key.length !== 1) i = -1;
    if (this.c.id === "cue")
      i = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }[e.key] ?? i;
    if (this.c.id === "numeric")
      i = { ArrowLeft: 0, ArrowRight: 1 }[e.key] ?? i;
    if (i >= 0) {
      e.preventDefault();
      this.answer(i);
    }
  }
}
