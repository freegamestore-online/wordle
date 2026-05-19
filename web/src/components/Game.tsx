import { useState, useEffect, useCallback, useRef } from "react";
import { useGameSounds } from "@freegamestore/games";
import type { GameMode } from "../types";
import { getTodaysWord, getRandomWord, isValidGuess } from "../lib/words";

interface GameProps {
  onScore: (s: number) => void;
  onGameOver: () => void;
}

type LetterStatus = "correct" | "present" | "absent" | "empty" | "tbd";

interface TileData {
  letter: string;
  status: LetterStatus;
}

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

const STATUS_COLORS: Record<LetterStatus, string> = {
  correct: "#16a34a",
  present: "#d97706",
  absent: "#6b7280",
  empty: "var(--line)",
  tbd: "var(--line-strong)",
};

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(WORD_LENGTH).fill("absent") as LetterStatus[];
  const answerChars = answer.split("");
  const guessChars = guess.split("");
  const used = Array(WORD_LENGTH).fill(false) as boolean[];

  // First pass: correct positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }

  // Second pass: present but wrong position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!used[j] && guessChars[i] === answerChars[j]) {
        result[i] = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

export function Game({ onScore, onGameOver }: GameProps) {
  const sounds = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const [mode, setMode] = useState<GameMode | null>(null);
  const [answer, setAnswer] = useState("");
  const [guesses, setGuesses] = useState<TileData[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const keyboardStatus = useRef<Map<string, LetterStatus>>(new Map());

  const startGame = useCallback((selectedMode: GameMode) => {
    const word = selectedMode === "daily" ? getTodaysWord() : getRandomWord();
    setMode(selectedMode);
    setAnswer(word);
    setGuesses([]);
    setCurrentGuess("");
    setGameWon(false);
    setGameLost(false);
    setMessage("");
    setRevealingRow(-1);
    keyboardStatus.current = new Map();
  }, []);

  const showMessage = useCallback((msg: string, duration = 1500) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), duration);
  }, []);

  const submitGuess = useCallback(() => {
    if (gameWon || gameLost) return;
    if (currentGuess.length !== WORD_LENGTH) {
      setShake(true);
      showMessage("Not enough letters");
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!isValidGuess(currentGuess)) {
      setShake(true);
      showMessage("Not in word list");
      setTimeout(() => setShake(false), 500);
      return;
    }

    const evaluation = evaluateGuess(currentGuess, answer);
    const newRow: TileData[] = currentGuess.split("").map((letter, i) => ({
      letter,
      status: evaluation[i]!,
    }));

    // Update keyboard colors
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = currentGuess[i]!.toUpperCase();
      const newStatus = evaluation[i]!;
      const existing = keyboardStatus.current.get(letter);
      // Priority: correct > present > absent
      if (
        !existing ||
        newStatus === "correct" ||
        (newStatus === "present" && existing !== "correct")
      ) {
        keyboardStatus.current.set(letter, newStatus);
      }
    }

    const newGuesses = [...guesses, newRow];
    setGuesses(newGuesses);
    setCurrentGuess("");
    setRevealingRow(newGuesses.length - 1);
    setTimeout(() => setRevealingRow(-1), WORD_LENGTH * 150 + 300);
    soundsRef.current.playTick();

    const won = currentGuess === answer;
    if (won) {
      setTimeout(() => {
        setGameWon(true);
        const score = 7 - newGuesses.length;
        onScore(score);
        showMessage(`You won in ${newGuesses.length}!`, 3000);
        soundsRef.current.playLevelUp();
        onGameOver();
      }, WORD_LENGTH * 150 + 400);
    } else if (newGuesses.length >= MAX_GUESSES) {
      setTimeout(() => {
        setGameLost(true);
        onScore(0);
        showMessage(answer.toUpperCase(), 5000);
        soundsRef.current.playGameOver();
        onGameOver();
      }, WORD_LENGTH * 150 + 400);
    }
  }, [currentGuess, answer, guesses, gameWon, gameLost, onScore, onGameOver, showMessage]);

  const addLetter = useCallback(
    (letter: string) => {
      if (gameWon || gameLost) return;
      if (currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((prev) => prev + letter.toLowerCase());
      }
    },
    [currentGuess, gameWon, gameLost],
  );

  const deleteLetter = useCallback(() => {
    if (gameWon || gameLost) return;
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, [gameWon, gameLost]);

  // Physical keyboard handler
  useEffect(() => {
    if (!mode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        deleteLetter();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        addLetter(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, submitGuess, addLetter, deleteLetter]);

  const handleKeyTap = useCallback(
    (key: string) => {
      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACK") {
        deleteLetter();
      } else {
        addLetter(key);
      }
    },
    [submitGuess, addLetter, deleteLetter],
  );

  // Mode selection screen
  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-4">
        <h2
          className="text-3xl font-bold"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Choose Mode
        </h2>
        <div className="flex gap-4">
          <button
            onClick={() => startGame("daily")}
            className="px-6 py-3 rounded-xl font-semibold min-h-[2.75rem]"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Daily
          </button>
          <button
            onClick={() => startGame("practice")}
            className="px-6 py-3 rounded-xl font-semibold min-h-[2.75rem]"
            style={{ background: "var(--success)", color: "#fff" }}
          >
            Practice
          </button>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Daily: same word for everyone today. Practice: random word each time.
        </p>
      </div>
    );
  }

  // Build the grid rows
  const gridRows: TileData[][] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < guesses.length) {
      gridRows.push(guesses[i]!);
    } else if (i === guesses.length) {
      // Current guess row
      const row: TileData[] = [];
      for (let j = 0; j < WORD_LENGTH; j++) {
        const letter = currentGuess[j];
        row.push({
          letter: letter ?? "",
          status: letter ? "tbd" : "empty",
        });
      }
      gridRows.push(row);
    } else {
      // Empty future row
      gridRows.push(
        Array.from({ length: WORD_LENGTH }, () => ({ letter: "", status: "empty" as LetterStatus })),
      );
    }
  }

  return (
    <div className="flex flex-col items-center h-full select-none">
      {/* Message toast */}
      {message && (
        <div
          className="absolute top-4 z-10 px-4 py-2 rounded-xl text-sm font-bold"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
          }}
        >
          {message}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-2">
        <div className="flex flex-col gap-1.5">
          {gridRows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`flex gap-1.5 ${shake && rowIndex === guesses.length ? "animate-shake" : ""}`}
            >
              {row.map((tile, colIndex) => {
                const isRevealing = revealingRow === rowIndex;
                const delay = colIndex * 150;
                return (
                  <div
                    key={colIndex}
                    className="flex items-center justify-center font-bold text-xl uppercase"
                    style={{
                      width: "clamp(48px, 12vw, 62px)",
                      height: "clamp(48px, 12vw, 62px)",
                      borderRadius: "0.25rem",
                      border:
                        tile.status === "empty" || tile.status === "tbd"
                          ? `2px solid ${STATUS_COLORS[tile.status]}`
                          : "none",
                      background:
                        tile.status !== "empty" && tile.status !== "tbd"
                          ? STATUS_COLORS[tile.status]
                          : "transparent",
                      color:
                        tile.status !== "empty" && tile.status !== "tbd"
                          ? "#fff"
                          : "var(--ink)",
                      transition: isRevealing
                        ? `background ${150}ms ease ${delay}ms, border ${150}ms ease ${delay}ms, color ${150}ms ease ${delay}ms`
                        : "none",
                      transform: isRevealing
                        ? undefined
                        : undefined,
                      animation: isRevealing
                        ? `flip 300ms ease ${delay}ms`
                        : tile.status === "tbd" && tile.letter
                          ? "pop 100ms ease"
                          : undefined,
                    }}
                  >
                    {tile.letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* On-screen keyboard */}
      <div className="w-full max-w-lg px-1 pb-2 flex flex-col gap-1.5">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => {
              const status = keyboardStatus.current.get(key);
              const isWide = key === "ENTER" || key === "BACK";
              return (
                <button
                  key={key}
                  onClick={() => handleKeyTap(key)}
                  className="flex items-center justify-center font-bold rounded-md"
                  style={{
                    minHeight: "48px",
                    minWidth: isWide ? "56px" : "28px",
                    flex: isWide ? "1.5" : "1",
                    fontSize: isWide ? "11px" : "14px",
                    background: status
                      ? STATUS_COLORS[status]
                      : "var(--line)",
                    color: status ? "#fff" : "var(--ink)",
                    transition: "background 200ms ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  {key === "BACK" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="20"
                      viewBox="0 0 24 24"
                      width="20"
                      fill="currentColor"
                    >
                      <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z" />
                    </svg>
                  ) : (
                    key
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 500ms ease;
        }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        @keyframes flip {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(0); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
