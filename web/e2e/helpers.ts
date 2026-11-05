import { expect, type Page } from "@playwright/test";

/** Keep the page offline: auth, leaderboard, fonts and analytics are stubbed. */
export async function stubExternalServices(page: Page) {
  await page.route("https://auth.freegamestore.online/**", (route) => route.fulfill({
    status: 200,
    headers: { "access-control-allow-origin": "http://127.0.0.1:4188", "access-control-allow-credentials": "true" },
    json: null,
  }));
  await page.route("https://freegamestore-leaderboard.serge-the-dev.workers.dev/**", (route) => route.fulfill({ json: { scores: [], ok: true } }));
  await page.route("https://fonts.googleapis.com/**", (route) => route.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("https://api.freegamestore.online/v1/analytics.js**", (route) => route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
}

export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/** The page must not scroll in either direction. */
export async function assertNoScroll(page: Page) {
  const d = await page.evaluate(() => ({
    w: document.documentElement.clientWidth,
    h: document.documentElement.clientHeight,
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
  }));
  expect(d.sw, "horizontal scroll").toBeLessThanOrEqual(d.w);
  expect(d.sh, "vertical scroll").toBeLessThanOrEqual(d.h);
}

/** Type a word on the on-screen keyboard and submit it. */
export async function tapWord(page: Page, word: string) {
  for (const ch of word.toUpperCase()) await page.getByRole("button", { name: ch, exact: true }).click();
  await page.getByRole("button", { name: "Enter", exact: true }).click();
}
