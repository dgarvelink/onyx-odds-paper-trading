import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

interface Sport {
  sport: string;
  count: number;
}

export function useSports() {
  const { data, isLoading } = useQuery({
    queryKey: ["sports"],
    queryFn: async () => {
      const res = await api.get<Sport[]>("/api/onyx/sports");
      return res.data;
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: 2,
  });

  return { sports: data ?? [], isLoading };
}
