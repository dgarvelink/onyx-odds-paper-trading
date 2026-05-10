import { useState } from "react";
import { useBetSlipStore } from "../stores/betSlipStore.js";
import { usePriceFlash } from "../hooks/usePriceFlash.js";
import type { Game } from "../hooks/useGames.js";

interface BetButtonProps {
  label: string;
  odds: number;
  isSelected: boolean;
  onClick: () => void;
}

function BetButton({ label, odds, isSelected, onClick }: BetButtonProps) {
  const flash = usePriceFlash(odds);
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
        isSelected
          ? "bg-blue-500 text-white"
          : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
      }`}
    >
      <span className="font-semibold leading-tight">{label}</span>
      <span
        className={`text-xs ${flash ? `price-flash-${flash}` : ""} ${
          isSelected ? "text-blue-100" : "text-zinc-400"
        }`}
      >
        {odds > 0 ? `+${odds}` : `${odds}`}
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
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

  if (game.spread === null && game.over_under === null) return null;

  const isSelected = (id: string) => selections.some((s) => s.id === id);

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-4">
      {/* Matchup + status */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <TeamLogo src={game.away_logo} alt={game.away_name} fallback={game.away_key} />
            <div>
              <div className="text-xs text-zinc-500">{game.away_city}</div>
              <div className="text-sm font-semibold text-zinc-100">{game.away_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TeamLogo src={game.home_logo} alt={game.home_name} fallback={game.home_key} />
            <div>
              <div className="text-xs text-zinc-500">{game.home_city}</div>
              <div className="text-sm font-semibold text-zinc-100">{game.home_name}</div>
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {game.status === "InProgress" && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs font-semibold uppercase tracking-wide text-green-400">
                  Live
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-zinc-100">
                {game.away_score ?? "–"}&nbsp;–&nbsp;{game.home_score ?? "–"}
              </div>
              {game.quarter && (
                <div className="text-xs text-zinc-500">
                  {game.quarter}
                  {game.time_remaining_min !== null
                    ? ` · ${game.time_remaining_min}m`
                    : ""}
                </div>
              )}
            </div>
          )}
          {game.status === "Scheduled" && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-zinc-300">
                {formatGameTime(game.datetime_utc)}
              </span>
              {game.channel && (
                <span className="text-xs text-zinc-500">{game.channel}</span>
              )}
            </div>
          )}
          {game.status === "Final" && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Final
              </span>
              <div className="text-xl font-bold tabular-nums text-zinc-100">
                {game.away_score ?? "–"}&nbsp;–&nbsp;{game.home_score ?? "–"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bet buttons */}
      <div className="flex flex-col gap-2 border-t border-zinc-800 pt-3">
        {game.spread_normalized !== null && (
          <div className="flex gap-2">
            <BetButton
              label={`${game.away_key} ${fmtSpread(game.spread_normalized!)}`}
              odds={game.spread_away_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-spread-away`)}
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
            <BetButton
              label={`${game.home_key} ${fmtSpread(-game.spread_normalized!)}`}
              odds={game.spread_home_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-spread-home`)}
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
        {game.total_normalized !== null && (
          <div className="flex gap-2">
            <BetButton
              label={`O ${game.total_normalized}`}
              odds={game.total_over_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-total-over`)}
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
            <BetButton
              label={`U ${game.total_normalized}`}
              odds={game.total_under_odds ?? -110}
              isSelected={isSelected(`${game.game_id}-total-under`)}
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
