import { useUserSync } from "../hooks/useUserSync.js";
import { MarketBrowserLayout } from "../components/MarketBrowserLayout.js";

export function DashboardPage() {
  useUserSync();
  return <MarketBrowserLayout />;
}
