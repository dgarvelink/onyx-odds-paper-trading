import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

interface BalanceResponse {
  balanceCents: number;
  balance: number;
  currency: string;
}

export function useBalance() {
  const { isSignedIn } = useAuth();
  const { data, isLoading } = useQuery<BalanceResponse>({
    queryKey: ["balance"],
    queryFn: () => api.get("/api/account/balance").then((r) => r.data),
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isSignedIn === true,
  });
  return { balance: data?.balance, balanceCents: data?.balanceCents, isLoading };
}
