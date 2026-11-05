import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { dailyWord } from "./lib/words";
import { dayNumber, DAILY_SAVE_KEY } from "./lib/daily";
import { STATS_KEY } from "./lib/stats";

const TODAY = "2026-11-05";
const answer = dailyWord(dayNumber(TODAY));
const wrong = answer === "crane" ? "slate" : "crane";

function type(word: string) {
  for (const ch of word) fireEvent.keyDown(window, { key: ch });
  fireEvent.keyDown(window, { key: "Enter" });
  act(() => vi.advanceTimersByTime(2000));
}

function board(): string[] {
  const rows = document.querySelectorAll("[data-testid=board] > div");
  return [...rows].map((r) => r.textContent ?? "");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App", { timeout: 20_000 }, () => {
  it("opens straight onto today's daily board", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: `Daily #${dayNumber(TODAY)}` })).toHaveAttribute("aria-pressed", "true");
    expect(board()).toHaveLength(6);
  });

  it("saves the daily after each guess and restores it on reload", () => {
    const { unmount } = render(<App />);
    type(wrong);
    expect(JSON.parse(localStorage.getItem(DAILY_SAVE_KEY)!)).toEqual({ date: TODAY, guesses: [wrong], hardMode: false });
    unmount();
    render(<App />);
    expect(board()[0]).toBe(wrong);
  });

  it("allows one daily attempt: a finished daily stays finished after reload", () => {
    const { unmount } = render(<App />);
    type(answer);
    const stats = JSON.parse(localStorage.getItem(STATS_KEY)!);
    expect(stats.daily).toMatchObject({ played: 1, won: 1, currentStreak: 1 });
    unmount();
    render(<App />);
    expect(screen.getByText("You got it in 1!")).toBeInTheDocument();
    expect(board()[0]).toBe(answer);
    // The board is finished: typing does nothing.
    fireEvent.keyDown(window, { key: "a" });
    expect(board()[1]).toBe("");
  });

  it("does not let practice games change the daily streak", () => {
    render(<App />);
    vi.spyOn(Math, "random").mockReturnValue(0); // practice word "aback"
    fireEvent.click(screen.getByRole("button", { name: "Practice" }));
    for (let i = 0; i < 6; i++) type("crane");
    const stats = JSON.parse(localStorage.getItem(STATS_KEY)!);
    expect(stats.practice).toMatchObject({ played: 1, won: 0 });
    expect(stats.daily).toMatchObject({ played: 0, currentStreak: 0 });
  });

  it("on-screen keys never take focus, so physical keys cannot re-press them", () => {
    render(<App />);
    const key = screen.getByRole("button", { name: "A" });
    expect(fireEvent.mouseDown(key)).toBe(false);
    fireEvent.click(key);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(board()[0]).toBe("a");
  });

  it("shares a spoiler-free emoji grid of the finished daily", async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<App />);
    type(wrong);
    type(answer);
    expect(screen.getByLabelText("2 guesses: 1")).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
    const text = writeText.mock.calls[0]![0];
    expect(text.startsWith(`Five-Letter Word #${dayNumber(TODAY)} 2/6\n`)).toBe(true);
    expect(text).not.toContain(answer);
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("hard mode rejects a guess that ignores a revealed hint, and locks after the first guess", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // practice word "aback"
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Practice" }));
    const hard = screen.getByRole("button", { name: "Hard" });
    fireEvent.click(hard);
    expect(hard).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("freewordle-hard")).toBe("1");
    type("abbey");
    expect(hard).toBeDisabled();
    fireEvent.keyDown(window, { key: "Backspace" });
    for (const ch of "crane") fireEvent.keyDown(window, { key: ch });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByText("1st letter must be A")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: "Backspace" });
    type("aback");
    expect(board().slice(0, 2)).toEqual(["abbey", "aback"]);
  });

  it("rolls an unstarted daily over to the new day at midnight UTC in an open tab", () => {
    vi.setSystemTime(new Date(`${TODAY}T23:59:50Z`));
    render(<App />);
    act(() => vi.advanceTimersByTime(60_000));
    const next = screen.getByRole("button", { name: `Daily #${dayNumber(TODAY) + 1}` });
    expect(next).toHaveAttribute("aria-pressed", "true");
    for (const ch of dailyWord(dayNumber(TODAY) + 1)) fireEvent.keyDown(window, { key: ch });
    fireEvent.keyDown(window, { key: "Enter" });
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("You got it in 1!")).toBeInTheDocument();
  });

  it("keeps a daily in progress at midnight, and rolls over once its result is closed", () => {
    vi.setSystemTime(new Date(`${TODAY}T23:59:00Z`));
    render(<App />);
    type(wrong);
    act(() => vi.advanceTimersByTime(120_000));
    expect(board()[0]).toBe(wrong);
    type(answer);
    expect(screen.getByText("You got it in 2!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(board()[0]).toBe("");
    expect(screen.getByRole("button", { name: `Daily #${dayNumber(TODAY) + 1}` })).toHaveAttribute("aria-pressed", "true");
  });
});
