import { useSportsStore } from "../stores/sportsStore.js";
import { useSports } from "../hooks/useSports.js";

const FALLBACK_SPORTS = ["NBA", "CBB"];

export function SportsTabs() {
  const { activeSport, setActiveSport } = useSportsStore();
  const { sports, isLoading } = useSports();

  const sportNames = sports.length > 0 ? sports.map((s) => s.sport) : FALLBACK_SPORTS;

  if (isLoading && sports.length === 0) {
    return (
      <div className="flex gap-2 border-b border-zinc-800 px-4 py-2">
        {FALLBACK_SPORTS.map((s) => (
          <div key={s} className="h-8 w-14 animate-pulse rounded bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-2">
      {sportNames.map((sport) => (
        <button
          key={sport}
          onClick={() => setActiveSport(sport)}
          className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
            activeSport === sport
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {sport}
        </button>
      ))}
    </div>
  );
}
