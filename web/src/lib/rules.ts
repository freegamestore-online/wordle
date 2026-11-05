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
