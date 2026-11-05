import { evaluateGuess, MAX_GUESSES, type LetterStatus } from "./rules";

/** This game's own palette (blue, amber, grey), not the green/yellow of other word games. */
const EMOJI: Record<LetterStatus, string> = { correct: "\u{1F7E6}", present: "\u{1F7E7}", absent: "\u2B1B" };

export interface ShareInput {
  /** Puzzle name, e.g. "Five-Letter Word #309". */
  title: string;
  guesses: readonly string[];
  answer: string;
  hardMode: boolean;
  url?: string;
}

/** A spoiler-free result: a score line, then one row of coloured squares per guess. */
export function shareText({ title, guesses, answer, hardMode, url }: ShareInput): string {
  const score = guesses.includes(answer) ? String(guesses.length) : "X";
  const grid = guesses.map((g) => evaluateGuess(g, answer).map((s) => EMOJI[s]).join(""));
  return [`${title} ${score}/${MAX_GUESSES}${hardMode ? "*" : ""}`, "", ...grid, ...(url ? ["", url] : [])].join("\n");
}
