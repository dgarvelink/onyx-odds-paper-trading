import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export interface Game {
  game_id: number;
  status: string;
  datetime_utc: string;
  channel: string | null;
  away_score: number | null;
  home_score: number | null;
  quarter: string | null;
  time_remaining_min: number | null;
  away_key: string;
  away_city: string;
  away_name: string;
  away_logo: string;
  away_color: string;
  home_key: string;
  home_city: string;
  home_name: string;
  home_logo: string;
  home_color: string;
  spread: number | null;
  over_under: number | null;
}

export function useGames() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await api.get<{ games: Game[] }>("/api/onyx/sportsdata/games");
      return res.data.games ?? [];
    },
    refetchInterval: 30000,
    staleTime: 25000,
    retry: 2,
  });

  return { games: data ?? [], isLoading, isError };
}
