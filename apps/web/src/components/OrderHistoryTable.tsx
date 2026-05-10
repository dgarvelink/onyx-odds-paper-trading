import { useState } from "react";
import { useOrders } from "../hooks/useOrders.js";

function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const PAGE_SIZE = 20;

export function OrderHistoryTable() {
  const { orders, isLoading } = useOrders();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="font-medium text-zinc-300">No orders yet</p>
        <p className="text-sm text-zinc-500">Your bet history will appear here</p>
      </div>
    );
  }

  const visible = orders.slice(0, visibleCount);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-3 pr-4 font-medium">Bet</th>
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Side</th>
              <th className="pb-3 pr-4 font-medium">Stake</th>
              <th className="pb-3 pr-4 font-medium">To Win</th>
              <th className="pb-3 pr-4 font-medium">Odds</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => {
              const meta = o.metadata;
              const statusClass =
                o.status === "FILLED" ? "bg-yellow-500/20 text-yellow-400"
                : o.status === "WON"  ? "bg-green-500/20 text-green-400"
                : o.status === "LOST" ? "bg-red-500/20 text-red-400"
                :                       "bg-zinc-700 text-zinc-400";
              const statusLabel = o.status === "FILLED" ? "OPEN" : o.status;
              return (
                <tr key={o.id} className="border-b border-zinc-800/50">
                  <td className="py-3 pr-4 font-medium text-zinc-100">
                    {meta.label ?? o.symbol}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs font-semibold uppercase text-zinc-300">
                      {meta.betType ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-400">{o.side}</td>
                  <td className="py-3 pr-4 text-zinc-300">
                    ${(o.fillPrice / 100).toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {o.status === "PUSH" && (
                      <span className="text-zinc-400">Push — Stake Returned</span>
                    )}
                    {o.status === "LOST" && (
                      <span className="text-red-400">$0.00</span>
                    )}
                    {(o.status === "WON" || o.status === "FILLED") && (
                      <span className="text-green-400">
                        ${((meta.toWinCents ?? 0) / 100).toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400">{meta.odds ?? -110}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-500">{relativeTime(o.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visibleCount < orders.length && (
        <button
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          className="mt-4 w-full rounded-md border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-zinc-200"
        >
          Load more ({orders.length - visibleCount} remaining)
        </button>
      )}
    </>
  );
}
