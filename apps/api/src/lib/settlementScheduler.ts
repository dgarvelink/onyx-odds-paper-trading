import { runAutoSettlement } from "./autoSettle.js";

export function startSettlementScheduler(): void {
  setTimeout(() => runAutoSettlement(), 10_000);
  setInterval(async () => {
    try {
      const result = await runAutoSettlement();
      if (result.settled > 0) console.log("[Settlement]", result);
    } catch (err) {
      console.error("[Settlement] Scheduler error:", err);
    }
  }, 60_000);
}
