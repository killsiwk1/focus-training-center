import { games, better, same, best, game, dateKey } from "./catalog.js";
let db;
export const defaults = () => ({
  items: games.map((g) => g.id),
  minutes: 2,
  level: 1,
});
function request(q) {
  return new Promise((resolve, reject) => {
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
export async function openStore() {
  const q = indexedDB.open("focus-training-center", 1);
  q.onupgradeneeded = () => {
    q.result.createObjectStore("results", { keyPath: "id" });
    q.result.createObjectStore("prefs");
  };
  db = await request(q);
  db.onversionchange = () => db.close();
}
function done(t) {
  return new Promise((resolve, reject) => {
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => reject(t.error || Error("保存失败"));
  });
}
export async function all() {
  const rows = await request(
    db.transaction("results").objectStore("results").getAll(),
  );
  return rows.sort((a, b) => b.end - a.end || b.id.localeCompare(a.id));
}
export async function pref(key) {
  return request(db.transaction("prefs").objectStore("prefs").get(key));
}
export async function setPref(key, value) {
  const t = db.transaction("prefs", "readwrite");
  t.objectStore("prefs").put(value, key);
  return done(t);
}
export async function save(row) {
  const t = db.transaction("results", "readwrite"),
    s = t.objectStore("results"),
    finished = done(t);
  const rows = await request(s.getAll());
  const old = rows.find((r) => r.id === row.id);
  if (old) {
    await finished;
    return old;
  }
  row.pb = better(row, best(rows.filter((r) => same(row, r))));
  s.add(row);
  await finished;
  return row;
}
const finite = (n) => Number.isFinite(n) && n >= 0;
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const textId = (v) => typeof v === "string" && /^[a-z0-9-]{1,100}$/i.test(v);
export function validPlan(p) {
  return (
    p &&
    Array.isArray(p.items) &&
    p.items.length > 0 &&
    p.items.length <= 6 &&
    p.items.every((id) => !!game(id)) &&
    new Set(p.items).size === p.items.length &&
    Number.isInteger(p.minutes) &&
    p.minutes >= 1 &&
    p.minutes <= 30 &&
    integer(p.level) &&
    p.level < 5
  );
}
function validQueue(q) {
  return (
    q == null ||
    (textId(q.id) &&
      ["daily", "random"].includes(q.type) &&
      validPlan({ ...q, minutes: q.type === "random" ? 1 : q.minutes }) &&
      typeof q.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(q.date))
  );
}
export function validRow(r) {
  return (
    r &&
    textId(r.id) &&
    game(r.game) &&
    ["practice", "challenge"].includes(r.mode) &&
    integer(r.level) &&
    r.level < 5 &&
    ["end", "start", "duration", "mean"].every((k) => finite(r[k])) &&
    r.start <= r.end &&
    r.end <= 8640000000000000 &&
    ["correct", "errors", "peak", "switchErrors", "accuracy", "total"].every(
      (k) => integer(r[k]),
    ) &&
    r.accuracy <= 100 &&
    typeof r.variant === "string" &&
    r.variant.length <= 160 &&
    typeof r.completed === "boolean" &&
    Array.isArray(r.trials) &&
    r.trials.every((a) => a && finite(a.ms) && typeof a.ok === "boolean") &&
    r.trials.length === r.correct + r.errors &&
    r.trials.filter((a) => a.ok).length === r.correct &&
    r.accuracy ===
      (r.trials.length ? Math.round((100 * r.correct) / r.trials.length) : 0) &&
    (!r.batch ||
      (textId(r.batch.id) &&
        ["daily", "random"].includes(r.batch.type) &&
        integer(r.batch.index) &&
        r.batch.index < 6 &&
        typeof r.batch.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.batch.date) &&
        Array.isArray(r.batch.items) &&
        r.batch.items.length <= 6 &&
        r.batch.items.every((id) => !!game(id)) &&
        r.batch.items[r.batch.index] === r.game))
  );
}
export async function restore(data) {
  if (
    data?.format !== "专注力训练中心" ||
    data.version !== 1 ||
    !Array.isArray(data.results) ||
    !data.results.every(validRow) ||
    !validPlan(data.plan) ||
    !validQueue(data.queue) ||
    !integer(data.level) ||
    data.level > 4
  )
    throw Error("备份格式或成绩内容无效，未导入。");
  const t = db.transaction(["results", "prefs"], "readwrite"),
    s = t.objectStore("results"),
    finished = done(t);
  const existing = await request(s.getAll());
  const ids = new Set(existing.map((r) => r.id));
  let n = 0;
  for (const r of data.results) {
    if (!ids.has(r.id)) {
      ids.add(r.id);
      existing.push(r);
      n++;
    }
  }
  const leaders = new Map();
  for (const r of existing.sort(
    (a, b) => a.end - b.end || a.id.localeCompare(b.id),
  )) {
    const k = JSON.stringify([r.game, r.mode, r.level, r.variant]);
    r.pb = better(r, leaders.get(k));
    if (r.pb) leaders.set(k, r);
    s.put(r);
  }
  t.objectStore("prefs").put(data.plan, "plan");
  t.objectStore("prefs").put(data.level, "level");
  if ("queue" in data) t.objectStore("prefs").put(data.queue || null, "queue");
  await finished;
  return n;
}
export function currentDaily(rows, plan) {
  const today = dateKey();
  return new Set(
    rows
      .filter(
        (r) =>
          r.batch?.type === "daily" &&
          r.batch.date === today &&
          r.trials.length > 0,
      )
      .map((r) => r.game)
      .filter((id) => plan.items.includes(id)),
  );
}
