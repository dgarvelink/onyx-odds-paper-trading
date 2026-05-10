import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";
import { useBetSlipStore } from "../stores/betSlipStore.js";
import { toast } from "../lib/toast.js";

interface ParlayLegInput {
  game_id: number;
  betType: string;
  side: string;
  label: string;
  line: number;
  odds: number;
}

interface PlaceParlayInput {
  stake: number;
  legs: ParlayLegInput[];
}

export function usePlaceParlay() {
  const queryClient = useQueryClient();
  const { clearSlip, setMode } = useBetSlipStore();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (body: PlaceParlayInput) =>
      api.post("/api/parlays", body).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["parlays"] });
      clearSlip();
      setMode("single");
      toast.success("Parlay placed!");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to place parlay";
      toast.error(message);
    },
  });

  return { placeParlay: mutateAsync, isPending };
}
