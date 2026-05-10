import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";
import type { BetSelection } from "../stores/betSlipStore.js";
import { toast } from "../lib/toast.js";

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (selection: BetSelection) =>
      api
        .post("/api/orders", {
          game_id: selection.game_id,
          betType: selection.betType,
          side: selection.side,
          label: selection.label,
          line: selection.line,
          stake: selection.stake,
          odds: selection.odds,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: unknown) => {
      const message =
        (
          err as {
            response?: { data?: { message?: string } };
          }
        )?.response?.data?.message ?? "Failed to place bet";
      toast.error(message);
    },
  });

  return { placeOrder: mutateAsync, isPending };
}
