import type { PracticeStats } from "../lib/stats";

interface StatsPanelProps {
  stats: PracticeStats;
  /** Streak figures, for the daily only. */
  streak?: { current: number; best: number };
  /** Guess count of the game just won, to highlight its bar. */
  highlight?: number;
}

export function StatsPanel({ stats, streak, highlight }: StatsPanelProps) {
  const winPct = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const figures: [string, number][] = [
    ["Played", stats.played],
    ["Win %", winPct],
    ...(streak ? ([["Streak", streak.current], ["Max", streak.best]] as [string, number][]) : []),
  ];
  const most = Math.max(1, ...stats.distribution);

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex justify-around" data-testid="stats-figures">
        {figures.map(([label, value]) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1" role="list" aria-label="Guess distribution">
        {stats.distribution.map((n, i) => (
          <div key={i} role="listitem" className="flex items-center gap-2 text-sm" aria-label={`${i + 1} guesses: ${n}`}>
            <span className="w-3 text-right font-semibold" style={{ color: "var(--ink)" }}>{i + 1}</span>
            <div className="flex-1">
              <div
                className="rounded px-1.5 text-right font-bold"
                style={{
                  width: `${Math.max(8, (n / most) * 100)}%`,
                  background: highlight === i + 1 ? "var(--tile-correct)" : "var(--tile-absent)",
                  color: "var(--tile-text)",
                }}
              >
                {n}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
