import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export interface EnrichedPosition {
  id: string;
  symbol: string;
  betType: string;
  side: string;
  quantity: number;
  stakeCents: number;
  toWinCents: number;
  label: string;
  line: number;
  odds: number;
  game_id: number;
  status: string;
  updatedAt: string;
}

export function usePositions() {
  const { data, isLoading, isError } = useQuery<EnrichedPosition[]>({
    queryKey: ["positions"],
    queryFn: () => api.get("/api/account/positions").then((r) => r.data),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  return { positions: data ?? [], isLoading, isError };
}
