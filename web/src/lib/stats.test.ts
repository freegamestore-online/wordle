import { describe, expect, it } from "vitest";
import { emptyStats, loadStats, recordDaily, recordPractice, streakOn } from "./stats";

describe("stats", () => {
  it("builds a streak over consecutive daily wins", () => {
    let s = emptyStats();
    s = recordDaily(s, "2026-11-03", true, 4);
    s = recordDaily(s, "2026-11-04", true, 3);
    s = recordDaily(s, "2026-11-05", true, 4);
    expect(s.daily).toMatchObject({ played: 3, won: 3, currentStreak: 3, bestStreak: 3 });
    expect(streakOn(s, "2026-11-05")).toBe(3);
    expect(streakOn(s, "2026-11-06")).toBe(3);
  });

  it("resets the streak on a loss or a missed day, keeping the best", () => {
    let s = recordDaily(recordDaily(emptyStats(), "2026-11-01", true, 2), "2026-11-02", true, 5);
    s = recordDaily(s, "2026-11-03", false, 6);
    expect(s.daily).toMatchObject({ played: 3, won: 2, currentStreak: 0, bestStreak: 2 });
    s = recordDaily(s, "2026-11-05", true, 3);
    expect(s.daily.currentStreak).toBe(1);
    expect(streakOn(s, "2026-11-07")).toBe(0);
  });

  it("counts one result per day", () => {
    let s = recordDaily(emptyStats(), "2026-11-05", false, 6);
    s = recordDaily(s, "2026-11-05", true, 2);
    expect(s.daily).toMatchObject({ played: 1, won: 0, currentStreak: 0, distribution: [0, 0, 0, 0, 0, 0] });
  });

  it("keeps a guess distribution of wins only", () => {
    let s = emptyStats();
    s = recordDaily(s, "2026-11-01", true, 3);
    s = recordDaily(s, "2026-11-02", true, 3);
    s = recordDaily(s, "2026-11-03", true, 6);
    s = recordDaily(s, "2026-11-04", false, 6);
    expect(s.daily.distribution).toEqual([0, 0, 2, 0, 0, 1]);
  });

  it("keeps practice apart from the daily streak and distribution", () => {
    let s = recordDaily(emptyStats(), "2026-11-05", true, 4);
    s = recordPractice(s, false, 6);
    s = recordPractice(s, true, 1);
    expect(s.practice).toEqual({ played: 2, won: 1, distribution: [1, 0, 0, 0, 0, 0] });
    expect(s.daily).toMatchObject({ played: 1, won: 1, currentStreak: 1, distribution: [0, 0, 0, 1, 0, 0] });
  });

  it("round-trips through JSON and survives damage", () => {
    const s = recordPractice(recordDaily(emptyStats(), "2026-11-05", true, 2), true, 5);
    expect(loadStats(JSON.stringify(s))).toEqual(s);
    expect(loadStats("{oops")).toEqual(emptyStats());
    expect(loadStats(JSON.stringify({ daily: { played: -3, lastWinDate: 5, distribution: "x" } }))).toEqual(emptyStats());
    // Stats saved before the distribution existed still load.
    expect(loadStats(JSON.stringify({ daily: { played: 2, won: 1 } })).daily).toMatchObject({ played: 2, distribution: [0, 0, 0, 0, 0, 0] });
  });
});
