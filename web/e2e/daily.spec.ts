import { expect, test } from "@playwright/test";
import { assertNoScroll, collectConsoleErrors, stubExternalServices, tapWord } from "./helpers";

test("daily board fits the phone, keeps its guesses across a reload, and keys keep no focus", async ({ page }, testInfo) => {
  const errors = collectConsoleErrors(page);
  await stubExternalServices(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Daily #\d+$/ })).toHaveAttribute("aria-pressed", "true");
  await assertNoScroll(page);

  await tapWord(page, "crane");
  await expect(page.getByTestId("board").locator("> div").first()).toHaveText("crane");
  // The tapped key does not hold focus, so a physical Enter or Space cannot re-press it.
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BUTTON");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("board").locator("> div").nth(1)).toHaveText("");

  await page.reload();
  await expect(page.getByTestId("board").locator("> div").first()).toHaveText("crane");
  await page.screenshot({ path: testInfo.outputPath("daily.png") });
  expect(errors).toEqual([]);
});

test("fits the smallest supported phone", async ({ page }) => {
  await stubExternalServices(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(page.getByTestId("board")).toBeVisible();
  await assertNoScroll(page);
  const keyboardBottom = await page.getByRole("button", { name: "Enter", exact: true }).evaluate((el) => el.getBoundingClientRect().bottom);
  expect(keyboardBottom).toBeLessThanOrEqual(568);
});
