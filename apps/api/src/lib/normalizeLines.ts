function clampOdds(odds: number): number {
  return Math.min(-100, Math.max(-125, odds));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGame(game: any): any {
  let spread_normalized: number | null = null;
  let spread_home_odds: number | null = null;
  let spread_away_odds: number | null = null;

  if (game.spread !== null && game.spread !== undefined) {
    spread_normalized = Math.round(game.spread * 2) / 2;
    const lineDelta = spread_normalized - game.spread;
    const adj = Math.round(lineDelta * 10);
    spread_home_odds = clampOdds(-110 + adj);
    spread_away_odds = clampOdds(-110 - adj);
  }

  let total_normalized: number | null = null;
  let total_over_odds: number | null = null;
  let total_under_odds: number | null = null;

  if (game.over_under !== null && game.over_under !== undefined) {
    total_normalized = Math.round(game.over_under * 2) / 2;
    const totalDelta = total_normalized - game.over_under;
    const adj = Math.round(totalDelta * 10);
    total_over_odds = clampOdds(-110 + adj);
    total_under_odds = clampOdds(-110 - adj);
  }

  return {
    ...game,
    spread_normalized,
    spread_home_odds,
    spread_away_odds,
    total_normalized,
    total_over_odds,
    total_under_odds,
  };
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}
