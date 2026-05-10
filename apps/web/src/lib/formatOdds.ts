export function formatOdds(odds: number | null): string {
  if (odds === null) return "-110";
  return odds > 0 ? `+${odds}` : `${odds}`;
}
