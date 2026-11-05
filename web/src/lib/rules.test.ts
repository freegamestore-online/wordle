import { describe, expect, it } from "vitest";
import { evaluateGuess, hardModeError, isFinished, letterStatuses } from "./rules";

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

describe("hardModeError", () => {
  it("allows anything before the first guess", () => {
    expect(hardModeError("zebra", [], "crane")).toBeNull();
  });

  it("keeps letters revealed in the right spot", () => {
    // crate vs crane: c, r, a, e correct.
    expect(hardModeError("brace", ["crate"], "crane")).toBe("1st letter must be C");
    expect(hardModeError("craze", ["crate"], "crane")).toBeNull();
  });

  it("reuses letters revealed in the word", () => {
    // salon vs crane: a and n are in the word, elsewhere.
    expect(hardModeError("beach", ["salon"], "crane")).toBe("Guess must contain N");
    expect(hardModeError("hymns", ["salon"], "crane")).toBe("Guess must contain A");
    expect(hardModeError("chant", ["salon"], "crane")).toBeNull();
  });

  it("needs a repeated letter as often as it was revealed", () => {
    // geese vs eerie: e present, e correct (2nd), e correct (5th) -> three e's needed.
    expect(hardModeError("there", ["geese"], "eerie")).toBe("2nd letter must be E");
    expect(hardModeError("eerie", ["geese"], "eerie")).toBeNull();
  });
});

describe("letterStatuses", () => {
  it("keeps the best status a letter has shown: correct over present over absent", () => {
    const keys = letterStatuses(["crane", "carts"], "cargo");
    expect(keys.get("c")).toBe("correct");
    expect(keys.get("a")).toBe("correct");
    expect(keys.get("r")).toBe("correct");
    expect(keys.get("n")).toBe("absent");
    expect(keys.has("z")).toBe(false);
  });

  it("does not downgrade a letter once it has been found", () => {
    expect(letterStatuses(["cargo", "crane"], "cargo").get("a")).toBe("correct");
  });
});
