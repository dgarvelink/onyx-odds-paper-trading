import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";
import { useSportsStore } from "../stores/sportsStore.js";

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
  spread_normalized: number | null;
  spread_home_odds: number | null;
  spread_away_odds: number | null;
  total_normalized: number | null;
  total_over_odds: number | null;
  total_under_odds: number | null;
}

export function useGames() {
  const queryClient = useQueryClient();
  const [refetchInterval, setRefetchInterval] = useState(30000);

  const query = useQuery({
    queryKey: ["games"],
    queryFn: async () => {
      const res = await api.get<{ games: Game[] }>("/api/onyx/sportsdata/games");
      const newGames = res.data.games ?? [];

      // Snapshot the about-to-be-replaced cache as "previous lines" for flash detection.
      // On the very first fetch staleGames is empty; seed previousLines with newGames so
      // the second fetch has a baseline to compare against.
      const staleGames = queryClient.getQueryData<Game[]>(["games"]) ?? [];
      if (staleGames.length > 0) {
        useSportsStore.getState().updatePreviousLines(staleGames);
      } else {
        useSportsStore.getState().updatePreviousLines(newGames);
      }

      return newGames;
    },
    refetchInterval,
    staleTime: refetchInterval - 2000,
    retry: 2,
  });

  useEffect(() => {
    if (!query.data) return;
    const hasLive = query.data.some((g) => g.status === "InProgress");
    setRefetchInterval(hasLive ? 10000 : 30000);
  }, [query.data]);

  return { games: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}
