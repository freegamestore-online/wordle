import { expect, test } from "@playwright/test";
import { dailyWord } from "../src/lib/words";
import { dayNumber } from "../src/lib/daily";
import { assertNoScroll, collectConsoleErrors, stubExternalServices, tapWord } from "./helpers";

const TODAY = "2026-11-05";
const answer = dailyWord(dayNumber(TODAY));

test("finishing the daily shows stats with the guess distribution and shares an emoji grid", async ({ page, context }, testInfo) => {
  const errors = collectConsoleErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
  await stubExternalServices(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Hard", exact: true }).click();
  await tapWord(page, answer);
  await expect(page.getByText("You got it in 1!")).toBeVisible();
  await expect(page.getByLabel("1 guesses: 1")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("result.png") });

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n")[0]).toBe(`Five-Letter Word #${dayNumber(TODAY)} 1/6*`);
  expect(text).not.toContain(answer);

  // One attempt a day: the finished daily reopens on its result after a reload.
  await page.reload();
  await expect(page.getByText("You got it in 1!")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Hard", exact: true })).toBeDisabled();
  await assertNoScroll(page);
  expect(errors).toEqual([]);
});

test("controls row fits the smallest phone", async ({ page }, testInfo) => {
  await stubExternalServices(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const stats = await page.getByRole("button", { name: "Stats" }).boundingBox();
  expect(stats!.x + stats!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("small.png") });
});
