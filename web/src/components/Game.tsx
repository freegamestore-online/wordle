import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useGameSounds } from "@freegamestore/games";
import { isValidGuess } from "../lib/words";
import { evaluateGuess, hardModeError, isFinished, MAX_GUESSES, WORD_LENGTH, type LetterStatus } from "../lib/rules";

interface GameProps {
  answer: string;
  /** Guesses already made, e.g. a restored daily board. */
  initialGuesses: string[];
  /** Revealed hints must be used in later guesses. */
  hardMode: boolean;
  /** Called after every accepted guess with the whole board, so it can be saved and scored. */
  onGuess: (guesses: string[]) => void;
  /** Called once the last row has finished revealing. */
  onGameOver: () => void;
}

type TileStatus = LetterStatus | "empty" | "tbd";

interface TileData {
  letter: string;
  status: TileStatus;
}

const REVEAL_MS = WORD_LENGTH * 150 + 400;

const STATUS_COLORS: Record<TileStatus, string> = {
  correct: "var(--tile-correct)",
  present: "var(--tile-present)",
  absent: "var(--tile-absent)",
  empty: "var(--line)",
  tbd: "var(--line-strong)",
};

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

const TILE_SIZE = "clamp(36px, min(12vw, 6.6svh), 62px)";

export function Game({ answer, initialGuesses, hardMode, onGuess, onGameOver }: GameProps) {
  const sounds = useGameSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;
  const [guesses, setGuesses] = useState<string[]>(initialGuesses);
  const [currentGuess, setCurrentGuess] = useState("");
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState("");
  const [revealingRow, setRevealingRow] = useState(-1);
  const messageTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const over = isFinished(guesses, answer);

  const rows = useMemo(
    () => guesses.map((g) => evaluateGuess(g, answer).map((status, i) => ({ letter: g[i]!, status }))),
    [guesses, answer],
  );

  // Keyboard colours. Priority: correct > present > absent.
  const keyboardStatus = useMemo(() => {
    const map = new Map<string, LetterStatus>();
    for (const row of rows) {
      for (const { letter, status } of row) {
        const key = letter.toUpperCase();
        const existing = map.get(key);
        if (!existing || status === "correct" || (status === "present" && existing === "absent")) {
          map.set(key, status);
        }
      }
    }
    return map;
  }, [rows]);

  const showMessage = useCallback((msg: string, duration = 1500) => {
    clearTimeout(messageTimer.current);
    setMessage(msg);
    messageTimer.current = setTimeout(() => setMessage(""), duration);
  }, []);

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  const reject = useCallback(
    (msg: string) => {
      setShake(true);
      showMessage(msg);
      setTimeout(() => setShake(false), 500);
    },
    [showMessage],
  );

  const submitGuess = useCallback(() => {
    if (over) return;
    if (currentGuess.length !== WORD_LENGTH) return reject("Not enough letters");
    if (!isValidGuess(currentGuess)) return reject("Not in word list");
    const hardError = hardMode ? hardModeError(currentGuess, guesses, answer) : null;
    if (hardError) return reject(hardError);

    const next = [...guesses, currentGuess];
    setGuesses(next);
    setCurrentGuess("");
    setRevealingRow(next.length - 1);
    soundsRef.current.playTick();
    onGuess(next);
  }, [over, currentGuess, guesses, hardMode, answer, reject, onGuess]);

  // When the last row has revealed, announce the result. Not on a board restored already finished.
  useEffect(() => {
    if (revealingRow < 0) return;
    const timer = setTimeout(() => {
      setRevealingRow(-1);
      if (!isFinished(guesses, answer)) return;
      if (guesses.includes(answer)) {
        showMessage(`You won in ${guesses.length}!`, 3000);
        soundsRef.current.playLevelUp();
      } else {
        showMessage(answer.toUpperCase(), 5000);
        soundsRef.current.playGameOver();
      }
      onGameOver();
    }, REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealingRow, guesses, answer, showMessage, onGameOver]);

  const addLetter = useCallback(
    (letter: string) => {
      if (over) return;
      setCurrentGuess((prev) => (prev.length < WORD_LENGTH ? prev + letter.toLowerCase() : prev));
    },
    [over],
  );

  const deleteLetter = useCallback(() => {
    if (over) return;
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, [over]);

  // Physical keyboard handler
  useEffect(() => {
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
  }, [submitGuess, addLetter, deleteLetter]);

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

  // Build the grid rows
  const gridRows: TileData[][] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    if (i < rows.length) {
      gridRows.push(rows[i]!);
    } else if (i === rows.length && !over) {
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
      gridRows.push(Array.from({ length: WORD_LENGTH }, () => ({ letter: "", status: "empty" as const })));
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
        <div className="flex flex-col gap-1.5" data-testid="board">
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
                      width: TILE_SIZE,
                      height: TILE_SIZE,
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
                          ? "var(--tile-text)"
                          : "var(--ink)",
                      transition: isRevealing
                        ? `background ${150}ms ease ${delay}ms, border ${150}ms ease ${delay}ms, color ${150}ms ease ${delay}ms`
                        : "none",
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
              const status = keyboardStatus.get(key);
              const isWide = key === "ENTER" || key === "BACK";
              return (
                <button
                  key={key}
                  aria-label={key === "BACK" ? "Backspace" : key === "ENTER" ? "Enter" : key}
                  // Keep focus off the key, so physical Enter or Space never re-presses it.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleKeyTap(key)}
                  className="flex items-center justify-center font-bold rounded-md"
                  style={{
                    minHeight: "48px",
                    minWidth: 0,
                    flex: isWide ? "1.5" : "1",
                    fontSize: isWide ? "11px" : "14px",
                    background: status
                      ? STATUS_COLORS[status]
                      : "var(--line)",
                    color: status ? "var(--tile-text)" : "var(--ink)",
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
