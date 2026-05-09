import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSportsStore } from "../stores/sportsStore.js";

export function SearchBar() {
  const { searchQuery, setSearchQuery } = useSportsStore();
  const [localValue, setLocalValue] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(localValue), 200);
    return () => clearTimeout(timer);
  }, [localValue, setSearchQuery]);

  return (
    <div className="relative">
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search teams..."
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue("");
            setSearchQuery("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
