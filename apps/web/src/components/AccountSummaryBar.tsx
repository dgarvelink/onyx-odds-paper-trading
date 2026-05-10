import { useAccountSummary } from "../hooks/useAccountSummary.js";

export function AccountSummaryBar() {
  const { summary, isLoading } = useAccountSummary();

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Available Balance",
      value: `$${summary.balance.toFixed(2)}`,
      sub: "Available to bet",
      valueClass: "",
    },
    {
      label: "Total Staked",
      value: `$${summary.totalStaked.toFixed(2)}`,
      sub: `${summary.openPositionsCount} open bet${summary.openPositionsCount !== 1 ? "s" : ""}`,
      valueClass: "",
    },
    {
      label: "Total to Win",
      value: `$${summary.totalToWin.toFixed(2)}`,
      sub: "If all bets win",
      valueClass: "text-green-400",
    },
    {
      label: "Total Bets Placed",
      value: String(summary.totalOrdersCount),
      sub: "All time",
      valueClass: "",
    },
    {
      label: "Settled",
      value: String(summary.settledCount ?? 0),
      sub: `${summary.totalPushed ?? 0} push${(summary.totalPushed ?? 0) !== 1 ? "es" : ""}`,
      valueClass: "",
    },
  ];

  const historyCards = [
    {
      label: "All-Time Wagered",
      value: `$${summary.totalWagered.toFixed(2)}`,
      sub: "Total amount staked",
      valueClass: "",
    },
    {
      label: "All-Time Returned",
      value: `$${summary.totalReturned.toFixed(2)}`,
      sub: "Payouts received",
      valueClass: "text-green-400",
    },
    {
      label: "Net P&L",
      value: `${summary.netPL >= 0 ? "+" : ""}$${summary.netPL.toFixed(2)}`,
      sub: summary.netPL >= 0 ? "In profit" : "In the red",
      valueClass: summary.netPL >= 0 ? "text-green-400" : "text-red-400",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map(({ label, value, sub, valueClass }) => (
          <div
            key={label}
            className="rounded-lg border border-rim bg-panel p-4"
          >
            <p className="mb-1 text-xs text-zinc-500">{label}</p>
            <p className={`text-2xl font-bold text-zinc-100 ${valueClass}`}>
              {value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {historyCards.map(({ label, value, sub, valueClass }) => (
          <div
            key={label}
            className="rounded-lg border border-rim bg-panel p-4"
          >
            <p className="mb-1 text-xs text-zinc-500">{label}</p>
            <p className={`text-2xl font-bold text-zinc-100 ${valueClass}`}>
              {value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
