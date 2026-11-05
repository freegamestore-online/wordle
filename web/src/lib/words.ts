import { ANSWER_DATA, GUESS_DATA } from "./wordlist";
import { hashSeed, seededRandom, shuffled } from "./random";

const unpack = (data: string): string[] => data.match(/.{5}/g) ?? [];

/** Common, family-friendly five-letter words that can be the answer. */
export const ANSWERS: readonly string[] = unpack(ANSWER_DATA);

const VALID_GUESSES = new Set([...ANSWERS, ...unpack(GUESS_DATA)]);

/**
 * The order daily words come in: one fixed seeded shuffle of the answers, so the next
 * word cannot be guessed from the list. Editing ANSWERS reshuffles every future day.
 */
const DAILY_ORDER = shuffled(ANSWERS, seededRandom(hashSeed("five-letter-word:daily")));

/** The answer for daily puzzle number `day` (see `dayNumber`). Same for every player. */
export function dailyWord(day: number): string {
  const n = DAILY_ORDER.length;
  return DAILY_ORDER[((day % n) + n) % n]!;
}

/** A random answer word, for practice. */
export function randomWord(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)]!;
}

/** Whether a word is an accepted guess. */
export function isValidGuess(word: string): boolean {
  return VALID_GUESSES.has(word.toLowerCase());
}
