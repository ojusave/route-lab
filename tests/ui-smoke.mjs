import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
const base = process.env.DEMO_UI_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.getByRole("heading", { name: "Win the room." }).waitFor();
assert.ok(
  await page
    .getByRole("button", { name: "Make your pitch", exact: true })
    .isDisabled(),
);
await page.getByRole("button", { name: "Inspect Mina's criteria" }).click();
await page.getByRole("dialog").waitFor();
assert.ok(
  await page
    .getByText("A useful problem to solve", { exact: true })
    .isVisible(),
);
await page.keyboard.press("Escape");
assert.equal(await page.getByRole("dialog").count(), 0);
assert.equal(
  await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
  "Inspect Mina's criteria",
);
await page
  .getByRole("button", { name: "Deploy to Render", exact: true })
  .click();
for (const lang of ["TypeScript", "Python"]) {
  const link = page.getByRole("link", { name: lang, exact: true });
  const url = new URL(await link.getAttribute("href"));
  assert.match(
    url.searchParams.get("next"),
    lang === "Python" ? /path=python%2Frender.yaml/ : /path=render.yaml/,
  );
  assert.equal(await link.getAttribute("target"), "_blank");
}
await page.keyboard.press("Escape");
assert.equal(await page.locator("#deploy-options").count(), 0);
await page.screenshot({ path: "work/game-desktop.png", fullPage: true });
await page.screenshot({
  path: "docs/demo.jpg",
  type: "jpeg",
  quality: 85,
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({ path: "work/game-mobile.png", fullPage: true });
const fixturePath = [
  "work/typescript-game-live.json",
  "work/python-game-live.json",
].find(existsSync);
if (!fixturePath)
  throw new Error("Run tests/live-smoke.mjs against either backend first.");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
let snapshot = fixture.first;
await page.route(/\/api\/(?:typescript\/|python\/)?runs\/[^/]+$/, (route) =>
  route.fulfill({ json: snapshot }),
);
await page.goto(base + "/?sdk=typescript&run=fixture");
await page
  .getByRole("button", { name: "Try your revised pitch", exact: true })
  .waitFor();
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.getByRole("button", { name: "Inspect Ravi's decision" }).click();
assert.ok(await page.getByText("The voting rule", { exact: true }).isVisible());
await page.keyboard.press("Escape");
await page.screenshot({ path: "work/game-mobile-round.png", fullPage: true });
const now = Date.now();
snapshot = {
  ...fixture.first,
  status: "running",
  startedAt: new Date(now - 1000).toISOString(),
  completedAt: null,
  outcome: null,
  results: [],
  steps: fixture.first.steps.map((s, i) => ({
    ...s,
    status: "running",
    startedAt: new Date(now - 500 + i * 10).toISOString(),
    completedAt: null,
    result: null,
  })),
};
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(base + "/?sdk=typescript&run=fixture-running");
await page.locator(".timeline-bar").first().waitFor();
const bars = page.locator(".timeline-row:not(.parent) .timeline-bar");
const before = await bars.evaluateAll((nodes) =>
  nodes.map((n) => ({
    width: n.getBoundingClientRect().width,
    left: n.getBoundingClientRect().left,
  })),
);
await page.waitForTimeout(700);
const after = await bars.evaluateAll((nodes) =>
  nodes.map((n) => ({
    width: n.getBoundingClientRect().width,
    left: n.getBoundingClientRect().left,
  })),
);
assert.ok(after.every((v, i) => v.width > before[i].width));
assert.ok(after.every((v, i) => Math.abs(v.left - before[i].left) < 1));
await page.screenshot({ path: "work/game-running.png", fullPage: true });
snapshot = {
  ...fixture.first,
  status: "completed",
  results: [fixture.first.results[0]],
  outcome: {
    complete: false,
    results: [fixture.first.results[0]],
    failed: ["ravi", "jules"],
    votes: 1,
    won: false,
  },
  error:
    "Some characters could not finish. Retry the missing votes; your attempt is saved.",
};
await page.goto(base + "/?sdk=typescript&run=fixture-failure");
await page.getByRole("button", { name: "Retry missing votes" }).waitFor();
assert.ok(
  await page
    .getByRole("button", { name: "Make your pitch", exact: true })
    .isDisabled(),
);
snapshot = fixture.second;
await page.goto(base + "/?sdk=typescript&run=fixture-done");
await page.getByRole("button", { name: "Play again", exact: true }).waitFor();
await page.getByRole("button", { name: "Play again", exact: true }).click();
assert.equal(await page.getByRole("textbox").inputValue(), "");
assert.deepEqual(errors, []);
console.log(
  "UI passed: desktop/mobile, dialogs/focus, deployment links, all live bars grow right, partial failure, completed round, reset.",
);
await browser.close();
