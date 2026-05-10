import { useState, useEffect } from "react";
import { usePrevious } from "./usePrevious.js";
import { useSportsStore } from "../stores/sportsStore.js";

export function usePriceFlash(currentValue: number | null): "up" | "down" | null {
  const previous = usePrevious(currentValue);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (previous === undefined || currentValue === null || previous === null) return;
    if (currentValue === previous) return;

    setFlash(currentValue > previous ? "up" : "down");
    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [currentValue, previous]);

  return flash;
}

export function useLineFlash(
  game_id: number,
  type: "spread" | "total",
  currentValue: number | null
): "up" | "down" | null {
  const previousLines = useSportsStore((s) => s.previousLines);
  const key = type === "spread" ? "spread_normalized" : "total_normalized";
  const previousValue = previousLines[game_id]?.[key] ?? null;

  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (currentValue === null || previousValue === null) return;
    if (currentValue === previousValue) return;
    // Spread 'up' = value decreased (easier for favorite to cover).
    // Total 'up' = value increased (line moved up numerically).
    const direction =
      type === "spread"
        ? currentValue < previousValue
          ? "up"
          : "down"
        : currentValue > previousValue
          ? "up"
          : "down";
    setFlash(direction);
    const timer = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(timer);
  }, [currentValue, previousValue]);

  return flash;
}
