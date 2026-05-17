import { useState, useCallback, useRef } from "react";
import { GameShell, GameTopbar, GameAuth } from "@freegamestore/games";
import { Game } from "./components/Game";
import { useLeaderboard } from '@freegamestore/games';
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
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(getBestScore);
  const [streak, setStreak] = useState(getStreak);
  const [gameKey, setGameKey] = useState(0);
  const scoreRef = useRef(0);
  const { submitScore } = useLeaderboard("wordle");

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
    <GameShell
      topbar={
        <GameTopbar
          title="Wordle"
          stats={[
            { label: "Streak", value: streak },
            { label: "Best", value: bestScore },
          ]}
          rules={
            <div>
              <h3 style={{marginBottom:'0.5rem',fontWeight:700}}>Wordle</h3>
              <p>Guess the 5-letter word in 6 tries.</p>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Controls</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Type letters to fill each guess</li>
                <li>Enter to submit, Backspace to delete</li>
              </ul>
              <h4 style={{marginTop:'0.75rem',fontWeight:600}}>Color Hints</h4>
              <ul style={{paddingLeft:'1.2rem',marginTop:'0.25rem'}}>
                <li>Green = right letter, right spot</li>
                <li>Yellow = right letter, wrong spot</li>
                <li>Gray = letter not in the word</li>
              </ul>
            </div>
          }
          actions={<GameAuth />}
        />
      }
    >
      <div className="relative w-full h-full">
        <Game key={gameKey} onScore={handleScore} onGameOver={handleGameOver} />
        {phase === "over" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ background: "rgba(0,0,0,0.55)" }}>
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
            <button
              onClick={start}
              className="px-6 py-3 rounded-xl font-semibold min-h-[2.75rem]"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </GameShell>
  );
}
