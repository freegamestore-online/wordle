import { useState, useCallback, useRef } from "react";
import { Shell } from "./components/Shell";
import { Game } from "./components/Game";
import { Leaderboard } from "./components/Leaderboard";
import { useLeaderboard } from "./hooks/useLeaderboard";
import type { GamePhase } from "./types";

const BEST_SCORE_KEY = "freewordle-best";
const STREAK_KEY = "freewordle-streak";

function getBestScore(): number {
  const v = localStorage.getItem(BEST_SCORE_KEY);
  return v ? parseInt(v, 10) : 0;
}

function getStreak(): number {
  const v = localStorage.getItem(STREAK_KEY);
  return v ? parseInt(v, 10) : 0;
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(getBestScore);
  const [streak, setStreak] = useState(getStreak);
  const [gameKey, setGameKey] = useState(0);
  const scoreRef = useRef(0);
  const { topScores, recentScores, submitScore, loading } = useLeaderboard("wordle");

  const handleScore = useCallback((s: number) => {
    scoreRef.current = s;
    setScore(s);
  }, []);

  const handleGameOver = useCallback(() => {
    const final = scoreRef.current;
    const best = getBestScore();

    if (final > 0) {
      // Win: increment streak
      const newStreak = getStreak() + 1;
      localStorage.setItem(STREAK_KEY, String(newStreak));
      setStreak(newStreak);
    } else {
      // Loss: reset streak
      localStorage.setItem(STREAK_KEY, "0");
      setStreak(0);
    }

    if (final > best) {
      localStorage.setItem(BEST_SCORE_KEY, String(final));
      setBestScore(final);
    }

    if (final > 0) {
      submitScore(final);
    }

    setPhase("over");
  }, [submitScore]);

  const start = useCallback(() => {
    setScore(0);
    scoreRef.current = 0;
    setGameKey((k) => k + 1);
    setPhase("playing");
  }, []);

  return (
    <Shell
      sidebar={
        <nav className="flex-1 px-4 flex flex-col gap-3 py-4">
          <div className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Stats
          </div>
          <div className="flex gap-6">
            <div>
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {streak}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Streak
              </div>
            </div>
            <div>
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {bestScore}
              </div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Best
              </div>
            </div>
          </div>
          {phase === "over" && (
            <div className="text-sm" style={{ color: score > 0 ? "var(--success)" : "var(--error)" }}>
              {score > 0 ? `Score: ${score}` : "Better luck next time"}
            </div>
          )}
          {phase !== "playing" && (
            <button
              onClick={start}
              className="mt-4 px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {phase === "menu" ? "Play" : "Play Again"}
            </button>
          )}
          <div
            className="mt-2 border-t"
            style={{ borderColor: "var(--line)" }}
          >
            <div className="text-xs font-semibold px-4 pt-3" style={{ color: "var(--muted)" }}>
              Leaderboard
            </div>
            <Leaderboard topScores={topScores} recentScores={recentScores} loading={loading} />
          </div>
        </nav>
      }
      dock={
        <>
          <div className="text-sm font-semibold">
            Streak: {streak}
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Best: {bestScore}
          </div>
        </>
      }
    >
      <div className="relative w-full h-full min-h-[400px]">
        {phase === "playing" ? (
          <Game key={gameKey} onScore={handleScore} onGameOver={handleGameOver} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <h1
              className="text-4xl font-bold"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Wordle
            </h1>
            {phase === "over" && (
              <p
                className="text-xl font-bold"
                style={{
                  color: score > 0 ? "var(--success)" : "var(--error)",
                  fontFamily: "Fraunces, serif",
                }}
              >
                {score > 0
                  ? `You got it! Score: ${score}`
                  : "Better luck next time!"}
              </p>
            )}
            <p style={{ color: "var(--muted)" }}>
              Guess the 5-letter word in 6 tries.
            </p>
            <button
              onClick={start}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {phase === "menu" ? "Play" : "Play Again"}
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}
