export function americanToDecimal(odds: number): number {
  if (odds <= -100) return 1 + 100 / Math.abs(odds);
  return 1 + odds / 100;
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function calculateParlayOdds(legOdds: number[]): number {
  const combined = legOdds.reduce((acc, o) => acc * americanToDecimal(o), 1);
  return decimalToAmerican(combined);
}

export function calculateParlayToWin(stakeCents: number, parlayOdds: number): number {
  if (parlayOdds > 0) return Math.floor((stakeCents * parlayOdds) / 100);
  return Math.floor((stakeCents * 100) / Math.abs(parlayOdds));
}

export function validateParlayLegs(
  legs: Array<{ game_id: number; betType: string; side: string }>
): { valid: boolean; error?: string } {
  if (legs.length < 2) return { valid: false, error: "Parlays require at least 2 legs" };
  if (legs.length > 8) return { valid: false, error: "Maximum 8 legs per parlay" };
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      const a = legs[i], b = legs[j];
      if (a.game_id === b.game_id && a.betType === b.betType && a.side !== b.side)
        return { valid: false, error: "Cannot bet both sides of the same market" };
    }
  }
  return { valid: true };
}
