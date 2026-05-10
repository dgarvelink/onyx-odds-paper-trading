export type SettlementResult = "WON" | "LOST" | "PUSH";

export function calculateSpreadResult(
  homeScore: number,
  awayScore: number,
  spread: number,
  side: "home" | "away"
): SettlementResult {
  const margin = homeScore - awayScore;
  if (margin === spread) return "PUSH";
  const homeCovered = margin > spread;
  return (side === "home" ? homeCovered : !homeCovered) ? "WON" : "LOST";
}

export function calculateTotalResult(
  homeScore: number,
  awayScore: number,
  total: number,
  side: "over" | "under"
): SettlementResult {
  const combined = homeScore + awayScore;
  if (combined === total) return "PUSH";
  return (side === "over" ? combined > total : combined < total) ? "WON" : "LOST";
}

export function calculatePayout(
  stakeCents: number,
  toWinCents: number,
  result: SettlementResult
): number {
  if (result === "WON") return stakeCents + toWinCents;
  if (result === "PUSH") return stakeCents;
  return 0;
}
