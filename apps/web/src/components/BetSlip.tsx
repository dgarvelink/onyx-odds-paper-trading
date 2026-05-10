import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { useBetSlipStore } from "../stores/betSlipStore.js";
import { useBalance } from "../hooks/useBalance.js";
import { usePlaceOrder } from "../hooks/usePlaceOrder.js";
import { toast } from "../lib/toast.js";

export function BetSlip() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { selections, removeSelection, updateStake, clearSlip } =
    useBetSlipStore();
  const { balance } = useBalance();
  const { placeOrder, isPending } = usePlaceOrder();

  const totalStake = selections.reduce((sum, s) => sum + s.stake, 0);
  const totalToWin = selections.reduce((sum, s) => sum + s.stake / 1.1, 0);
  const isOverBalance = balance !== undefined && totalStake > balance;

  const handlePlaceAll = async () => {
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
      <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-100">Bet Slip</span>
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
            {selections.length}
          </span>
        </div>
        <button
          onClick={clearSlip}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Clear All
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {selections.map((sel) => (
          <div key={sel.id} className="rounded-md bg-zinc-800 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  {sel.label}
                </p>
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  {sel.betType} · {sel.odds}
                </span>
              </div>
              <button
                onClick={() => removeSelection(sel.id)}
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                ✕
              </button>
            </div>
            {isSignedIn && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">Stake $</label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={sel.stake}
                  onChange={(e) => updateStake(sel.id, Number(e.target.value))}
                  className="w-20 rounded bg-zinc-700 px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-zinc-500">
                  To win: ${(sel.stake / 1.1).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {isSignedIn ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total stake</span>
            <span className="text-zinc-100">${totalStake.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Total to win</span>
            <span className="text-zinc-100">${totalToWin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Balance</span>
            <span className={isOverBalance ? "text-red-400" : "text-zinc-100"}>
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
            disabled={isPending || isOverBalance}
            className="mt-1 w-full rounded-md bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Placing..." : "Place All Bets"}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
          <button
            onClick={() => navigate("/sign-in")}
            className="w-full rounded-md bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
          >
            Sign In to Place Bets
          </button>
          <p className="text-center text-xs text-zinc-500">
            Create a free account to start betting
          </p>
        </div>
      )}
    </div>
  );
}
