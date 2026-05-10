import { create } from "zustand";

export type BetSelection = {
  id: string;
  game_id: number;
  betType: "spread" | "total";
  side: "home" | "away" | "over" | "under";
  label: string;
  line: number;
  odds: number;
  stake: number;
};

interface BetSlipState {
  selections: BetSelection[];
  mode: "single" | "parlay";
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  updateStake: (id: string, stake: number) => void;
  clearSlip: () => void;
  toggleSelection: (selection: BetSelection) => void;
  setMode: (mode: "single" | "parlay") => void;
}

export const useBetSlipStore = create<BetSlipState>()((set) => ({
  selections: [],
  mode: "single",
  setMode: (mode) => set({ mode }),
  addSelection: (selection) =>
    set((state) => ({ selections: [...state.selections, selection] })),
  removeSelection: (id) =>
    set((state) => ({ selections: state.selections.filter((s) => s.id !== id) })),
  updateStake: (id, stake) =>
    set((state) => ({
      selections: state.selections.map((s) => (s.id === id ? { ...s, stake } : s)),
    })),
  clearSlip: () => set({ selections: [] }),
  toggleSelection: (selection) =>
    set((state) => {
      const exists = state.selections.some((s) => s.id === selection.id);
      return {
        selections: exists
          ? state.selections.filter((s) => s.id !== selection.id)
          : [...state.selections, selection],
      };
    }),
}));
