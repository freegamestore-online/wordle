import { describe, expect, it } from "vitest";
import { shareText } from "./share";

describe("shareText", () => {
  it("draws one row of squares per guess under a score line", () => {
    const text = shareText({ title: "Five-Letter Word #309", guesses: ["slate", "crane"], answer: "crane", hardMode: false });
    expect(text).toBe("Five-Letter Word #309 2/6\n\n\u2B1B\u2B1B\u{1F7E6}\u2B1B\u{1F7E6}\n\u{1F7E6}\u{1F7E6}\u{1F7E6}\u{1F7E6}\u{1F7E6}");
  });

  it("marks a loss with X, hard mode with *, and adds the link", () => {
    const text = shareText({ title: "T", guesses: Array(6).fill("slate"), answer: "crane", hardMode: true, url: "https://example.test" });
    expect(text.split("\n")[0]).toBe("T X/6*");
    expect(text.endsWith("\n\nhttps://example.test")).toBe(true);
  });

  it("never gives away the letters or uses another game's name or green/yellow squares", () => {
    const text = shareText({ title: "Five-Letter Word #1", guesses: ["slate", "crane"], answer: "crane", hardMode: false });
    expect(text).not.toMatch(/crane|slate/i);
    expect(text).not.toMatch(/wordle/i);
    expect(text).not.toMatch(/\u{1F7E9}|\u{1F7E8}/u);
  });
});
