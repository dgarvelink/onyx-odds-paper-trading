import { useState } from "react";
import { useBetSlipStore } from "../stores/betSlipStore.js";
import { usePriceFlash, useLineFlash } from "../hooks/usePriceFlash.js";
import type { Game } from "../hooks/useGames.js";

interface BetButtonProps {
  label: string;
  odds: number;
  isSelected: boolean;
  onClick: () => void;
  lineFlash?: "up" | "down" | null;
}

function BetButton({ label, odds, isSelected, onClick, lineFlash }: BetButtonProps) {
  const flash = usePriceFlash(odds);
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-center rounded-md px-2 py-2 transition-colors ${
        isSelected
          ? "bg-brand text-white"
          : "bg-panel-alt text-zinc-100 hover:bg-rim"
      }`}
    >
      <span className="text-sm font-bold leading-tight">{label}</span>
      <span className="relative flex items-center justify-center">
        <span
          className={`text-xs ${flash ? `price-flash-${flash}` : ""} ${
            isSelected ? "text-white" : "text-dim"
          }`}
        >
          {odds > 0 ? `+${odds}` : `${odds}`}
        </span>
        <span
          className={`absolute -right-3 text-xs font-bold transition-opacity duration-300 ${
            lineFlash === "up"
              ? "text-win opacity-100"
              : lineFlash === "down"
                ? "text-loss opacity-100"
                : "opacity-0"
          }`}
        >
          {lineFlash === "up" ? "↑" : "↓"}
        </span>
      </span>
    </button>
  );
}

interface TeamLogoProps {
  src: string;
  alt: string;
  fallback: string;
}

function TeamLogo({ src, alt, fallback }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel-alt text-xs font-bold text-dim">
        {fallback}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-8 w-8 shrink-0 object-contain"
      onError={() => setImgError(true)}
    />
  );
}

function formatGameTime(datetime_utc: string): string {
  return new Date(datetime_utc + "Z").toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtSpread(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const { selections, toggleSelection } = useBetSlipStore();
  const spreadFlash = useLineFlash(game.game_id, "spread", game.spread_normalized);
  const totalFlash = useLineFlash(game.game_id, "total", game.total_normalized);

  if (game.spread === null && game.over_under === null) return null;

  const isSelected = (id: string) => selections.some((s) => s.id === id);
  const hasSpread = game.spread_normalized !== null;
  const hasTotal = game.total_normalized !== null;
  const isLive = game.status === "InProgress";
  const isFinal = game.status === "Final";

  return (
    <div className="rounded-lg border border-rim bg-panel p-4">
      {/* Match meta */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-live-now" />
                <span className="text-xs font-semibold uppercase tracking-wide text-live-now">Live</span>
              </span>
              {game.quarter && (
                <span className="text-xs text-dim">
                  {game.quarter}
                  {game.time_remaining_min !== null ? ` · ${game.time_remaining_min}m` : ""}
                </span>
              )}
            </>
          ) : isFinal ? (
            <span className="text-xs font-medium uppercase tracking-wide text-dim">Final</span>
          ) : (
            <span className="text-sm font-medium text-zinc-300">{formatGameTime(game.datetime_utc)}</span>
          )}
        </div>
        {game.channel && !isLive && !isFinal && (
          <span className="text-xs text-dim">{game.channel}</span>
        )}
      </div>

      {/* Column headers */}
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex-1" />
        {hasSpread && (
          <div className="w-20 text-center text-xs font-semibold uppercase tracking-wider text-dim">
            SPREAD
          </div>
        )}
        {hasTotal && (
          <div className="w-20 text-center text-xs font-semibold uppercase tracking-wider text-dim">
            TOTAL
          </div>
        )}
      </div>

      {/* Away team row */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamLogo src={game.away_logo} alt={game.away_name} fallback={game.away_key} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-dim">{game.away_city}</div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-zinc-100">{game.away_name}</span>
              {(isLive || isFinal) && game.away_score !== null && (
                <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-100">
                  {game.away_score}
                </span>
              )}
            </div>
          </div>
        </div>
        {hasSpread && (
          <div className={`w-20 shrink-0 ${spreadFlash ? `price-flash-${spreadFlash}` : ""}`}>
            <BetButton
              label={fmtSpread(game.spread_normalized!)}
              odds={game.spread_away_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-spread-away`)}
              lineFlash={spreadFlash}
              onClick={() =>
                toggleSelection({
                  id: `${game.game_id}-spread-away`,
                  game_id: game.game_id,
                  betType: "spread",
                  side: "away",
                  label: `${game.away_key} ${fmtSpread(game.spread_normalized!)}`,
                  line: game.spread_normalized ?? game.spread ?? 0,
                  odds: game.spread_away_odds ?? -110,
                  stake: 10,
                })
              }
            />
          </div>
        )}
        {hasTotal && (
          <div className={`w-20 shrink-0 ${totalFlash ? `price-flash-${totalFlash}` : ""}`}>
            <BetButton
              label={`O ${game.total_normalized}`}
              odds={game.total_over_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-total-over`)}
              lineFlash={totalFlash}
              onClick={() =>
                toggleSelection({
                  id: `${game.game_id}-total-over`,
                  game_id: game.game_id,
                  betType: "total",
                  side: "over",
                  label: `Over ${game.total_normalized}`,
                  line: game.total_normalized ?? game.over_under ?? 0,
                  odds: game.total_over_odds ?? -110,
                  stake: 10,
                })
              }
            />
          </div>
        )}
      </div>

      {/* Home team row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamLogo src={game.home_logo} alt={game.home_name} fallback={game.home_key} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-dim">{game.home_city}</div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-zinc-100">{game.home_name}</span>
              {(isLive || isFinal) && game.home_score !== null && (
                <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-100">
                  {game.home_score}
                </span>
              )}
            </div>
          </div>
        </div>
        {hasSpread && (
          <div className={`w-20 shrink-0 ${spreadFlash ? `price-flash-${spreadFlash}` : ""}`}>
            <BetButton
              label={fmtSpread(-game.spread_normalized!)}
              odds={game.spread_home_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-spread-home`)}
              lineFlash={spreadFlash}
              onClick={() =>
                toggleSelection({
                  id: `${game.game_id}-spread-home`,
                  game_id: game.game_id,
                  betType: "spread",
                  side: "home",
                  label: `${game.home_key} ${fmtSpread(-game.spread_normalized!)}`,
                  line: game.spread_normalized ?? game.spread ?? 0,
                  odds: game.spread_home_odds ?? -110,
                  stake: 10,
                })
              }
            />
          </div>
        )}
        {hasTotal && (
          <div className={`w-20 shrink-0 ${totalFlash ? `price-flash-${totalFlash}` : ""}`}>
            <BetButton
              label={`U ${game.total_normalized}`}
              odds={game.total_under_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-total-under`)}
              lineFlash={totalFlash}
              onClick={() =>
                toggleSelection({
                  id: `${game.game_id}-total-under`,
                  game_id: game.game_id,
                  betType: "total",
                  side: "under",
                  label: `Under ${game.total_normalized}`,
                  line: game.total_normalized ?? game.over_under ?? 0,
                  odds: game.total_under_odds ?? -110,
                  stake: 10,
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
