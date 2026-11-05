import { describe, expect, it } from "vitest";
import { dateKey, dayNumber, loadDailySave, previousDate } from "./daily";

describe("daily dates", () => {
  it("keys the day by UTC, whatever the local time zone", () => {
    expect(dateKey(new Date("2026-11-05T23:59:59Z"))).toBe("2026-11-05");
    expect(dateKey(new Date("2026-11-06T00:00:00Z"))).toBe("2026-11-06");
    expect(dateKey(new Date("2026-11-06T09:30:00+11:00"))).toBe("2026-11-05");
  });

  it("numbers days from 2026-01-01 with no gaps", () => {
    expect(dayNumber("2026-01-01")).toBe(1);
    expect(dayNumber("2026-01-02")).toBe(2);
    expect(dayNumber("2027-01-01")).toBe(366);
    expect(previousDate("2026-03-01")).toBe("2026-02-28");
    expect(previousDate("2027-01-01")).toBe("2026-12-31");
  });
});

describe("saved daily board", () => {
  const save = (date: string, guesses: unknown) => JSON.stringify({ date, guesses });

  it("restores today's guesses", () => {
    expect(loadDailySave(save("2026-11-05", ["crane", "slate"]), "2026-11-05")).toEqual(["crane", "slate"]);
  });

  it("starts fresh on a new day", () => {
    expect(loadDailySave(save("2026-11-04", ["crane"]), "2026-11-05")).toEqual([]);
  });

  it("ignores missing or damaged saves", () => {
    expect(loadDailySave(null, "2026-11-05")).toEqual([]);
    expect(loadDailySave("{not json", "2026-11-05")).toEqual([]);
    expect(loadDailySave(save("2026-11-05", "crane"), "2026-11-05")).toEqual([]);
    expect(loadDailySave(save("2026-11-05", ["crane", 7, "TOOLONG", "slate"]), "2026-11-05")).toEqual(["crane", "slate"]);
  });

  it("never restores more than six guesses", () => {
    expect(loadDailySave(save("2026-11-05", Array(9).fill("crane")), "2026-11-05")).toHaveLength(6);
  });
});
