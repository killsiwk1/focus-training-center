import { games, game, levels, modes, dateKey, uid, score } from "./catalog.js";
import { shuffle } from "./games/common.js";
import * as db from "./store.js";
import * as view from "./views.js";
import { Trainer, setup, config, note } from "./trainer.js";
import { btn, icon, esc, orbital } from "./ui.js";
const $ = (s) => document.querySelector(s),
  main = $("#main"),
  dlg = $("#dialog");
let rows = [],
  plan = db.defaults(),
  defaultLevel = 1,
  active = null,
  queue = null,
  route = "",
  args = [],
  modalActions = {},
  installEvent = null,
  offline = "正在检查离线资源…",
  saving = false,
  pending = null;
const filters = {
  history: { id: "", mode: "", page: 1 },
  report: { range: "30", mode: "practice", level: 1, variants: {} },
};
const notify = (msg) => {
  const n = $("#notice");
  n.textContent = msg;
  n.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => n.classList.remove("show"), 3300);
};
function modal(title, body, actions) {
  if (dlg.open) dlg.close();
  modalActions = {};
  dlg.innerHTML =
    "<h2>" +
    esc(title) +
    '</h2><div class="modal-copy">' +
    body +
    '</div><div class="controls">' +
    actions
      .map(([label, fn, cls], i) => {
        modalActions[i] = fn;
        return btn("modal/" + i, esc(label), cls || "secondary");
      })
      .join("") +
    "</div>";
  dlg.showModal();
}
function close() {
  if (dlg.open) dlg.close();
}
function resume() {
  close();
  active?.resume();
}
function pause(help = false) {
  if (!active || active.ended) return;
  active.freeze();
  modal(
    help ? "操作说明" : "训练已暂停",
    "<p>" +
      (help
        ? game(active.c.id).rule +
          " 按钮支持触控、鼠标和键盘。选项可用数字键按位置作答。"
        : "休息时不累计训练用时。") +
      "</p>",
    [["继续训练", resume, "primary"]],
  );
}
function confirmExit(fn) {
  active.freeze();
  modal(
    "退出本次训练？",
    "<p>本项尚未结算，退出会舍弃本次作答。此前已保存的成绩会保留。</p>",
    [
      ["继续训练", resume, "primary"],
      [
        "退出训练",
        () => {
          close();
          active?.dispose();
          active = null;
          fn();
        },
      ],
    ],
  );
}
function nav(path) {
  if (active && !active.ended) {
    confirmExit(() => nav(path));
    return;
  }
  if (saving || pending) return;
  close();
  if (location.hash === "#" + path) render();
  else location.hash = path;
}
const batchDone = (q, index) =>
  rows.some((r) => r.batch?.id === q.id && r.batch.index === index);
const nextIndex = (q) => q.items.findIndex((_, i) => !batchDone(q, i));
function resumeBox() {
  if (!queue || nextIndex(queue) < 0) return "";
  return (
    '<div class="resume-box"><span>尚有一组' +
    (queue.type === "daily" ? "每日训练" : "随机挑战") +
    "未完成</span>" +
    btn("queue-resume", "继续训练") +
    "</div>"
  );
}
function render() {
  if (active && !active.ended) return;
  [route, ...args] = (location.hash.slice(1) || "home").split("/");
  if (
    ![...Object.keys(view.pages), "setup", "result", "batch", "play"].includes(
      route,
    )
  )
    route = "home";
  if (route === "play") {
    history.replaceState(null, "", "#" + (queue ? queue.type : "home"));
    route = queue ? queue.type : "home";
  }
  view.shell(route);
  document.body.classList.remove("drawer");
  $("#shade").hidden = true;
  const id = args[0];
  let html;
  switch (route) {
    case "setup":
      html = game(id) ? setup(id, defaultLevel) : view.home(rows, plan);
      break;
    case "daily":
      html = resumeBox() + view.daily(rows, plan);
      break;
    case "random":
      html =
        resumeBox() +
        view.random(
          defaultLevel,
          rows.filter(
            (r, i, a) =>
              r.batch?.type === "random" &&
              a.findIndex((x) => x.batch?.id === r.batch.id) === i,
          ),
        );
      break;
    case "history":
      html = view.history(rows, filters.history);
      break;
    case "report":
      html = view.report(rows, filters.report);
      break;
    case "settings":
      html = view.settings(defaultLevel, offline, !!installEvent);
      break;
    case "result": {
      const r = rows.find((r) => r.id === id);
      html = r
        ? view.result(
            r,
            rows,
            queue && r.batch?.id === queue.id
              ? nextIndex(queue) < 0
                ? "查看整组结果"
                : "继续下一项"
              : "",
          )
        : view.history(rows, filters.history);
      break;
    }
    case "batch":
      html = view.batchSummary(id, rows);
      break;
    default:
      html = view.home(rows, plan);
  }
  main.innerHTML = html;
  document.title = (view.pages[route] || "训练工作台") + " · 专注力训练中心";
  if ($("#setup"))
    $("#config-note").textContent = note(config($("#setup"), id));
  requestAnimationFrame(orbital);
}
async function start(c) {
  close();
  document.body.classList.remove("drawer");
  $("#shade").hidden = true;
  history.pushState(null, "", "#play");
  route = "play";
  view.shell("play");
  active = new Trainer(c, finish);
  window.scrollTo(0, 0);
}
async function finish(row) {
  if (saving) return;
  active = null;
  pending = row;
  saving = true;
  try {
    const saved = await db.save(row);
    rows = await db.all();
    pending = null;
    saving = false;
    history.replaceState(null, "", "#result/" + saved.id);
    render();
    window.scrollTo(0, 0);
  } catch {
    saving = false;
    modal(
      "成绩暂未保存",
      "<p>请检查浏览器是否允许本机存储、设备是否有剩余空间，然后重试。</p>",
      [
        [
          "重试保存",
          () => {
            close();
            finish(row);
          },
          "primary",
        ],
        [
          "下载本次成绩",
          () =>
            download("本次成绩.json", JSON.stringify(row), "application/json"),
        ],
      ],
    );
  }
}
function startNext() {
  if (!queue) return;
  const i = nextIndex(queue);
  if (i < 0) {
    nav("batch/" + queue.id);
    return;
  }
  start({
    id: queue.items[i],
    mode: queue.type === "daily" ? "practice" : "challenge",
    level: queue.level,
    type: "数字",
    display: 600,
    gap: 300,
    length: 0,
    rule: "切换",
    minutes: queue.type === "daily" ? queue.minutes : 0,
    batch: {
      id: queue.id,
      type: queue.type,
      index: i,
      items: queue.items,
      date: queue.date,
    },
  });
}
async function newQueue(type, items, level, minutes = 0) {
  if (!items.length) {
    nav("daily");
    notify("今日计划已完成");
    return;
  }
  const make = async () => {
    close();
    queue = { id: uid(), type, items, level, minutes, date: dateKey() };
    await db.setPref("queue", queue);
    startNext();
  };
  if (queue && nextIndex(queue) >= 0) {
    if (
      type === "daily" &&
      queue.type === "daily" &&
      queue.date === dateKey() &&
      queue.level === level &&
      queue.minutes === minutes &&
      JSON.stringify(queue.items.filter((_, i) => !batchDone(queue, i))) ===
        JSON.stringify(items)
    ) {
      startNext();
      return;
    }
    modal(
      "开始新的一组训练？",
      "<p>新计划将替换待继续的训练队列。已结算的各项成绩会保留。</p>",
      [
        ["开始新计划", make, "primary"],
        [
          "继续原计划",
          () => {
            close();
            startNext();
          },
        ],
        ["取消", close],
      ],
    );
  } else await make();
}
function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function csv() {
  const head = [
    "训练项目",
    "开始时间",
    "完成时间",
    "模式",
    "难度",
    "设置",
    "用时（秒）",
    "正确次数",
    "错误次数",
    "正确率（%）",
    "平均反应时间（毫秒）",
    "本次成绩",
    "最高记忆长度",
    "规则切换错误",
    "刷新最佳",
    "训练组",
  ];
  const cells = [
    head,
    ...rows.map((r) => [
      game(r.game).name,
      new Date(r.start).toLocaleString("zh-CN"),
      new Date(r.end).toLocaleString("zh-CN"),
      modes[r.mode],
      levels[r.level],
      r.variant,
      r.duration / 1000,
      r.correct,
      r.errors,
      r.accuracy,
      r.mean,
      score(r),
      r.peak,
      r.switchErrors,
      r.pb ? "是" : "否",
      r.batch?.type === "daily"
        ? "每日训练"
        : r.batch
          ? "随机挑战"
          : "独立训练",
    ]),
  ];
  download(
    "训练成绩-" + dateKey() + ".csv",
    "\uFEFF" +
      cells
        .map((row) =>
          row
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[=+@\-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
async function changePlan(p, redraw = true) {
  if (!db.validPlan(p)) {
    notify("至少保留一项训练，时长范围为 1 至 30 分钟");
    render();
    return;
  }
  const previous = plan;
  plan = p;
  if (redraw) render();
  try {
    await db.setPref("plan", p);
  } catch (error) {
    if (plan === p) {
      plan = previous;
      render();
    }
    throw error;
  }
}
async function act(action) {
  const [a, b, c] = action.split("/");
  switch (a) {
    case "modal":
      await modalActions[b]?.();
      break;
    case "menu":
      document.body.classList.toggle("drawer");
      $("#shade").hidden = !document.body.classList.contains("drawer");
      break;
    case "nav":
      nav(action.slice(4));
      break;
    case "result":
    case "batch":
      nav(action);
      break;
    case "queue-resume":
    case "advance":
      startNext();
      break;
    case "daily-start":
      await newQueue(
        "daily",
        plan.items.filter((id) => !db.currentDaily(rows, plan).has(id)),
        plan.level,
        plan.minutes,
      );
      break;
    case "select-all":
      await changePlan({
        ...plan,
        items: [
          ...plan.items,
          ...games.map((g) => g.id).filter((id) => !plan.items.includes(id)),
        ],
      });
      break;
    case "move": {
      const items = [...plan.items],
        i = items.indexOf(b),
        j = i + Number(c);
      if (i >= 0 && j >= 0 && j < items.length) {
        [items[i], items[j]] = [items[j], items[i]];
        await changePlan({ ...plan, items });
      }
      break;
    }
    case "help":
      pause(true);
      break;
    case "pause":
      pause();
      break;
    case "quit": {
      const dest = active?.c.batch?.type || "home";
      confirmExit(() => nav(dest));
      break;
    }
    case "settle":
      if (!active.trials.length) {
        notify("请先完成一次作答");
        break;
      }
      active.finish("主动结算");
      break;
    case "restart": {
      const conf = active.c;
      active.freeze();
      modal(
        "重新开始本次练习？",
        "<p>未结算的作答将被舍弃，新一轮会重新出题。</p>",
        [
          [
            "重新开始",
            () => {
              active.dispose();
              active = null;
              close();
              start(conf);
            },
            "primary",
          ],
          ["继续练习", resume],
        ],
      );
      break;
    }
    case "prev":
    case "next":
      filters.history.page = Math.max(
        1,
        filters.history.page + (a === "prev" ? -1 : 1),
      );
      render();
      break;
    case "export":
      csv();
      break;
    case "backup":
      download(
        "专注力训练备份-" + dateKey() + ".json",
        JSON.stringify(
          {
            format: "专注力训练中心",
            version: 1,
            plan,
            queue,
            level: defaultLevel,
            results: rows,
          },
          null,
          2,
        ),
        "application/json",
      );
      break;
    case "restore":
      $("#restore-file").click();
      break;
    case "install":
      if (installEvent) {
        await installEvent.prompt();
        await installEvent.userChoice;
        installEvent = null;
        render();
      }
      break;
  }
}
function fail(e) {
  console.error(e);
  notify("操作未完成，请检查本机存储后重试");
}
document.addEventListener("click", (e) => {
  const item = e.target.closest("button,a");
  if (!item) return;
  if (item.matches('a[href^="#"]') && active && !active.ended) {
    e.preventDefault();
    nav(item.hash.slice(1));
    return;
  }
  if (item.dataset.answer !== undefined)
    active?.answer(Number(item.dataset.answer));
  else if (item.dataset.tile !== undefined)
    active?.answer(Number(item.dataset.tile), true);
  else if (item.dataset.act) act(item.dataset.act).catch(fail);
});
$("#shade").onclick = () => act("menu");
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "setup") start(config(e.target, args[0]));
  if (e.target.id === "random") {
    const f = new FormData(e.target);
    newQueue(
      "random",
      shuffle(games.map((g) => g.id)).slice(0, Number(f.get("number"))),
      Number(f.get("level")),
    ).catch(fail);
  }
});
document.addEventListener("change", async (e) => {
  try {
    const el = e.target;
    if (el.closest("#setup")) {
      $("#config-note").textContent = note(config($("#setup"), args[0]));
      return;
    }
    if (el.dataset.plan) {
      const items = el.checked
        ? [...plan.items, el.dataset.plan]
        : plan.items.filter((id) => id !== el.dataset.plan);
      await changePlan({ ...plan, items });
      return;
    }
    if (el.id === "minutes" || el.id === "plan-level") {
      await changePlan(
        {
          ...plan,
          [el.id === "minutes" ? "minutes" : "level"]: Number(el.value),
        },
        false,
      );
      return;
    }
    if (el.id === "default-level") {
      await db.setPref("level", Number(el.value));
      defaultLevel = Number(el.value);
      notify("默认难度已保存");
      return;
    }
    if (el.id.startsWith("hist-")) {
      filters.history[el.id === "hist-game" ? "id" : "mode"] = el.value;
      filters.history.page = 1;
      render();
    }
    if (el.id.startsWith("report-")) {
      const k = el.id.slice(7);
      filters.report[k] = k === "level" ? Number(el.value) : el.value;
      render();
    }
    if (el.dataset.variant) {
      filters.report.variants[el.dataset.variant] = el.value;
      render();
    }
    if (el.id === "restore-file" && el.files[0]) {
      const file = el.files[0];
      el.value = "";
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        notify("文件无法读取，请选择完整的训练备份");
        return;
      }
      modal(
        "合并备份数据？",
        "<p>相同记录会自动去重。每日计划和默认难度将使用备份内的设置。</p>",
        [
          [
            "确认恢复",
            async () => {
              try {
                const n = await db.restore(data);
                rows = await db.all();
                plan = await db.pref("plan");
                defaultLevel = await db.pref("level");
                queue = await db.pref("queue");
                if (queue?.type === "daily" && queue.date !== dateKey())
                  queue = null;
                close();
                render();
                notify("恢复完成，新增 " + n + " 条成绩");
              } catch {
                close();
                notify("备份格式或内容无效，未导入");
              }
            },
            "primary",
          ],
          ["取消", close],
        ],
      );
    }
  } catch (err) {
    fail(err);
  }
});
dlg.addEventListener("cancel", (e) => {
  e.preventDefault();
  if (pending) return;
  resume();
});
window.addEventListener("keydown", (e) => active?.key(e));
window.addEventListener("hashchange", () => {
  if (pending || saving) {
    history.replaceState(null, "", "#play");
    return;
  }
  if (active && !active.ended) {
    const target = location.hash.slice(1) || "home";
    history.replaceState(null, "", "#play");
    confirmExit(() => nav(target));
    return;
  }
  render();
  window.scrollTo(0, 0);
});
document.addEventListener("visibilitychange", async () => {
  if (document.hidden && active && !active.ended && !dlg.open) pause();
  if (!document.hidden && !active && !saving && !pending && route) {
    rows = await db.all();
    plan = (await db.pref("plan")) || db.defaults();
    render();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (active || pending || saving) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("resize", orbital);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  if (route === "settings") render();
});
async function init() {
  try {
    await db.openStore();
    rows = await db.all();
    plan = (await db.pref("plan")) || db.defaults();
    defaultLevel = (await db.pref("level")) ?? 1;
    filters.report.level = defaultLevel;
    queue = await db.pref("queue");
    if (queue?.type === "daily" && queue.date !== dateKey()) queue = null;
    render();
  } catch {
    main.innerHTML =
      '<section class="panel"><h1>无法打开本机成绩库</h1><p>请允许浏览器使用本机存储，再刷新页面重试。</p><button onclick="location.reload()">重新加载</button></section>';
  }
  try {
    if (!("serviceWorker" in navigator)) throw Error();
    await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    offline = "离线资源已就绪。断网后可在此设备继续训练。";
  } catch {
    offline = "当前浏览器未能启用离线缓存，请使用安全连接打开网站后重试。";
  }
  if ($("#offline-status")) $("#offline-status").textContent = offline;
}
init();
