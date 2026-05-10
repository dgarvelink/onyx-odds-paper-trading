import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export interface ParlayLeg {
  id: string;
  game_id: number;
  betType: string;
  side: string;
  label: string;
  line: number;
  odds: number;
  status: string;
}

export interface Parlay {
  id: string;
  status: string;
  stakeCents: number;
  toWinCents: number;
  parlayOdds: number;
  createdAt: string;
  legs: ParlayLeg[];
  settlement: { result: string; payout: number; settledAt: string } | null;
}

export function useParlays() {
  const { data, isLoading } = useQuery<Parlay[]>({
    queryKey: ["parlays"],
    queryFn: () => api.get("/api/parlays").then((r) => r.data),
    staleTime: 10000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  return { parlays: data ?? [], isLoading };
}
