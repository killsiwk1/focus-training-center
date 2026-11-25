import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const contexts = [],
  profiles = [];
const options = {
  headless: true,
  args: ["--no-proxy-server", "--disable-extensions"],
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
};
const base = process.env.TEST_URL || "http://127.0.0.1:8765/";
async function fresh() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "focus-offline-"));
  profiles.push(profile);
  const ctx = await chromium.launchPersistentContext(profile, {
    ...options,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
  contexts.push(ctx);
  const p = ctx.pages()[0] || (await ctx.newPage());
  p.setDefaultTimeout(20000);
  p.setDefaultNavigationTimeout(90000);
  await p.goto(base);
  await p.locator(".cards").waitFor();
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.locator(".cards").waitFor();
  return [ctx, p];
}
try {
  const [ctx, p] = await fresh();
  const cdp = await ctx.newCDPSession(p);
  const manifest = await cdp.send("Page.getAppManifest");
  assert.deepEqual(manifest.errors, []);
  const config = JSON.parse(manifest.data);
  assert.equal(config.display, "standalone");
  assert.equal(config.lang, "zh-CN");
  assert.equal(config.icons.length, 2);
  const install = await cdp.send("Page.getInstallabilityErrors");
  assert.deepEqual(install.installabilityErrors, []);
  console.log("通过　浏览器安装条件、清单、图标与独立窗口设置");
  await ctx.setOffline(true);
  const offlineTab = await ctx.newPage();
  const offlineHome = await offlineTab.goto(base + "#home");
  assert.equal(offlineHome.fromServiceWorker(), true);
  await offlineTab.locator(".game-card").first().waitFor();
  assert.equal(await offlineTab.locator(".game-card").count(), 6);
  await offlineTab.close();
  console.log("通过　断网后从新标签页打开训练首页");
  await p.clock.install();
  for (const id of [
    "schulte",
    "stroop",
    "numeric",
    "memory",
    "cue",
    "visual",
  ]) {
    await p.evaluate((id) => (location.hash = "setup/" + id), id);
    await p.locator("#setup").waitFor();
    if (id === "cue") await p.selectOption("[name=rule]", "正向");
    if (id === "memory") {
      await p.selectOption("[name=length]", "2");
      await p.selectOption("[name=type]", "图形");
    }
    await p.locator("#setup [type=submit]").tap();
    if (id === "schulte") {
      await p.locator('[data-tile="1"]').tap();
    } else if (id === "memory") {
      await p.clock.runFor(2200);
      await p.locator("[data-answer]").first().tap();
      await p.locator("[data-answer]").first().tap();
    } else {
      if (id === "cue")
        assert.match(await p.locator(".rule-tag").innerText(), /正向规则/);
      await p.locator("[data-answer]").first().tap();
    }
    await p.locator("[data-act=settle]").tap();
    await p.locator(".result-score").waitFor();
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log("通过　离线触控作答与保存 " + id);
  }
  await p.evaluate(() => (location.hash = "settings"));
  await p.selectOption("#default-level", "4");
  const wait = p.waitForEvent("download");
  await p.locator("[data-act=backup]").tap();
  const bytes = await fs.readFile(await (await wait).path());
  const data = JSON.parse(bytes);
  assert.equal(data.results.length, 6);
  const [other, page] = await fresh();
  await page.evaluate(() => (location.hash = "settings"));
  await page
    .locator("#restore-file")
    .setInputFiles({
      name: "转移备份.json",
      mimeType: "application/json",
      buffer: bytes,
    });
  await page.locator('[data-act="modal/0"]').tap();
  await page.waitForFunction(() =>
    document.querySelector("#notice").textContent.includes("新增 6"),
  );
  await page.reload();
  assert.equal(await page.locator("#default-level").inputValue(), "4");
  await page.evaluate(() => (location.hash = "history"));
  await page.locator(".record").first().waitFor();
  assert.equal(await page.locator(".record").count(), 6);
  console.log("通过　跨空白浏览器恢复六条真实作答记录、默认难度、刷新保留");
  await page.evaluate(() => (location.hash = "setup/cue"));
  await page.selectOption("[name=rule]", "反向");
  await page.locator("#setup [type=submit]").tap();
  assert.match(await page.locator(".rule-tag").innerText(), /反向规则/);
  await page.locator("[data-answer]").first().tap();
  await page.locator("[data-act=settle]").tap();
  await page.locator(".result-score").waitFor();
  console.log("通过　固定反向与正向规则");
  await other.close();
  await ctx.close();
} finally {
  for (const ctx of contexts) await ctx.close();
  for (const p of profiles) await fs.rm(p, { recursive: true, force: true });
}
