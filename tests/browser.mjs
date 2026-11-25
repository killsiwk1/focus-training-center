import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const base = process.env.TEST_URL || "http://127.0.0.1:8765/";
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "focus-qa-"));
const options = {
  headless: true,
  args: [
    "--no-proxy-server",
    "--disable-extensions",
    "--disable-background-networking",
  ],
  viewport: { width: 1430, height: 1000 },
  acceptDownloads: true,
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
};
let context, page;
const errors = [];
const summary = [];
const say = (s) => {
  summary.push(s);
  console.log("通过　" + s);
};
const launch = async () => {
  context = await chromium.launchPersistentContext(profile, options);
  page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".cards").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.locator(".cards").waitFor();
  await page.clock.install();
};
const select = (s, v) => page.locator(s).selectOption(String(v));
const click = (s) => page.locator(s).click();
const act = (a) => click('[data-act="' + a + '"]');
const hash = async (h) => {
  await page.evaluate((h) => (location.hash = h), h);
  await page.waitForFunction((h) => location.hash === "#" + h, h);
  await page.waitForTimeout(20);
};
const ids = ["schulte", "stroop", "numeric", "memory", "cue", "visual"];
const colors = ["红色", "蓝色", "绿色", "黄色", "紫色"];
async function begin(id, level, mode, type = "数字") {
  await hash("setup/" + id);
  await page.locator("#setup").waitFor();
  await select("[name=level]", level);
  await select("[name=mode]", mode);
  if (id === "memory") {
    await select("[name=type]", type);
    await select("[name=display]", 350);
    await select("[name=gap]", 150);
  }
  await click("#setup [type=submit]");
  await page.locator(".arena").waitFor();
}
async function result() {
  await page.waitForURL("**/#result/*", { timeout: 7000 });
  await page.locator(".result-score").waitFor();
  return page.locator(".result-score").innerText();
}
async function ans(id, wrong = false) {
  let idx;
  if (id === "numeric") {
    const a = await page.locator(".number-pair strong").allTextContents();
    idx = Number(a[0]) > Number(a[1]) ? 0 : 1;
  }
  if (id === "stroop") {
    const rgb = await page.locator(".word").evaluate((n) => n.style.color);
    idx = [
      "rgb(206, 55, 60)",
      "rgb(36, 104, 198)",
      "rgb(22, 124, 72)",
      "rgb(174, 124, 0)",
      "rgb(128, 64, 187)",
    ].indexOf(rgb);
    assert.ok(idx >= 0);
  }
  if (id === "cue") {
    const rule = await page.locator(".rule-tag").innerText(),
      dir = await page.locator(".arrow-stim").innerText();
    idx = ["←", "→", "↑", "↓"].indexOf(dir);
    if (rule.includes("反向")) idx ^= 1;
  }
  if (id === "visual") {
    idx = await page.evaluate(() => {
      const options = [...document.querySelectorAll(".answers svg")].map(
        (el) => el.innerHTML,
      );
      const pattern = document.querySelector(".pattern");
      if (pattern) {
        const n = Number(pattern.style.getPropertyValue("--cols"));
        return options.indexOf(pattern.querySelectorAll("svg")[n].innerHTML);
      }
      const fragment = document.querySelector(".stimulus svg").cloneNode(true);
      fragment.lastElementChild.remove();
      return options.indexOf(fragment.innerHTML);
    });
  }
  if (id === "memory") {
    const seq = [];
    while (await page.locator(".stimulus.word").count()) {
      const val = (await page.locator(".stimulus.word").textContent()).trim();
      if (val) seq.push(val);
      await page.clock.runFor(val ? 350 : 150);
    }
    const choices = await page.locator("[data-answer]").allTextContents();
    for (const [i, v] of seq.entries()) {
      const k = choices.indexOf(v);
      assert.ok(k >= 0);
      await page
        .locator("[data-answer]")
        .nth(wrong && i === 0 ? (k + 1) % choices.length : k)
        .evaluate((b) => b.click());
    }
    return;
  }
  assert.ok(idx >= 0);
  const n = await page.locator("[data-answer]").count();
  if (wrong) idx = (idx + 1) % n;
  await page.keyboard.press(String(idx + 1));
}
const results = () =>
  page.evaluate(async () => {
    const db = await new Promise((res) => {
      const q = indexedDB.open("focus-training-center");
      q.onsuccess = () => res(q.result);
    });
    return new Promise((res) => {
      const q = db.transaction("results").objectStore("results").getAll();
      q.onsuccess = () => {
        res(q.result);
        db.close();
      };
    });
  });
const answerGrid = async (mistake = true) => {
  const n = await page.locator("[data-tile]").count();
  await page.evaluate(
    ({ n, mistake }) => {
      if (mistake) document.querySelector('[data-tile="2"]').click();
      for (let i = 1; i <= n; i++)
        document.querySelector('[data-tile="' + i + '"]').click();
    },
    { n, mistake },
  );
};
try {
  await launch();
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: path.join(process.env.SHOT_DIR, "desktop.png"),
    });
  assert.equal(await page.locator(".game-card").count(), 6);
  say("首页、六项入口和离线资源首次缓存");
  for (const id of ids) {
    for (let l = 0; l < 5; l++) {
      for (const mode of ["practice", "challenge"]) {
        await begin(id, l, mode, ["数字", "颜色", "图形"][l % 3]);
        if (id === "schulte") {
          await answerGrid();
        } else {
          const n =
            mode === "practice"
              ? 2
              : id === "memory"
                ? 3 + l
                : [8, 10, 12, 16, 20][l];
          for (let i = 0; i < n; i++) {
            await ans(id, i === 0);
            if (i + 1 < n || mode === "practice")
              await page.clock.runFor(i === 0 ? 850 : 360);
          }
          if (mode === "practice") await act("settle");
        }
        await result();
        const rr = await results(),
          r = rr.find((r) => page.url().endsWith(r.id));
        assert.equal(r.mode, mode);
        assert.equal(r.level, l);
        assert.equal(r.game, id);
        assert.equal(r.errors, 1);
        assert.equal(r.trials.length, r.correct + r.errors);
        assert.ok(r.correct > 0);
        assert.ok(r.mean >= 0);
        assert.equal(
          r.accuracy,
          Math.round((100 * r.correct) / r.trials.length),
        );
        assert.equal(r.pb, true);
        if (id === "memory") assert.ok(r.peak >= 2);
      }
    }
    say(id + " 五级难度、两种模式、正确和错误作答、结算与记录");
  }
  await begin("schulte", 1, "challenge");
  await click('[data-tile="1"]');
  await page.clock.runFor(30050);
  await result();
  let rr = await results();
  const timed = rr.find((r) => r.id === page.url().split("/").at(-1));
  assert.equal(timed.duration, 30000);
  assert.equal(timed.completed, false);
  assert.equal(timed.correct, 1);
  say("舒尔特 30 秒自动结算与部分进度");
  await begin("cue", 2, "practice");
  await act("pause");
  await page.clock.runFor(5000);
  assert.ok(await page.locator("dialog[open]").count());
  await act("modal/0");
  await act("help");
  await act("modal/0");
  await act("restart");
  await act("modal/0");
  await act("quit");
  await act("modal/1");
  await page.locator(".cards").waitFor();
  assert.equal((await results()).length, 61);
  say("暂停、帮助、重开、退出不写入额外成绩");
  await hash("daily");
  for (const id of ids.slice(2)) await click('[data-plan="' + id + '"]');
  await act("move/stroop/-1");
  await page.locator("#minutes").fill("1");
  await page.locator("#minutes").press("Tab");
  await select("#plan-level", "0");
  await act("daily-start");
  await page.locator(".arena").waitFor();
  assert.match(await page.locator("h1").innerText(), /字色/);
  await ans("stroop");
  assert.match(await page.locator("#time").innerText(), /剩余 (60|59)\./);
  await page.clock.runFor(60500);
  await result();
  await act("advance");
  await answerGrid();
  await result();
  await act("advance");
  await page.locator("h1").filter({ hasText: "每日训练结果" }).waitFor();
  await hash("daily");
  assert.match(await page.locator(".badge").innerText(), /2 \/ 2/);
  say("每日计划勾选、排序、时长、衔接、完成进度");
  await hash("random");
  await select("[name=number]", 6);
  await select("[name=level]", 0);
  await click("#random button");
  for (let j = 0; j < 6; j++) {
    await page.locator(".arena").waitFor();
    const name = await page.locator("h1").innerText();
    const id =
      ids[
        [
          "舒尔特方格",
          "字色干扰",
          "数值干扰",
          "序列记忆",
          "反向线索任务",
          "视觉完型测试",
        ].indexOf(name)
      ];
    if (id === "schulte") await answerGrid(false);
    else if (id === "memory") {
      for (let i = 0; i < 3; i++) {
        while (await page.locator(".stimulus.word").count())
          await page.clock.runFor(1000);
        const n = Number(
          (await page.locator("#recall").innerText()).match(/共 (\d+)/)[1],
        );
        for (let k = 0; k < n; k++)
          await page
            .locator("[data-answer]")
            .first()
            .evaluate((b) => b.click());
        await page.clock.runFor(900);
      }
    } else {
      for (let i = 0; i < 8; i++) {
        await ans(id);
        await page.clock.runFor(900);
      }
    }
    await result();
    await act("advance");
  }
  await page.locator("h1").filter({ hasText: "随机挑战结果" }).waitFor();
  assert.equal(await page.locator(".record").count(), 6);
  say("六项不重复随机挑战、逐项结算与整组结果");
  await hash("report");
  for (const range of ["7", "30", "all"]) await select("#report-range", range);
  await select("#report-mode", "challenge");
  await select("#report-level", 0);
  assert.equal(await page.locator(".chart").count(), 6);
  await hash("history");
  await select("#hist-game", "memory");
  await select("#hist-mode", "challenge");
  assert.ok(
    (await page.locator(".record-info b").allTextContents()).every(
      (x) => x === "序列记忆",
    ),
  );
  await page.locator(".record-link").first().click();
  await result();
  await click("summary");
  assert.ok(await page.locator(".trial").count());
  say("报告三种范围、六条趋势图、历史筛选与逐题详情");
  await hash("settings");
  await select("#default-level", 3);
  const b = page.waitForEvent("download");
  await act("backup");
  const json = JSON.parse(await fs.readFile(await (await b).path(), "utf8"));
  assert.equal(json.results.length, 69);
  const exp = page.waitForEvent("download");
  await act("export");
  assert.match(
    await fs.readFile(await (await exp).path(), "utf8"),
    /训练项目.*正确率/,
  );
  await page.locator("#restore-file").setInputFiles({
    name: "备份.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await act("modal/0");
  await page.waitForFunction(() =>
    document.querySelector("#notice").textContent.includes("新增 0"),
  );
  await page.locator("#restore-file").setInputFiles({
    name: "损坏.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await act("modal/0");
  await page.waitForFunction(() =>
    document.querySelector("#notice").textContent.includes("无效"),
  );
  say("完整备份下载、成绩表导出、重复恢复去重、损坏备份拒绝");
  await context.close();
  await launch();
  assert.equal((await results()).length, 69);
  await hash("settings");
  assert.equal(await page.locator("#default-level").inputValue(), "3");
  say("关闭浏览器后成绩和偏好保留");
  await context.setOffline(true);
  await page.reload();
  await page.locator(".settings-stack").waitFor();
  await begin("numeric", 0, "practice");
  await ans("numeric");
  await act("settle");
  await result();
  assert.equal((await results()).length, 70);
  await context.setOffline(false);
  say("断网后重新打开、训练、保存与恢复联网");
  for (const w of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 850 });
    for (const where of [
      "home",
      "daily",
      "random",
      "history",
      "report",
      "settings",
      "setup/memory",
    ]) {
      await hash(where);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "溢出 " + w + " " + where,
      );
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await hash("home");
  if (process.env.SHOT_DIR)
    await page.screenshot({
      path: path.join(process.env.SHOT_DIR, "mobile.png"),
    });
  await act("menu");
  await page.locator('#side a[href="#history"]').click();
  await page.locator("#hist-game").waitFor();
  await begin("schulte", 4, "practice");
  assert.equal(await page.locator("[data-tile]").count(), 49);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await answerGrid();
  await result();
  say("320 至 1440 像素页面布局、手机导航与七阶方格");
  assert.deepEqual(errors, []);
  say("浏览器未捕获异常为零");
  console.log("测试完成：" + summary.length + " 组");
} catch (error) {
  console.error(
    "出错页面",
    page.url(),
    await page.locator("main").innerText(),
    errors,
  );
  throw error;
} finally {
  await context?.close();
  await fs.rm(profile, { recursive: true, force: true });
}
