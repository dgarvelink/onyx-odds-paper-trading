import { useState } from "react";
import { Link } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useUserSync } from "../hooks/useUserSync.js";
import { useBalance } from "../hooks/useBalance.js";
import { AccountSummaryBar } from "../components/AccountSummaryBar.js";
import { PositionsTable } from "../components/PositionsTable.js";
import { ParlaysTable } from "../components/ParlaysTable.js";
import { OrderHistoryTable } from "../components/OrderHistoryTable.js";
import { ErrorBoundary } from "../components/ErrorBoundary.js";

type Tab = "positions" | "parlays" | "orders";

export function AccountPage() {
  useUserSync();
  const { balance } = useBalance();
  const [activeTab, setActiveTab] = useState<Tab>("positions");

  return (
    <div className="min-h-screen bg-navy text-zinc-100">
      <div className="flex items-center justify-between border-b border-rim bg-topbar px-4 py-3">
        <Link
          to="/dashboard"
          className="font-bold tracking-tight text-zinc-100 hover:text-zinc-300"
        >
          Onyx Odds
        </Link>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">My Account</h1>
          <Link
            to="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            ← Back to Markets
          </Link>
        </div>

        <div className="mb-8">
          <ErrorBoundary>
            <AccountSummaryBar />
          </ErrorBoundary>
        </div>

        <div className="mb-4 flex border-b border-rim">
          {(["positions", "parlays", "orders"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 pr-6 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "positions"
                ? "Open Positions"
                : tab === "parlays"
                  ? "Parlays"
                  : "Order History"}
            </button>
          ))}
        </div>

        {activeTab === "positions" ? (
          <ErrorBoundary><PositionsTable /></ErrorBoundary>
        ) : activeTab === "parlays" ? (
          <ErrorBoundary><ParlaysTable /></ErrorBoundary>
        ) : (
          <ErrorBoundary><OrderHistoryTable /></ErrorBoundary>
        )}
      </div>
    </div>
  );
}
