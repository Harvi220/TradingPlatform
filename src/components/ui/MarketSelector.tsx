/**
 * Селектор типа рынка (Spot/Futures)
 */

interface MarketSelectorProps {
  value: "spot" | "futures";
  onChange: (value: "spot" | "futures") => void;
}

export function MarketSelector({ value, onChange }: MarketSelectorProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("spot")}
        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
          value === "spot"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        SPOT
      </button>
      <button
        type="button"
        onClick={() => onChange("futures")}
        className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
          value === "futures"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        FUTURES
      </button>
    </div>
  );
}
