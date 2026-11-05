import { describe, expect, it } from "vitest";
import { ANSWERS, dailyWord, isValidGuess } from "./words";
import { dayNumber } from "./daily";

describe("word lists", () => {
  it("has a broad answer pool across the whole alphabet", () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(2000);
    expect(new Set(ANSWERS.map((w) => w[0])).size).toBeGreaterThanOrEqual(24);
    expect(ANSWERS.every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
  });

  it("accepts every answer and over 10,000 words in all", () => {
    expect(ANSWERS.every(isValidGuess)).toBe(true);
    for (const w of ["crane", "slate", "adieu", "tares", "zebra", "QUICK"]) expect(isValidGuess(w)).toBe(true);
    expect(isValidGuess("abcde")).toBe(false);
  });

  it("keeps crude words out of the answers", () => {
    for (const w of ["bitch", "whore", "penis", "booze"]) expect(ANSWERS).not.toContain(w);
  });
});

describe("daily word", () => {
  it("is the same for the same day and changes day to day", () => {
    const day = dayNumber("2026-11-05");
    expect(dailyWord(day)).toBe(dailyWord(day));
    expect(dailyWord(day)).not.toBe(dailyWord(day + 1));
  });

  it("is a fixed seeded order, not alphabetical", () => {
    // Pinned so an accidental reorder (which would change everyone's daily) fails loudly.
    const week = Array.from({ length: 7 }, (_, i) => dailyWord(dayNumber("2026-01-01") + i));
    expect(week).toMatchInlineSnapshot(`
      [
        "saucy",
        "third",
        "paint",
        "swipe",
        "vault",
        "hiker",
        "shady",
      ]
    `);
    const sorted = [...week].sort();
    expect(week).not.toEqual(sorted);
  });

  it("uses every answer once before repeating", () => {
    const words = new Set(Array.from({ length: ANSWERS.length }, (_, i) => dailyWord(i)));
    expect(words.size).toBe(ANSWERS.length);
    expect(dailyWord(ANSWERS.length)).toBe(dailyWord(0));
  });
});
