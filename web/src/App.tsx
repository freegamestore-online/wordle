import { useState, useCallback } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton, GameModal } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useLeaderboard } from '@freegamestore/games';
import type { GameMode } from "./types";
import { dailyWord, randomWord } from "./lib/words";
import { dateKey, dayNumber, loadDailySave, DAILY_SAVE_KEY } from "./lib/daily";
import { isFinished, MAX_GUESSES } from "./lib/rules";
import { loadStats, recordDaily, recordPractice, streakOn, STATS_KEY, type Stats } from "./lib/stats";
import { readStore, writeStore } from "./lib/storage";

interface Round {
  /** Changes for every new board, to remount the game. */
  id: number;
  mode: GameMode;
  /** UTC date the round was started on; for the daily, the puzzle's date. */
  date: string;
  answer: string;
  guesses: string[];
}

let nextRoundId = 0;

function dailyRound(): Round {
  const date = dateKey();
  return {
    id: nextRoundId++,
    mode: "daily",
    date,
    answer: dailyWord(dayNumber(date)),
    guesses: loadDailySave(readStore(DAILY_SAVE_KEY), date),
  };
}

function practiceRound(): Round {
  return { id: nextRoundId++, mode: "practice", date: dateKey(), answer: randomWord(), guesses: [] };
}

export default function App() {
  const [round, setRound] = useState(dailyRound);
  const [stats, setStats] = useState(() => loadStats(readStore(STATS_KEY)));
  // A daily already finished today opens on its result.
  const [resultOpen, setResultOpen] = useState(() => isFinished(round.guesses, round.answer));
  const { submitScore } = useLeaderboard("wordle");

  const saveStats = useCallback((update: (s: Stats) => Stats) => {
    setStats((prev) => {
      const next = update(prev);
      writeStore(STATS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleGuess = useCallback(
    (guesses: string[]) => {
      setRound((r) => ({ ...r, guesses }));
      if (round.mode === "daily") {
        writeStore(DAILY_SAVE_KEY, JSON.stringify({ date: round.date, guesses }));
      }
      if (!isFinished(guesses, round.answer)) return;
      const won = guesses.includes(round.answer);
      saveStats((s) => (round.mode === "daily" ? recordDaily(s, round.date, won) : recordPractice(s, won)));
      if (won) submitScore(MAX_GUESSES + 1 - guesses.length);
    },
    [round.mode, round.date, round.answer, saveStats, submitScore],
  );

  const handleGameOver = useCallback(() => setResultOpen(true), []);

  const startDaily = useCallback(() => {
    const next = dailyRound();
    setRound(next);
    setResultOpen(isFinished(next.guesses, next.answer));
  }, []);

  const startPractice = useCallback(() => {
    setRound(practiceRound());
    setResultOpen(false);
  }, []);

  const finished = isFinished(round.guesses, round.answer);
  const won = round.guesses.includes(round.answer);
  const today = dateKey();

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Five-Letter Word"
          stats={[
            { label: "Streak", value: streakOn(stats, today) },
            { label: "Max", value: stats.daily.bestStreak },
          ]}
          rules={
            <div>
              <h3 style={{marginBottom:'0.5rem',fontWeight:700}}>Five-Letter Word</h3>
              <p>Guess the 5-letter word in 6 tries.</p>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Modes</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Daily: one word a day (UTC), the same for everyone, one attempt. Builds your streak.</li>
                <li>Practice: a random word, as often as you like. Does not affect the streak.</li>
              </ul>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Controls</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Type letters to fill each guess</li>
                <li>Enter to submit, Backspace to delete</li>
              </ul>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Color Hints</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Blue = right letter, right spot</li>
                <li>Amber = right letter, wrong spot</li>
                <li>Gray = letter not in the word</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <div className="relative w-full h-full flex flex-col">
        <div className="shrink-0 flex items-center justify-center gap-2 pt-2 px-2">
          <div className="flex rounded-lg p-0.5" style={{ background: "var(--line)" }} role="group" aria-label="Mode">
            {(["daily", "practice"] as const).map((m) => (
              <button
                key={m}
                aria-pressed={round.mode === m}
                onClick={m === "daily" ? startDaily : startPractice}
                className="px-3 rounded-md text-sm font-semibold"
                style={{
                  minHeight: "2rem",
                  background: round.mode === m ? "var(--paper)" : "transparent",
                  color: round.mode === m ? "var(--ink)" : "var(--muted)",
                }}
              >
                {m === "daily" ? `Daily #${dayNumber(today)}` : "Practice"}
              </button>
            ))}
          </div>
          {finished && !resultOpen && (
            <button
              onClick={() => setResultOpen(true)}
              className="px-3 rounded-md text-sm font-semibold"
              style={{ minHeight: "2rem", color: "var(--accent)" }}
            >
              Result
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Game
            key={round.id}
            answer={round.answer}
            initialGuesses={round.guesses}
            onGuess={handleGuess}
            onGameOver={handleGameOver}
          />
        </div>
      </div>
      <GameModal
        open={resultOpen && finished}
        onClose={() => setResultOpen(false)}
        title={round.mode === "daily" ? `Daily #${dayNumber(round.date)}` : "Practice"}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <p
            className="text-xl font-bold"
            style={{ color: won ? "var(--success)" : "var(--error)", fontFamily: "Fraunces, serif" }}
          >
            {won ? `You got it in ${round.guesses.length}!` : `The word was ${round.answer.toUpperCase()}`}
          </p>
          {round.mode === "daily" && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              A new daily word arrives at midnight UTC.
            </p>
          )}
          <GameButton onClick={startPractice}>{round.mode === "daily" ? "Play practice" : "Play again"}</GameButton>
        </div>
      </GameModal>
    </GameShell>
  );
}
