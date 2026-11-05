import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../index.css"), "utf-8");

/** The value of a `--name: #rrggbb` token, from the first rule that sets it. */
function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!m) throw new Error(`no --${name}`);
  return m[1]!;
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("theme", () => {
  it.each(["tile-correct", "tile-present", "tile-absent"])("tile text on --%s meets WCAG AA", (tile) => {
    expect(contrast(token("tile-text"), token(tile))).toBeGreaterThanOrEqual(4.5);
  });

  it("tile colours are not redefined per theme, so the dark theme keeps the same contrast", () => {
    expect(css.match(/--tile-present:/g)).toHaveLength(1);
  });

  it("has a data-theme dark rule for the SDK theme toggle", () => {
    expect(css).toMatch(/:root\[data-theme=['"]dark['"]\]\s*\{[^}]*--paper:/);
  });
});
