import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export interface Order {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  fillPrice: number;
  status: string;
  metadata: {
    game_id?: number;
    betType?: string;
    label?: string;
    line?: number;
    odds?: number;
    toWinCents?: number;
  };
  settlements?: { result: string; payout: number; settledAt: string } | null;
  createdAt: string;
}

export function useOrders() {
  const { data, isLoading, isError } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => api.get("/api/account/orders").then((r) => r.data),
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  return { orders: data ?? [], isLoading, isError };
}
