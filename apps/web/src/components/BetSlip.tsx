import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { useBetSlipStore, type BetSelection } from "../stores/betSlipStore.js";
import { useBalance } from "../hooks/useBalance.js";
import { usePlaceOrder } from "../hooks/usePlaceOrder.js";
import { usePlaceParlay } from "../hooks/usePlaceParlay.js";
import { useGames, type Game } from "../hooks/useGames.js";
import {
  calculateParlayOdds,
  calculateParlayToWin,
  validateParlayLegs,
} from "../lib/parlayOdds.js";
import { toast } from "../lib/toast.js";
import api from "../lib/api.js";

function buildLabel(sel: BetSelection, game: Game): string {
  if (sel.betType === "spread") {
    const n = game.spread_normalized ?? 0;
    return sel.side === "away"
      ? `${game.away_key} ${n > 0 ? `+${n}` : `${n}`}`
      : `${game.home_key} ${-n > 0 ? `+${-n}` : `${-n}`}`;
  }
  return sel.side === "over"
    ? `Over ${game.total_normalized}`
    : `Under ${game.total_normalized}`;
}

function isAdverseLine(sel: BetSelection, newLine: number): boolean {
  if (sel.betType === "spread") {
    return sel.side === "home" ? newLine > sel.line : newLine < sel.line;
  }
  return sel.side === "over" ? newLine > sel.line : newLine < sel.line;
}

export function BetSlip() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { selections, removeSelection, updateStake, updateSelection, clearSlip, mode, setMode } =
    useBetSlipStore();
  const { balance } = useBalance();
  const { placeOrder, isPending: isSinglePending } = usePlaceOrder();
  const { placeParlay, isPending: isParlayPending } = usePlaceParlay();
  const { games } = useGames();
  const [parlayStake, setParlayStake] = useState(10);

  // Flash state for slip selections when lines auto-update
  const [slipFlashes, setSlipFlashes] = useState<Record<string, "up" | "down">>({});

  // Line-change modal state
  const [lineChangedSelections, setLineChangedSelections] = useState<
    Array<{ sel: BetSelection; oldLine: number; newLine: number; newOdds: number; newLabel: string }>
  >([]);
  const [showLineChangeModal, setShowLineChangeModal] = useState(false);
  const [pendingSubmitType, setPendingSubmitType] = useState<"single" | "parlay" | null>(null);

  // Auto-update selections in slip when lines move
  useEffect(() => {
    if (!games.length) return;
    const newFlashes: Record<string, "up" | "down"> = {};
    for (const sel of selections) {
      const game = games.find((g) => g.game_id === sel.game_id);
      if (!game) continue;
      const newLine =
        sel.betType === "spread" ? game.spread_normalized : game.total_normalized;
      const newOdds =
        sel.betType === "spread"
          ? sel.side === "home"
            ? game.spread_home_odds
            : game.spread_away_odds
          : sel.side === "over"
            ? game.total_over_odds
            : game.total_under_odds;
      if (newLine !== null && newLine !== sel.line) {
        newFlashes[sel.id] = newLine > sel.line ? "up" : "down";
        updateSelection(sel.id, {
          line: newLine,
          odds: newOdds ?? sel.odds,
          label: buildLabel(sel, game),
        });
      }
    }
    if (Object.keys(newFlashes).length > 0) {
      setSlipFlashes((prev) => ({ ...prev, ...newFlashes }));
      const timer = setTimeout(
        () =>
          setSlipFlashes((prev) => {
            const next = { ...prev };
            for (const id of Object.keys(newFlashes)) delete next[id];
            return next;
          }),
        1500
      );
      return () => clearTimeout(timer);
    }
  }, [games]); // eslint-disable-line react-hooks/exhaustive-deps

  // Single mode calculations
  const totalStake = selections.reduce((sum, s) => sum + s.stake, 0);
  const totalToWin = selections.reduce(
    (sum, s) => sum + (s.stake * 100) / Math.abs(s.odds),
    0
  );
  const isOverBalance = balance !== undefined && totalStake > balance;

  // Parlay mode calculations
  const validation = validateParlayLegs(selections);
  const parlayOdds =
    selections.length >= 2 ? calculateParlayOdds(selections.map((s) => s.odds)) : -110;
  const parlayToWin = calculateParlayToWin(parlayStake * 100, parlayOdds) / 100;
  const isParlayOverBalance = balance !== undefined && parlayStake > balance;

  const submitSingle = async () => {
    try {
      for (const sel of selections) {
        await placeOrder(sel);
      }
      clearSlip();
      toast.success("All bets placed!");
    } catch {
      // individual errors handled by usePlaceOrder onError
    }
  };

  const submitParlay = () => {
    placeParlay({
      stake: parlayStake,
      legs: selections.map((s) => ({
        game_id: s.game_id,
        betType: s.betType,
        side: s.side,
        label: s.label,
        line: s.line,
        odds: s.odds,
      })),
    });
  };

  const handlePlaceAll = async () => {
    try {
      const res = await api.get<{ games: Game[] }>("/api/onyx/sportsdata/games");
      const freshGames = res.data.games ?? [];
      const adverse: typeof lineChangedSelections = [];

      for (const sel of selections) {
        const game = freshGames.find((g) => g.game_id === sel.game_id);
        if (!game) continue;
        const newLine =
          sel.betType === "spread" ? game.spread_normalized : game.total_normalized;
        const newOdds =
          sel.betType === "spread"
            ? sel.side === "home"
              ? game.spread_home_odds
              : game.spread_away_odds
            : sel.side === "over"
              ? game.total_over_odds
              : game.total_under_odds;
        if (newLine !== null && newLine !== sel.line && isAdverseLine(sel, newLine)) {
          const newLabel = buildLabel(sel, game);
          adverse.push({ sel, oldLine: sel.line, newLine, newOdds: newOdds ?? sel.odds, newLabel });
          updateSelection(sel.id, {
            line: newLine,
            odds: newOdds ?? sel.odds,
            label: newLabel,
          });
        }
      }

      if (adverse.length > 0) {
        setLineChangedSelections(adverse);
        setPendingSubmitType("single");
        setShowLineChangeModal(true);
        return;
      }

      await submitSingle();
    } catch {
      // errors handled downstream
    }
  };

  const handlePlaceParlay = async () => {
    try {
      const res = await api.get<{ games: Game[] }>("/api/onyx/sportsdata/games");
      const freshGames = res.data.games ?? [];
      const adverse: typeof lineChangedSelections = [];

      for (const sel of selections) {
        const game = freshGames.find((g) => g.game_id === sel.game_id);
        if (!game) continue;
        const newLine =
          sel.betType === "spread" ? game.spread_normalized : game.total_normalized;
        const newOdds =
          sel.betType === "spread"
            ? sel.side === "home"
              ? game.spread_home_odds
              : game.spread_away_odds
            : sel.side === "over"
              ? game.total_over_odds
              : game.total_under_odds;
        if (newLine !== null && newLine !== sel.line && isAdverseLine(sel, newLine)) {
          const newLabel = buildLabel(sel, game);
          adverse.push({ sel, oldLine: sel.line, newLine, newOdds: newOdds ?? sel.odds, newLabel });
          updateSelection(sel.id, {
            line: newLine,
            odds: newOdds ?? sel.odds,
            label: newLabel,
          });
        }
      }

      if (adverse.length > 0) {
        setLineChangedSelections(adverse);
        setPendingSubmitType("parlay");
        setShowLineChangeModal(true);
        return;
      }

      submitParlay();
    } catch {
      // errors handled downstream
    }
  };

  if (selections.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium text-zinc-300">No bets selected</p>
        <p className="text-sm text-zinc-500">Click any line to add a bet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Line-change confirmation modal */}
      {showLineChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm rounded-xl bg-panel p-5 shadow-xl">
            <h3 className="mb-1 text-base font-bold text-zinc-100">Lines Have Moved</h3>
            <p className="mb-3 text-sm text-zinc-400">
              These lines moved against you. Accept the updated lines to proceed?
            </p>
            <div className="mb-4 flex flex-col gap-2">
              {lineChangedSelections.map(({ sel, newLabel }) => (
                <div key={sel.id} className="rounded-md bg-panel-alt px-3 py-2 text-xs text-dim">
                  <span className="font-medium text-zinc-300">{sel.label}</span>
                  <span className="mx-1">→</span>
                  <span>{newLabel}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLineChangeModal(false);
                  setLineChangedSelections([]);
                  setPendingSubmitType(null);
                }}
                className="flex-1 rounded-md bg-zinc-700 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLineChangeModal(false);
                  setLineChangedSelections([]);
                  if (pendingSubmitType === "single") submitSingle();
                  else if (pendingSubmitType === "parlay") submitParlay();
                  setPendingSubmitType(null);
                }}
                className="flex-1 rounded-md bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-400"
              >
                Accept &amp; Bet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with count + clear */}
      <div className="mb-3 flex items-center justify-between border-b border-rim pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-100">Bet Slip</span>
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
            {selections.length}
          </span>
        </div>
        <button onClick={clearSlip} className="text-xs text-zinc-500 hover:text-zinc-300">
          Clear All
        </button>
      </div>

      {/* Mode toggle */}
      <div className="mb-3 flex gap-1 rounded-md bg-panel p-1">
        {(["single", "parlay"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded py-1 text-xs font-semibold capitalize transition-colors ${
              mode === m
                ? "bg-panel-alt text-zinc-100"
                : "text-dim hover:text-zinc-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {selections.map((sel) => (
              <div key={sel.id} className="rounded-md bg-panel p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{sel.label}</p>
                    <span
                      className={`text-xs uppercase tracking-wide text-dim ${
                        slipFlashes[sel.id] ? `price-flash-${slipFlashes[sel.id]}` : ""
                      }`}
                    >
                      {sel.betType} · {sel.odds > 0 ? `+${sel.odds}` : sel.odds}
                    </span>
                  </div>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="text-xs text-dim hover:text-zinc-400"
                  >
                    ✕
                  </button>
                </div>
                {isSignedIn && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-dim">Stake $</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={1}
                      value={sel.stake}
                      onChange={(e) => updateStake(sel.id, Number(e.target.value))}
                      className="w-20 rounded border border-rim bg-navy px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <span className="text-xs text-win">
                      To win: ${((sel.stake * 100) / Math.abs(sel.odds)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isSignedIn ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-rim pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-dim">Total stake</span>
                <span className="text-zinc-100">${totalStake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dim">Total to win</span>
                <span className="text-win">${totalToWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dim">Balance</span>
                <span className={isOverBalance ? "text-loss" : "text-zinc-100"}>
                  {balance !== undefined
                    ? `$${balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"}
                </span>
              </div>
              <button
                onClick={handlePlaceAll}
                disabled={isSinglePending || isOverBalance}
                className="mt-1 w-full rounded-md bg-win py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSinglePending ? "Placing..." : "Place All Bets"}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 border-t border-rim pt-3">
              <button
                onClick={() => navigate("/sign-in")}
                className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sign In to Place Bets
              </button>
              <p className="text-center text-xs text-dim">
                Create a free account to start betting
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Parlay mode */}
          {!validation.valid && (
            <div className="mb-3 rounded-md bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400">
              {validation.error}
            </div>
          )}

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {selections.map((sel) => (
              <div
                key={sel.id}
                className="flex items-center justify-between rounded-md bg-panel px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-100">{sel.label}</p>
                  <span className="text-xs uppercase tracking-wide text-dim">
                    {sel.betType}
                  </span>
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <span
                    className={`rounded bg-panel-alt px-1.5 py-0.5 text-xs font-semibold text-zinc-300 ${
                      slipFlashes[sel.id] ? `price-flash-${slipFlashes[sel.id]}` : ""
                    }`}
                  >
                    {sel.odds > 0 ? `+${sel.odds}` : sel.odds}
                  </span>
                  <button
                    onClick={() => removeSelection(sel.id)}
                    className="text-xs text-dim hover:text-zinc-400"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          {isSignedIn ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-rim pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dim">Parlay Odds</span>
                <span className="text-xl font-bold text-zinc-100">
                  {parlayOdds > 0 ? `+${parlayOdds}` : parlayOdds}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-dim">Stake $</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={parlayStake}
                  onChange={(e) => setParlayStake(Number(e.target.value))}
                  className="w-24 rounded border border-rim bg-navy px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <span className="text-xs text-win">
                  To win: ${parlayToWin.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dim">Balance</span>
                <span className={isParlayOverBalance ? "text-loss" : "text-zinc-100"}>
                  {balance !== undefined
                    ? `$${balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "—"}
                </span>
              </div>
              <button
                onClick={handlePlaceParlay}
                disabled={
                  !validation.valid ||
                  selections.length < 2 ||
                  isParlayPending ||
                  isParlayOverBalance
                }
                className="mt-1 w-full rounded-md bg-win py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isParlayPending ? "Placing..." : "Place Parlay"}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2 border-t border-rim pt-3">
              <button
                onClick={() => navigate("/sign-in")}
                className="w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Sign In to Place Bets
              </button>
              <p className="text-center text-xs text-dim">
                Create a free account to start betting
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
