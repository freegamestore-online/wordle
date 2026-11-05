import { previousDate } from "./daily";

export const STATS_KEY = "freewordle-stats";

export interface PracticeStats {
  played: number;
  won: number;
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

export const emptyStats = (): Stats => ({
  daily: { played: 0, won: 0, currentStreak: 0, bestStreak: 0, lastWinDate: null, lastPlayedDate: null },
  practice: { played: 0, won: 0 },
});

const count = (v: unknown): number => (Number.isSafeInteger(v) && (v as number) >= 0 ? (v as number) : 0);
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
      currentStreak: count(d.currentStreak),
      bestStreak: count(d.bestStreak),
      lastWinDate: dateOrNull(d.lastWinDate),
      lastPlayedDate: dateOrNull(d.lastPlayedDate),
    };
    stats.practice = { played: count(p.played), won: count(p.won) };
  } catch {
    // Damaged JSON: start again.
  }
  return stats;
}

/** Record a finished daily for `date`. A second result for the same date is ignored. */
export function recordDaily(stats: Stats, date: string, won: boolean): Stats {
  const d = stats.daily;
  if (d.lastPlayedDate === date) return stats;
  const currentStreak = won ? (d.lastWinDate === previousDate(date) ? d.currentStreak + 1 : 1) : 0;
  return {
    ...stats,
    daily: {
      played: d.played + 1,
      won: d.won + (won ? 1 : 0),
      currentStreak,
      bestStreak: Math.max(d.bestStreak, currentStreak),
      lastWinDate: won ? date : d.lastWinDate,
      lastPlayedDate: date,
    },
  };
}

/** Record a finished practice game. Never touches the daily streak. */
export function recordPractice(stats: Stats, won: boolean): Stats {
  const p = stats.practice;
  return { ...stats, practice: { played: p.played + 1, won: p.won + (won ? 1 : 0) } };
}

/** The streak to show on `today`: it lapses once a whole UTC day passes without a daily win. */
export function streakOn(stats: Stats, today: string): number {
  const last = stats.daily.lastWinDate;
  return last === today || last === previousDate(today) ? stats.daily.currentStreak : 0;
}
