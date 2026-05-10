import { create } from "zustand";
import type { Game } from "../hooks/useGames.js";

export type ActiveFilter = "all" | "spread" | "total";

interface SportsState {
  activeFilter: ActiveFilter;
  searchQuery: string;
  previousLines: Record<number, {
    spread_normalized: number | null;
    total_normalized: number | null;
  }>;
  setActiveFilter: (filter: ActiveFilter) => void;
  setSearchQuery: (query: string) => void;
  updatePreviousLines: (staleGames: Game[]) => void;
}

export const useSportsStore = create<SportsState>()((set) => ({
  activeFilter: "all",
  searchQuery: "",
  previousLines: {},
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  updatePreviousLines: (staleGames) =>
    set((state) => {
      const updated = { ...state.previousLines };
      let changed = false;
      for (const g of staleGames) {
        const prev = state.previousLines[g.game_id];
        if (
          !prev ||
          prev.spread_normalized !== g.spread_normalized ||
          prev.total_normalized !== g.total_normalized
        ) {
          updated[g.game_id] = {
            spread_normalized: g.spread_normalized,
            total_normalized: g.total_normalized,
          };
          changed = true;
        }
      }
      return changed ? { previousLines: updated } : state;
    }),
}));
