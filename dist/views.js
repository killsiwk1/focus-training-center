import {
  games,
  game,
  modes,
  levels,
  score,
  dateKey,
  best,
  duration,
  seconds,
  same,
} from "./catalog.js";
import { icon, btn, heading, opts, mini, esc } from "./ui.js";
import { currentDaily } from "./store.js";
const dayTitle = () =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
const dateTime = (t) =>
  new Date(t).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);
const statTime = (ms) =>
  ms > 0 && ms < 60000
    ? [Math.max(1, Math.floor(ms / 1000)), "秒"]
    : [Math.floor(ms / 60000), "分钟"];
export const pages = {
  home: "训练总览",
  daily: "每日训练",
  random: "随机挑战",
  report: "个人报告",
  history: "历史记录",
  settings: "设置",
};
const nav = (key, current) =>
  '<a href="#' +
  key +
  '" class="nav ' +
  (current === key ? "active" : "") +
  '" ' +
  (current === key ? 'aria-current="page"' : "") +
  ">" +
  icon({ daily: "calendar", random: "shuffle" }[key] || key) +
  "<span>" +
  pages[key] +
  "</span></a>";
export function shell(route) {
  const active = pages[route] ? route : "";
  document.querySelector("#side").innerHTML =
    '<a href="#home" class="brand"><span>' +
    icon("logo", 31) +
    '</span>专注力训练中心</a><div class="nav-group"><small>训练工作台</small>' +
    ["home", "daily", "random"].map((k) => nav(k, active)).join("") +
    '</div><div class="nav-group"><small>个人数据</small>' +
    ["report", "history"].map((k) => nav(k, active)).join("") +
    '</div><div class="side-bottom">' +
    nav("settings", active) +
    '<div class="private">' +
    icon("shield", 17) +
    " 数据保存在此设备</div></div>";
  document.querySelector("#bar").innerHTML =
    '<div class="crumb"><button class="mobile-toggle" data-act="menu" aria-label="打开导航">' +
    icon("menu") +
    '</button><span class="desktop-only">' +
    icon("panel", 19) +
    "</span>个人工作台 <i>/</i><b>" +
    esc(
      pages[route] ||
        {
          setup: "训练设置",
          play: "正在训练",
          result: "训练成绩",
          batch: "挑战结果",
        }[route] ||
        "训练总览",
    ) +
    '</b></div><span class="date">' +
    icon("calendar", 16) +
    dayTitle() +
    "</span>";
}
function streak(rows) {
  const days = new Set(rows.map((r) => dateKey(new Date(r.end))));
  const d = new Date();
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
function stats(items) {
  return (
    '<div class="stats">' +
    items
      .map(
        ([ic, title, val, unit]) =>
          '<div class="stat"><span class="stat-icon">' +
          icon(ic, 21) +
          "</span><div><span>" +
          title +
          "</span><strong>" +
          val +
          "<small>" +
          unit +
          "</small></strong></div></div>",
      )
      .join("") +
    "</div>"
  );
}
export function home(rows, p) {
  const today = rows.filter((r) => dateKey(new Date(r.end)) === dateKey()),
    done = currentDaily(rows, p).size;
  return (
    heading(
      "训练总览",
      "查看今日进度，选择一项训练开始练习。",
      btn("nav/random", icon("shuffle", 17) + "随机挑战"),
    ) +
    '<section class="hero"><div class="hero-copy"><div class="hero-label"><i></i>每日训练计划</div><h2>每日专注训练</h2><p>' +
    p.items.length +
    " 项认知训练<span>·</span>每项最多 " +
    p.minutes +
    ' 分钟</p><div class="hero-actions">' +
    btn(
      "daily-start",
      icon("play", 15) +
        (done === 0
          ? "开始今日训练"
          : done === p.items.length
            ? "查看今日计划"
            : "继续今日训练"),
      "hero-btn",
    ) +
    '<span class="hero-progress">' +
    done +
    " / " +
    p.items.length +
    ' 已完成</span></div></div><canvas id="orbit" aria-hidden="true"></canvas></section>' +
    stats([
      ["clock", "今日训练时长", ...statTime(sum(today, "duration"))],
      [
        "complete",
        "今日完成项目",
        new Set(today.filter((r) => r.trials.length).map((r) => r.game)).size,
        "项",
      ],
      ["flame", "连续训练", streak(rows), "天"],
    ]) +
    '<div class="group-title"><h2>训练项目</h2><span>' +
    icon("layers", 15) +
    '共 6 项</span></div><div class="cards">' +
    games
      .map((g) => {
        const recent = rows.find((r) => r.game === g.id),
          b = recent && best(rows.filter((r) => same(r, recent)));
        return (
          '<article class="game-card">' +
          mini(g) +
          '<div class="card-body"><div class="card-heading"><h3>' +
          g.name +
          "</h3><small>" +
          g.tag +
          "</small></div><p>" +
          g.desc +
          '</p><div class="card-scores"><span>最近成绩 <b>' +
          score(recent) +
          "</b></span><span>同组最佳 <b>" +
          score(b) +
          '</b></span></div><a class="card-start" href="#setup/' +
          g.id +
          '">' +
          icon("play", 13) +
          "开始训练</a></div></article>"
        );
      })
      .join("") +
    "</div>"
  );
}
export function daily(rows, p) {
  const done = currentDaily(rows, p);
  return (
    heading("每日训练", "选择训练项目，调整顺序和每项时间上限。") +
    '<section class="panel"><div class="section-title">' +
    icon("calendar") +
    '<h2>今日计划</h2><span class="badge">' +
    done.size +
    " / " +
    p.items.length +
    ' 已完成</span></div><div class="plan-list">' +
    [
      ...p.items,
      ...games.map((g) => g.id).filter((id) => !p.items.includes(id)),
    ]
      .map((id, i) => {
        const g = game(id),
          selected = p.items.includes(id);
        return (
          '<div class="plan-row"><label><input type="checkbox" data-plan="' +
          id +
          '" ' +
          (selected ? "checked" : "") +
          '><span class="module-icon ' +
          g.tone +
          '">' +
          icon(g.symbol) +
          "</span><b>" +
          g.name +
          '</b></label><span class="muted">' +
          (done.has(id) ? "已完成" : selected ? "待训练" : "未选") +
          "</span>" +
          (selected
            ? '<div class="order"><button aria-label="上移' +
              g.name +
              '" data-act="move/' +
              id +
              '/-1" ' +
              (i === 0 ? "disabled" : "") +
              '>上移</button><button aria-label="下移' +
              g.name +
              '" data-act="move/' +
              id +
              '/1" ' +
              (i === p.items.length - 1 ? "disabled" : "") +
              ">下移</button></div>"
            : "") +
          "</div>"
        );
      })
      .join("") +
    '</div><div class="fields"><label>每项时间上限（分钟）<input type="number" id="minutes" min="1" max="30" step="1" value="' +
    p.minutes +
    '"></label><label>计划难度<select id="plan-level">' +
    opts([0, 1, 2, 3, 4], p.level, levels) +
    '</select></label></div><p class="help">设置自动保存。到达时限后结算已作答内容，舒尔特方格也可提前全部找完。至少作答一次可计入今日进度。</p><div class="controls">' +
    btn(
      "daily-start",
      done.size === p.items.length ? "今日计划已完成" : "开始未完成项目",
      "primary",
    ) +
    btn("select-all", "选择全部六项") +
    "</div></section>"
  );
}
export function random(level, batches) {
  return (
    heading("随机挑战", "随机抽取不重复的项目，依次完成一组挑战。") +
    '<section class="panel"><div class="section-title">' +
    icon("shuffle") +
    '<h2>挑战设置</h2></div><form id="random"><div class="fields"><label>挑战项目数<select name="number">' +
    opts([1, 2, 3, 4, 5, 6], 3) +
    '</select></label><label>挑战难度<select name="level">' +
    opts([0, 1, 2, 3, 4], level, levels) +
    '</select></label></div><p class="help">舒尔特方格限时 30 秒，其他项目使用当前难度的固定题量。</p><button class="primary">抽取并开始</button></form></section>' +
    (batches.length
      ? '<div class="group-title"><h2>最近挑战</h2></div><div class="panel">' +
        batches
          .slice(0, 8)
          .map(
            (b) =>
              '<div class="record"><div><b>' +
              dateTime(b.end) +
              "</b><p>" +
              b.batch.items.map((id) => game(id).name).join("、") +
              "</p></div>" +
              btn("batch/" + b.batch.id, "查看成绩") +
              "</div>",
          )
          .join("") +
        "</div>"
      : "")
  );
}
export function rowsView(rows) {
  return rows.length
    ? rows
        .map(
          (r) =>
            '<button class="record record-link" data-act="result/' +
            r.id +
            '"><span class="module-icon ' +
            game(r.game).tone +
            '">' +
            icon(game(r.game).symbol) +
            '</span><span class="record-info"><b>' +
            game(r.game).name +
            "</b><small>" +
            dateTime(r.end) +
            " · " +
            levels[r.level] +
            " · " +
            modes[r.mode] +
            "</small></span><strong>" +
            score(r) +
            "</strong></button>",
        )
        .join("")
    : '<div class="empty">' +
        icon("history", 28) +
        "<p>暂无训练记录</p><small>完成一次训练后，成绩会显示在这里。</small></div>";
}
export function history(rows, f) {
  const filtered = rows.filter(
    (r) => (!f.id || r.game === f.id) && (!f.mode || r.mode === f.mode),
  );
  const max = Math.max(1, Math.ceil(filtered.length / 15));
  f.page = Math.min(f.page, max);
  return (
    heading(
      "历史记录",
      "查看每次训练的时间、成绩与作答详情。",
      btn("export", icon("download", 16) + "导出成绩"),
    ) +
    '<div class="panel"><div class="filters"><label>训练项目<select id="hist-game">' +
    opts(["", ...games.map((g) => g.id)], f.id, [
      "全部项目",
      ...games.map((g) => g.name),
    ]) +
    '</select></label><label>训练模式<select id="hist-mode">' +
    opts(["", "practice", "challenge"], f.mode, [
      "全部模式",
      ...Object.values(modes),
    ]) +
    "</select></label></div>" +
    rowsView(filtered.slice((f.page - 1) * 15, f.page * 15)) +
    '<div class="pager">' +
    btn("prev", "上一页") +
    "<span>" +
    f.page +
    " / " +
    max +
    "</span>" +
    btn("next", "下一页") +
    "</div></div>"
  );
}
function chart(values, records, unit) {
  if (!values.length)
    return '<div class="empty-chart">此范围暂无同组成绩</div>';
  const low = values.reduce((a, b) => Math.min(a, b));
  const high = values.reduce((a, b) => Math.max(a, b));
  const label = (value) => String(Number(value.toFixed(2))) + unit;
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 170 : 58 + (index * 232) / (values.length - 1),
    y: high === low ? 39 : 65 - ((value - low) * 52) / (high - low),
    detail: dateTime(records[index].end) + " · " + label(value),
  }));
  const line = points.map((p) => p.x + "," + p.y).join(" ");
  const dots = points
    .map(
      (p) =>
        '<circle cx="' +
        p.x +
        '" cy="' +
        p.y +
        '" r="3" fill="#148267"><title>' +
        p.detail +
        "</title></circle>",
    )
    .join("");
  const labels =
    high === low
      ? [[39, high]]
      : [
          [13, high],
          [65, low],
        ];
  const axis = labels
    .map(
      ([y, v]) =>
        '<text x="50" y="' +
        (y + 4) +
        '" fill="#667a71" text-anchor="end" font-size="11">' +
        label(v) +
        "</text>",
    )
    .join("");
  return (
    '<svg class="chart" viewBox="0 0 300 78" role="img" aria-label="按时间排序的成绩变化，首场 ' +
    label(values[0]) +
    "，末场 " +
    label(values.at(-1)) +
    '"><path d="M55 13H295M55 39H295M55 65H295" stroke="#e1e9e3" stroke-dasharray="4 4"/>' +
    axis +
    '<polyline points="' +
    line +
    '" fill="none" stroke="#148267" stroke-width="2"/>' +
    dots +
    "</svg>"
  );
}
export function report(rows, f) {
  const now = new Date(),
    today = dateKey(now);
  const from = (n) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n + 1);
    return +d;
  };
  const week = from(((now.getDay() + 6) % 7) + 1);
  const timeRows =
    f.range === "all"
      ? rows
      : rows.filter((r) => r.end >= from(Number(f.range)));
  const filtered = timeRows.filter(
    (r) => r.mode === f.mode && r.level === f.level,
  );
  const todayRows = rows.filter((r) => dateKey(new Date(r.end)) === today);
  const recent30 = rows.filter((r) => r.end >= from(30));
  return (
    heading("个人报告", "按相同项目和设置查看变化，追踪自己的训练表现。") +
    stats([
      ["target", "累计训练次数", rows.length, "次"],
      ["clock", "累计训练时长", ...statTime(sum(rows, "duration"))],
      [
        "calendar",
        "本周训练天数",
        new Set(
          rows
            .filter((r) => r.end >= week)
            .map((r) => dateKey(new Date(r.end))),
        ).size,
        "天",
      ],
    ]) +
    '<section class="panel summary"><b>今日完成 ' +
    todayRows.length +
    " 次，训练 " +
    duration(sum(todayRows, "duration")) +
    "</b><span>最近 30 天共训练 " +
    recent30.length +
    " 次，覆盖 " +
    new Set(recent30.map((r) => dateKey(new Date(r.end)))).size +
    ' 天。</span></section><div class="group-title"><h2>各项目成绩趋势</h2></div><div class="panel filters"><label>查看范围<select id="report-range">' +
    opts(["7", "30", "all"], f.range, ["最近 7 天", "最近 30 天", "全部历史"]) +
    '</select></label><label>训练模式<select id="report-mode">' +
    opts(["practice", "challenge"], f.mode, Object.values(modes)) +
    '</select></label><label>训练难度<select id="report-level">' +
    opts([0, 1, 2, 3, 4], f.level, levels) +
    '</select></label></div><div class="report-grid">' +
    games
      .map((g) => {
        const groups = [
          ...new Set(
            rows
              .filter(
                (r) =>
                  r.game === g.id && r.mode === f.mode && r.level === f.level,
              )
              .map((r) => r.variant),
          ),
        ];
        const v = groups.includes(f.variants[g.id])
          ? f.variants[g.id]
          : groups[0];
        const history = rows.filter(
          (r) =>
            r.game === g.id &&
            r.mode === f.mode &&
            r.level === f.level &&
            r.variant === v,
        );
        const rr = filtered
          .filter(
            (r) =>
              r.game === g.id &&
              r.variant === v &&
              (r.game !== "schulte" || r.completed),
          )
          .reverse();
        const vals = rr.map((r) =>
          r.game === "memory"
            ? r.peak
            : r.game === "schulte"
              ? r.duration / 1000
              : r.accuracy,
        );
        const unit = g.id === "schulte" ? "秒" : g.id === "memory" ? "位" : "%";
        return (
          '<section class="panel trend"><div class="section-title">' +
          icon(g.symbol) +
          "<h3>" +
          g.name +
          "</h3></div>" +
          (groups.length
            ? '<label>训练设置<select data-variant="' +
              g.id +
              '">' +
              opts(groups, v) +
              "</select></label>"
            : "") +
          chart(vals, rr, unit) +
          '<small class="muted">' +
          (vals.length
            ? dateTime(rr[0].end) + " 至 " + dateTime(rr.at(-1).end)
            : "等待训练记录") +
          '</small><div class="trend-stats"><span>历史最佳 <b>' +
          score(best(history)) +
          "</b></span><span>范围平均 <b>" +
          (vals.length
            ? (vals.reduce((a, b) => a + b) / vals.length).toFixed(1) +
              " " +
              unit
            : "暂无") +
          "</b></span></div></section>"
        );
      })
      .join("") +
    '</div><div class="group-title"><h2>范围内最近训练</h2></div><div class="panel">' +
    rowsView(filtered.slice(0, 6)) +
    "</div>"
  );
}
export function result(r, rows, next) {
  const prev = best(
    rows.filter((x) => x.id !== r.id && x.end <= r.end && same(x, r)),
  );
  return (
    heading(
      game(r.game).name + " · 训练成绩",
      dateTime(r.end) + " · " + modes[r.mode] + " · " + levels[r.level],
    ) +
    '<section class="panel result"><div class="section-title">' +
    icon("trophy") +
    "<h2>" +
    esc(r.reason || "训练结束") +
    "</h2>" +
    (r.pb ? '<span class="badge">个人最佳</span>' : "") +
    '</div><div class="result-score">' +
    score(r) +
    '</div><p class="help">' +
    esc(r.variant) +
    " · 此前同组最佳 " +
    score(prev) +
    '</p><div class="metrics">' +
    [
      ["训练用时", seconds(r.duration)],
      ["正确次数", r.correct],
      ["错误次数", r.errors],
      ["正确率", r.accuracy + "%"],
      ["平均反应时间", r.mean + " 毫秒"],
      ...(r.game === "memory"
        ? [["最高记忆长度", r.peak + " 位"]]
        : r.game === "cue"
          ? [["规则切换错误", r.switchErrors + " 次"]]
          : r.game === "schulte"
            ? [["查找进度", r.correct + " / " + r.total]]
            : []),
    ]
      .map(([t, v]) => "<div><span>" + t + "</span><b>" + v + "</b></div>")
      .join("") +
    '</div><div class="controls">' +
    (next ? btn("advance", next, "primary") : "") +
    btn("nav/setup/" + r.game, "再次训练", next ? "secondary" : "primary") +
    btn("nav/history", "历史记录") +
    "</div><details><summary>逐题作答记录（" +
    r.trials.length +
    "）</summary>" +
    r.trials
      .map(
        (t, i) =>
          '<div class="trial"><span>第 ' +
          (i + 1) +
          " 次</span><b>" +
          (t.ok ? "正确" : "错误") +
          "</b><span>" +
          seconds(t.ms) +
          "</span></div>",
      )
      .join("") +
    "</details></section>"
  );
}
export function batchSummary(id, rows) {
  const rr = rows
    .filter((r) => r.batch?.id === id)
    .sort((a, b) => a.batch.index - b.batch.index);
  if (!rr.length) return heading("训练结果", "暂无此组训练记录。");
  const b = rr[0].batch;
  return (
    heading(
      b.type === "daily" ? "每日训练结果" : "随机挑战结果",
      "已结算 " +
        rr.length +
        " / " +
        b.items.length +
        " 项 · 总训练时长 " +
        duration(sum(rr, "duration")),
    ) +
    '<div class="panel"><p>最近结算于 ' +
    dateTime(rr.at(-1).end) +
    "</p>" +
    rowsView(rr) +
    btn("nav/home", "返回总览", "primary") +
    "</div>"
  );
}
export function settings(level, offline, install) {
  return (
    heading("设置", "管理训练偏好、本机成绩和离线使用。") +
    '<div class="settings-stack"><section class="panel"><h2>训练偏好</h2><label>默认难度<select id="default-level">' +
    opts([0, 1, 2, 3, 4], level, levels) +
    '</select></label></section><section class="panel"><h2>数据与隐私</h2><p>成绩保存在当前浏览器。换设备或清理浏览器数据前，可下载备份。恢复会合并成绩并更新训练偏好和每日计划。</p><div class="controls">' +
    btn("backup", icon("disk", 16) + "下载完整备份", "primary") +
    btn("restore", "恢复备份") +
    btn("export", "导出成绩表") +
    '</div><input hidden id="restore-file" type="file" accept=".json,application/json"></section><section class="panel"><h2>安装与离线</h2><p id="offline-status">' +
    offline +
    "</p><p>苹果手机可在浏览器分享菜单选择“添加到主屏幕”。安卓手机和电脑可在浏览器菜单选择“安装应用”或创建快捷方式。</p>" +
    (install ? btn("install", "安装训练中心", "primary") : "") +
    "</section></div>"
  );
}
