import { create } from "zustand";

export type ActiveFilter = "all" | "spread" | "total";

interface SportsState {
  activeFilter: ActiveFilter;
  searchQuery: string;
  setActiveFilter: (filter: ActiveFilter) => void;
  setSearchQuery: (query: string) => void;
}

export const useSportsStore = create<SportsState>()((set) => ({
  activeFilter: "all",
  searchQuery: "",
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
