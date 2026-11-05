export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** How one guessed letter scored: right spot, in the word elsewhere, or not in the word. */
export type LetterStatus = "correct" | "present" | "absent";

/** Score a guess against the answer. Repeated letters only count as often as the answer has them. */
export function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(WORD_LENGTH).fill("absent");
  const used: boolean[] = Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!used[j] && guess[i] === answer[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return result;
}

/** Whether a board is finished: solved, or out of guesses. */
export function isFinished(guesses: readonly string[], answer: string): boolean {
  return guesses.includes(answer) || guesses.length >= MAX_GUESSES;
}

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * Hard mode: every revealed hint must be used. A letter shown in the right spot must stay
 * there, and a letter shown in the word must appear again (as many times as revealed).
 * Returns what the guess is missing, or null if it is allowed.
 */
export function hardModeError(guess: string, previous: readonly string[], answer: string): string | null {
  for (const prev of previous) {
    const result = evaluateGuess(prev, answer);
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === "correct" && guess[i] !== prev[i]) {
        return `${ORDINALS[i]} letter must be ${prev[i]!.toUpperCase()}`;
      }
    }
    const needed = new Map<string, number>();
    result.forEach((status, i) => {
      if (status !== "absent") needed.set(prev[i]!, (needed.get(prev[i]!) ?? 0) + 1);
    });
    for (const [letter, n] of needed) {
      if (guess.split(letter).length - 1 < n) return `Guess must contain ${letter.toUpperCase()}`;
    }
  }
  return null;
}

const RANK: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

/** The best status each letter has shown across scored guesses, for colouring the keyboard. */
export function letterStatuses(guesses: readonly string[], answer: string): Map<string, LetterStatus> {
  const map = new Map<string, LetterStatus>();
  for (const guess of guesses) {
    evaluateGuess(guess, answer).forEach((status, i) => {
      const existing = map.get(guess[i]!);
      if (!existing || RANK[status] > RANK[existing]) map.set(guess[i]!, status);
    });
  }
  return map;
}
