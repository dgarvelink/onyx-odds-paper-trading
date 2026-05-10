import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export interface AccountSummary {
  balance: number;
  balanceCents: number;
  totalStaked: number;
  totalToWin: number;
  openPositionsCount: number;
  totalOrdersCount: number;
  settledCount: number;
  totalWon: number;
  totalPushed: number;
  currency: string;
}

export function useAccountSummary() {
  const { data, isLoading } = useQuery<AccountSummary>({
    queryKey: ["summary"],
    queryFn: () => api.get("/api/account/summary").then((r) => r.data),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  return { summary: data, isLoading };
}
