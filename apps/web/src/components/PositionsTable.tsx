import { Link } from "react-router-dom";
import { usePositions } from "../hooks/usePositions.js";

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function PositionsTable() {
  const { positions, isLoading } = usePositions();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-panel-alt" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <span className="text-4xl">🎯</span>
        <p className="font-medium text-zinc-300">No open positions</p>
        <p className="text-sm text-dim">Place a bet to get started</p>
        <Link
          to="/dashboard"
          className="mt-2 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse Markets
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rim text-left text-xs text-dim">
            <th className="pb-3 pr-4 font-medium">Bet</th>
            <th className="pb-3 pr-4 font-medium">Type</th>
            <th className="pb-3 pr-4 font-medium">Side</th>
            <th className="pb-3 pr-4 font-medium">Qty</th>
            <th className="pb-3 pr-4 font-medium">Staked</th>
            <th className="pb-3 pr-4 font-medium">To Win</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, idx) => (
            <tr
              key={p.id}
              className={`border-b border-rim/50 ${idx % 2 === 1 ? "bg-panel/40" : ""}`}
            >
              <td className="py-3 pr-4 font-medium text-zinc-100">{p.label}</td>
              <td className="py-3 pr-4">
                <span className="rounded bg-panel-alt px-1.5 py-0.5 text-xs font-semibold uppercase text-dim">
                  {p.betType}
                </span>
              </td>
              <td className="py-3 pr-4 text-dim">{p.side}</td>
              <td className="py-3 pr-4 text-dim">{p.quantity}</td>
              <td className="py-3 pr-4 text-zinc-300">
                ${(p.stakeCents / 100).toFixed(2)}
              </td>
              <td className="py-3 pr-4 font-medium text-win">
                ${(p.toWinCents / 100).toFixed(2)}
              </td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-black">
                  OPEN
                </span>
              </td>
              <td className="py-3 text-dim">{relativeTime(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
