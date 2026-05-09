import { create } from "zustand";

export type ActiveFilter = "all" | "spread" | "total";

interface SportsState {
  activeSport: string;
  activeFilter: ActiveFilter;
  searchQuery: string;
  setActiveSport: (sport: string) => void;
  setActiveFilter: (filter: ActiveFilter) => void;
  setSearchQuery: (query: string) => void;
}

export const useSportsStore = create<SportsState>()((set) => ({
  activeSport: "NBA",
  activeFilter: "all",
  searchQuery: "",
  setActiveSport: (sport) => set({ activeSport: sport }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
