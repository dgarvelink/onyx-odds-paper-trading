import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/react";
import { useSportsStore } from "../stores/sportsStore.js";
import type { ActiveFilter } from "../stores/sportsStore.js";
import { useBetSlipStore } from "../stores/betSlipStore.js";
import { useGames } from "../hooks/useGames.js";
import type { Game } from "../hooks/useGames.js";
import { useBalance } from "../hooks/useBalance.js";
import { SearchBar } from "./SearchBar.js";
import { GameCard } from "./GameCard.js";
import { BetSlip } from "./BetSlip.js";

const STATUS_ORDER: Record<string, number> = { InProgress: 0, Scheduled: 1, Final: 2 };

const FILTER_OPTIONS: Array<{ label: string; value: ActiveFilter }> = [
  { label: "All", value: "all" },
  { label: "Spread", value: "spread" },
  { label: "Total", value: "total" },
];

function getLocalDateKey(datetime_utc: string): string {
  const d = new Date(datetime_utc + "Z");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(dateKey: string): string {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tom = new Date(now);
  tom.setDate(now.getDate() + 1);
  const tomorrowKey = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, "0")}-${String(tom.getDate()).padStart(2, "0")}`;

  const [y, m, day] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, day);
  const month = date.toLocaleString("en-US", { month: "long" });
  if (dateKey === todayKey) return `Today — ${month} ${day}`;
  if (dateKey === tomorrowKey) return `Tomorrow — ${month} ${day}`;
  return `${date.toLocaleString("en-US", { weekday: "long" })} — ${month} ${day}`;
}

function filterGames(games: Game[], searchQuery: string, activeFilter: ActiveFilter): Game[] {
  const q = searchQuery.toLowerCase();
  return games.filter((g) => {
    if (q) {
      const fields = [g.away_city, g.away_name, g.away_key, g.home_city, g.home_name, g.home_key];
      if (!fields.some((f) => f.toLowerCase().includes(q))) return false;
    }
    if (activeFilter === "spread") return g.spread !== null;
    if (activeFilter === "total") return g.over_under !== null;
    return true;
  });
}

function groupByDate(games: Game[]): Array<{ dateKey: string; games: Game[] }> {
  const map = new Map<string, Game[]>();
  for (const game of games) {
    const key = getLocalDateKey(game.datetime_utc);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(game);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => {
      const ao = STATUS_ORDER[a.status] ?? 1;
      const bo = STATUS_ORDER[b.status] ?? 1;
      if (ao !== bo) return ao - bo;
      return new Date(a.datetime_utc + "Z").getTime() - new Date(b.datetime_utc + "Z").getTime();
    });
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, games]) => ({ dateKey, games }));
}

export function MarketBrowserLayout() {
  const { isSignedIn } = useAuth();
  const { activeFilter, searchQuery, setActiveFilter } = useSportsStore();
  const { games, isLoading, isError } = useGames();
  const { selections } = useBetSlipStore();
  const { balance } = useBalance();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (selections.length === 0) setDrawerOpen(false);
  }, [selections.length]);

  const filteredGames = filterGames(games, searchQuery, activeFilter);
  const dateGroups = groupByDate(filteredGames);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Nav header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <span className="font-bold tracking-tight text-zinc-100">Onyx Odds</span>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <>
                <Link
                  to="/account"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  My Bets
                </Link>
                {balance !== undefined && (
                  <span className="text-sm font-medium text-zinc-300">
                    $
                    {balance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                <UserButton afterSignOutUrl="/sign-in" />
              </>
            ) : (
              <Link
                to="/sign-in"
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <div className="flex-1">
            <SearchBar />
          </div>
          <div className="flex gap-1">
            {FILTER_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setActiveFilter(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === value
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Game list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-lg bg-zinc-800" />
              ))}
            </div>
          )}
          {isError && (
            <div className="flex h-40 items-center justify-center text-zinc-500">
              Failed to load games
            </div>
          )}
          {!isLoading && !isError && dateGroups.length === 0 && (
            <div className="flex h-40 items-center justify-center text-zinc-500">
              No games found
            </div>
          )}
          {!isLoading && !isError && dateGroups.length > 0 && (
            <div className="flex flex-col gap-6">
              {dateGroups.map(({ dateKey, games }) => (
                <div key={dateKey}>
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {formatDateHeader(dateKey)}
                  </div>
                  <div className="flex flex-col gap-3">
                    {games.map((game) => (
                      <GameCard key={game.game_id} game={game} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile bet slip drawer */}
        <div className="lg:hidden">
          {selections.length > 0 && !drawerOpen && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="fixed bottom-0 left-0 right-0 z-40 bg-blue-500 py-3 text-center text-sm font-semibold text-white"
            >
              View Bet Slip ({selections.length})
            </button>
          )}
          {drawerOpen && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="relative flex max-h-[80vh] flex-col rounded-t-2xl bg-zinc-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold text-zinc-100">Bet Slip</span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    ✕
                  </button>
                </div>
                <BetSlip />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop bet slip sidebar */}
      <div className="hidden w-80 shrink-0 border-l border-zinc-800 p-4 lg:flex lg:flex-col">
        <BetSlip />
      </div>
    </div>
  );
}
