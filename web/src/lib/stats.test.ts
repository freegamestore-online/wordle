import { describe, expect, it } from "vitest";
import { emptyStats, loadStats, recordDaily, recordPractice, streakOn } from "./stats";

describe("stats", () => {
  it("builds a streak over consecutive daily wins", () => {
    let s = emptyStats();
    s = recordDaily(s, "2026-11-03", true);
    s = recordDaily(s, "2026-11-04", true);
    s = recordDaily(s, "2026-11-05", true);
    expect(s.daily).toMatchObject({ played: 3, won: 3, currentStreak: 3, bestStreak: 3 });
    expect(streakOn(s, "2026-11-05")).toBe(3);
    expect(streakOn(s, "2026-11-06")).toBe(3);
  });

  it("resets the streak on a loss or a missed day, keeping the best", () => {
    let s = recordDaily(recordDaily(emptyStats(), "2026-11-01", true), "2026-11-02", true);
    s = recordDaily(s, "2026-11-03", false);
    expect(s.daily).toMatchObject({ played: 3, won: 2, currentStreak: 0, bestStreak: 2 });
    s = recordDaily(s, "2026-11-05", true);
    expect(s.daily.currentStreak).toBe(1);
    expect(streakOn(s, "2026-11-07")).toBe(0);
  });

  it("counts one result per day", () => {
    let s = recordDaily(emptyStats(), "2026-11-05", false);
    s = recordDaily(s, "2026-11-05", true);
    expect(s.daily).toMatchObject({ played: 1, won: 0, currentStreak: 0 });
  });

  it("keeps practice apart from the daily streak", () => {
    let s = recordDaily(emptyStats(), "2026-11-05", true);
    s = recordPractice(s, false);
    s = recordPractice(s, true);
    expect(s.practice).toEqual({ played: 2, won: 1 });
    expect(s.daily).toMatchObject({ played: 1, won: 1, currentStreak: 1 });
  });

  it("round-trips through JSON and survives damage", () => {
    const s = recordPractice(recordDaily(emptyStats(), "2026-11-05", true), true);
    expect(loadStats(JSON.stringify(s))).toEqual(s);
    expect(loadStats("{oops")).toEqual(emptyStats());
    expect(loadStats(JSON.stringify({ daily: { played: -3, lastWinDate: 5 } }))).toEqual(emptyStats());
  });
});
