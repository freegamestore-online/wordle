import { useState, useCallback, useEffect } from "react";
import { GameShell, GameTopbar, GameAuth, GameButton, GameModal } from "@freegamestore/games";
import { Game } from "./components/Game";
import { StatsPanel } from "./components/StatsPanel";
import { useLeaderboard } from '@freegamestore/games';
import type { GameMode } from "./types";
import { dailyWord, randomWord } from "./lib/words";
import { dateKey, dayNumber, loadDailySave, DAILY_SAVE_KEY } from "./lib/daily";
import { isFinished, MAX_GUESSES } from "./lib/rules";
import { loadStats, recordDaily, recordPractice, streakOn, STATS_KEY } from "./lib/stats";
import { readStore, writeStore } from "./lib/storage";
import { shareText } from "./lib/share";

const HARD_MODE_KEY = "freewordle-hard";
const TITLE = "Five-Letter Word";

interface Round {
  /** Changes for every new board, to remount the game. */
  id: number;
  mode: GameMode;
  /** UTC date the round was started on; for the daily, the puzzle's date. */
  date: string;
  answer: string;
  guesses: string[];
  hardMode: boolean;
  /** The board is finished and its last row has revealed. */
  over: boolean;
}

let nextRoundId = 0;

const hardModePreference = () => readStore(HARD_MODE_KEY) === "1";

function dailyRound(): Round {
  const date = dateKey();
  const saved = loadDailySave(readStore(DAILY_SAVE_KEY), date);
  const answer = dailyWord(dayNumber(date));
  const guesses = saved?.guesses ?? [];
  return {
    id: nextRoundId++,
    mode: "daily",
    date,
    answer,
    guesses,
    // A daily already started keeps the mode it was started in.
    hardMode: saved?.guesses.length ? saved.hardMode : hardModePreference(),
    over: isFinished(guesses, answer),
  };
}

function practiceRound(): Round {
  return { id: nextRoundId++, mode: "practice", date: dateKey(), answer: randomWord(), guesses: [], hardMode: hardModePreference(), over: false };
}

/** Today's UTC date, kept current in an open tab so the daily rolls over at midnight UTC. */
function useUtcDate(): string {
  const [today, setToday] = useState(() => dateKey());
  useEffect(() => {
    const id = setInterval(() => setToday(dateKey()), 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

export default function App() {
  const today = useUtcDate();
  const [round, setRound] = useState(dailyRound);
  const [stats, setStats] = useState(() => loadStats(readStore(STATS_KEY)));
  // A daily already finished today opens on its result.
  const [resultOpen, setResultOpen] = useState(round.over);
  const [copied, setCopied] = useState<"" | "Copied!" | "Could not copy">("");
  const { submitScore } = useLeaderboard("wordle");

  const handleGuess = useCallback(
    (guesses: string[]) => {
      setRound((r) => ({ ...r, guesses }));
      if (round.mode === "daily") {
        writeStore(DAILY_SAVE_KEY, JSON.stringify({ date: round.date, guesses, hardMode: round.hardMode }));
      }
      if (!isFinished(guesses, round.answer)) return;
      const won = guesses.includes(round.answer);
      const n = guesses.length;
      const next = round.mode === "daily" ? recordDaily(stats, round.date, won, n) : recordPractice(stats, won, n);
      setStats(next);
      writeStore(STATS_KEY, JSON.stringify(next));
      if (won) submitScore(MAX_GUESSES + 1 - n);
    },
    [round.mode, round.date, round.answer, round.hardMode, stats, submitScore],
  );

  // Hard mode can only change before the first guess of a board.
  const toggleHardMode = useCallback(() => {
    if (round.guesses.length) return;
    writeStore(HARD_MODE_KEY, round.hardMode ? "0" : "1");
    setRound({ ...round, hardMode: !round.hardMode });
  }, [round]);

  const openResult = useCallback(() => {
    setCopied("");
    setResultOpen(true);
  }, []);

  const gameOver = useCallback(() => {
    setRound((r) => ({ ...r, over: true }));
    openResult();
  }, [openResult]);

  const startDaily = useCallback(() => {
    const next = dailyRound();
    setRound(next);
    if (next.over) openResult();
    else setResultOpen(false);
  }, [openResult]);

  const startPractice = useCallback(() => {
    setRound(practiceRound());
    setResultOpen(false);
  }, []);

  const finished = isFinished(round.guesses, round.answer);
  const won = round.guesses.includes(round.answer);

  // After midnight UTC, move an open daily to the new day once it is not mid-game
  // (unstarted, or over and its result closed).
  const stale = round.mode === "daily" && round.date !== today && (round.guesses.length === 0 || (round.over && !resultOpen));
  useEffect(() => {
    if (stale) startDaily();
  }, [stale, startDaily]);
  const puzzleTitle = round.mode === "daily" ? `${TITLE} #${dayNumber(round.date)}` : `${TITLE} practice`;

  const share = async () => {
    const text = shareText({ title: puzzleTitle, guesses: round.guesses, answer: round.answer, hardMode: round.hardMode, url: window.location.origin });
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied!");
    } catch {
      setCopied("Could not copy");
    }
  };

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
          <button
            aria-pressed={round.hardMode}
            disabled={round.guesses.length > 0}
            title={round.guesses.length > 0 ? "Hard mode can only change before the first guess" : "Revealed hints must be used"}
            onClick={toggleHardMode}
            className="px-2 rounded-md text-sm font-semibold disabled:opacity-60"
            style={{
              minHeight: "2rem",
              border: `1px solid ${round.hardMode ? "var(--accent)" : "var(--line-strong)"}`,
              color: round.hardMode ? "var(--accent)" : "var(--muted)",
            }}
          >
            Hard
          </button>
          <button
            onClick={openResult}
            className="px-2 rounded-md text-sm font-semibold"
            style={{ minHeight: "2rem", color: "var(--accent)" }}
          >
            Stats
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Game
            key={round.id}
            answer={round.answer}
            initialGuesses={round.guesses}
            onGuess={handleGuess}
            hardMode={round.hardMode}
            onGameOver={gameOver}
          />
        </div>
      </div>
      <GameModal
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title={round.mode === "daily" ? `Daily #${dayNumber(round.date)}` : "Practice"}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {finished && (
            <p
              className="text-xl font-bold"
              style={{ color: won ? "var(--success)" : "var(--error)", fontFamily: "Fraunces, serif" }}
            >
              {won ? `You got it in ${round.guesses.length}!` : `The word was ${round.answer.toUpperCase()}`}
            </p>
          )}
          <StatsPanel
            stats={round.mode === "daily" ? stats.daily : stats.practice}
            streak={round.mode === "daily" ? { current: streakOn(stats, today), best: stats.daily.bestStreak } : undefined}
            highlight={finished && won ? round.guesses.length : undefined}
          />
          {round.mode === "daily" && finished && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              A new daily word arrives at midnight UTC.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {finished && (
              <GameButton variant="secondary" onClick={share}>
                {copied || "Share"}
              </GameButton>
            )}
            {(finished || round.mode === "daily") && (
              <GameButton onClick={startPractice}>{round.mode === "daily" ? "Play practice" : "Play again"}</GameButton>
            )}
          </div>
        </div>
      </GameModal>
    </GameShell>
  );
}
