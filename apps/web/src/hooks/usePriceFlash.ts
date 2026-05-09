import { useState, useEffect } from "react";
import { usePrevious } from "./usePrevious.js";

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
