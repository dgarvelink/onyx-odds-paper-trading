import { useState } from "react";
import { useParlays, type Parlay } from "../hooks/useParlays.js";

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "OPEN" || status === "PENDING"
      ? "bg-yellow-400 text-black"
      : status === "WON"
        ? "bg-win text-black"
        : status === "LOST"
          ? "bg-loss text-white"
          : "bg-slate-600 text-white";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

function ParlayRow({
  parlay,
  expanded,
  onToggle,
  rowIdx,
}: {
  parlay: Parlay;
  expanded: boolean;
  onToggle: () => void;
  rowIdx: number;
}) {
  const actualProfit =
    parlay.status === "WON" && parlay.settlement
      ? (parlay.settlement.payout - parlay.stakeCents) / 100
      : parlay.toWinCents / 100;

  const toWinDisplay =
    parlay.status === "LOST" ? (
      <span className="text-loss">$0.00</span>
    ) : parlay.status === "PUSH" ? (
      <span className="text-dim">Push — Stake Returned</span>
    ) : (
      <span className="text-win">${actualProfit.toFixed(2)}</span>
    );

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-rim/50 hover:bg-panel-alt/50 ${rowIdx % 2 === 1 ? "bg-panel/40" : ""}`}
        onClick={onToggle}
      >
        <td className="py-3 pr-4 font-medium text-zinc-100">
          <span className="flex items-center gap-1.5">
            {parlay.legs.length} leg{parlay.legs.length !== 1 ? "s" : ""}
            <span className={`text-dim transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              ▾
            </span>
          </span>
        </td>
        <td className="py-3 pr-4 font-semibold text-zinc-100">
          {formatOdds(parlay.parlayOdds)}
        </td>
        <td className="py-3 pr-4 text-zinc-300">
          ${(parlay.stakeCents / 100).toFixed(2)}
        </td>
        <td className="py-3 pr-4 font-medium">{toWinDisplay}</td>
        <td className="py-3 pr-4">
          <StatusBadge status={parlay.status} />
        </td>
        <td className="py-3 text-dim">{relativeTime(parlay.createdAt)}</td>
      </tr>
      {expanded && (
        <tr className="border-b border-rim/50 bg-panel/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-col gap-1.5">
              {parlay.legs.map((leg) => (
                <div
                  key={leg.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-300">{leg.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-dim">{formatOdds(leg.odds)}</span>
                    <StatusBadge status={leg.status} />
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function ParlaysTable() {
  const { parlays, isLoading } = useParlays();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-panel-alt" />
        ))}
      </div>
    );
  }

  if (parlays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="font-medium text-zinc-300">No parlays yet</p>
        <p className="text-sm text-dim">
          Switch to Parlay mode in the bet slip to combine bets
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rim text-left text-xs text-dim">
            <th className="pb-3 pr-4 font-medium">Legs</th>
            <th className="pb-3 pr-4 font-medium">Odds</th>
            <th className="pb-3 pr-4 font-medium">Stake</th>
            <th className="pb-3 pr-4 font-medium">To Win</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 font-medium">Placed</th>
          </tr>
        </thead>
        <tbody>
          {parlays.map((p, idx) => (
            <ParlayRow
              key={p.id}
              parlay={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              rowIdx={idx}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
