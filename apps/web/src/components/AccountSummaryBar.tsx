import { useAccountSummary } from "../hooks/useAccountSummary.js";

export function AccountSummaryBar() {
  const { summary, isLoading } = useAccountSummary();

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-zinc-800" />
        ))}
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

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map(({ label, value, sub, valueClass }) => (
        <div
          key={label}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <p className="mb-1 text-xs text-zinc-500">{label}</p>
          <p className={`text-2xl font-bold text-zinc-100 ${valueClass}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
      ))}
    </div>
  );
}
