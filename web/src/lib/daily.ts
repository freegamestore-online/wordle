import { MAX_GUESSES } from "./rules";

/** Today's date as YYYY-MM-DD in UTC, so every player gets the same daily word on the same day. */
export function dateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);

/** The daily puzzle number for a YYYY-MM-DD date: 1 on 2026-01-01, then one more each day. */
export function dayNumber(date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - EPOCH) / DAY_MS) + 1;
}

/** The day before a YYYY-MM-DD date. */
export function previousDate(date: string): string {
  return dateKey(new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS));
}

export const DAILY_SAVE_KEY = "freewordle-daily";

/** The board of one daily puzzle, saved after every guess so a refresh restores it. */
export interface DailySave {
  date: string;
  guesses: string[];
}

/** The saved guesses for `date`, or none if the save is for another day or is damaged. */
export function loadDailySave(raw: string | null, date: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<DailySave>;
    if (parsed?.date !== date || !Array.isArray(parsed.guesses)) return [];
    return parsed.guesses.filter((g): g is string => typeof g === "string" && /^[a-z]{5}$/.test(g)).slice(0, MAX_GUESSES);
  } catch {
    return [];
  }
}
