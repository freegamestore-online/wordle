import { previousDate } from "./daily";
import { MAX_GUESSES } from "./rules";

export const STATS_KEY = "freewordle-stats";

export interface PracticeStats {
  played: number;
  won: number;
  /** Wins by number of guesses: index 0 is a win in one, index 5 a win in six. */
  distribution: number[];
}

export interface DailyStats extends PracticeStats {
  currentStreak: number;
  bestStreak: number;
  /** Last UTC date a daily was won, for the streak. */
  lastWinDate: string | null;
  /** Last UTC date a daily was finished, so one day is never counted twice. */
  lastPlayedDate: string | null;
}

/** Daily and practice are kept apart: only the daily builds a streak. */
export interface Stats {
  daily: DailyStats;
  practice: PracticeStats;
}

const emptyDistribution = (): number[] => Array(MAX_GUESSES).fill(0);

export const emptyStats = (): Stats => ({
  daily: { played: 0, won: 0, distribution: emptyDistribution(), currentStreak: 0, bestStreak: 0, lastWinDate: null, lastPlayedDate: null },
  practice: { played: 0, won: 0, distribution: emptyDistribution() },
});

const count = (v: unknown): number => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : 0);
const distribution = (v: unknown): number[] =>
  emptyDistribution().map((_, i) => (Array.isArray(v) ? count(v[i]) : 0));
const dateOrNull = (v: unknown): string | null => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Load saved stats. A missing or damaged file reads as empty instead of breaking the page. */
export function loadStats(raw: string | null): Stats {
  const stats = emptyStats();
  if (!raw) return stats;
  try {
    const parsed = JSON.parse(raw) as { daily?: Record<string, unknown>; practice?: Record<string, unknown> };
    const d = parsed?.daily ?? {};
    const p = parsed?.practice ?? {};
    stats.daily = {
      played: count(d.played),
      won: count(d.won),
      distribution: distribution(d.distribution),
      currentStreak: count(d.currentStreak),
      bestStreak: count(d.bestStreak),
      lastWinDate: dateOrNull(d.lastWinDate),
      lastPlayedDate: dateOrNull(d.lastPlayedDate),
    };
    stats.practice = { played: count(p.played), won: count(p.won), distribution: distribution(p.distribution) };
  } catch {
    // Damaged JSON: start again.
  }
  return stats;
}

/** Count one finished game; `guesses` is how many it took, used only for a win. */
function counted(s: PracticeStats, won: boolean, guesses: number): PracticeStats {
  return {
    played: s.played + 1,
    won: s.won + (won ? 1 : 0),
    distribution: s.distribution.map((n, i) => (won && i === guesses - 1 ? n + 1 : n)),
  };
}

/** Record a finished daily for `date`. A second result for the same date is ignored. */
export function recordDaily(stats: Stats, date: string, won: boolean, guesses: number): Stats {
  const d = stats.daily;
  if (d.lastPlayedDate === date) return stats;
  const currentStreak = won ? (d.lastWinDate === previousDate(date) ? d.currentStreak + 1 : 1) : 0;
  return {
    ...stats,
    daily: {
      ...counted(d, won, guesses),
      currentStreak,
      bestStreak: Math.max(d.bestStreak, currentStreak),
      lastWinDate: won ? date : d.lastWinDate,
      lastPlayedDate: date,
    },
  };
}

/** Record a finished practice game. Never touches the daily streak. */
export function recordPractice(stats: Stats, won: boolean, guesses: number): Stats {
  return { ...stats, practice: counted(stats.practice, won, guesses) };
}

/** The streak to show on `today`: it lapses once a whole UTC day passes without a daily win. */
export function streakOn(stats: Stats, today: string): number {
  const last = stats.daily.lastWinDate;
  return last === today || last === previousDate(today) ? stats.daily.currentStreak : 0;
}
