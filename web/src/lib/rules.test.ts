import { describe, expect, it } from "vitest";
import { evaluateGuess, isFinished } from "./rules";

describe("evaluateGuess", () => {
  it("marks right spot, wrong spot and absent letters", () => {
    expect(evaluateGuess("crane", "cargo")).toEqual(["correct", "present", "present", "absent", "absent"]);
  });

  it("only counts a repeated letter as often as the answer has it", () => {
    expect(evaluateGuess("eerie", "theme")).toEqual(["present", "absent", "absent", "absent", "correct"]);
    expect(evaluateGuess("llama", "hello")).toEqual(["present", "present", "absent", "absent", "absent"]);
  });
});

describe("isFinished", () => {
  it("ends on a solve or after six guesses", () => {
    expect(isFinished(["crane"], "crane")).toBe(true);
    expect(isFinished(["slate"], "crane")).toBe(false);
    expect(isFinished(Array(6).fill("slate"), "crane")).toBe(true);
  });
});
