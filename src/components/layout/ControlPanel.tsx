/**
 * Панель управления с фильтрами
 */

import { SymbolSelector, MarketSelector } from "@/components/ui";

interface ControlPanelProps {
  symbol: string;
  marketType: "spot" | "futures";
  onSymbolChange: (symbol: string) => void;
  onMarketTypeChange: (marketType: "spot" | "futures") => void;
}

export function ControlPanel({
  symbol,
  marketType,
  onSymbolChange,
  onMarketTypeChange,
}: ControlPanelProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SymbolSelector value={symbol} onChange={onSymbolChange} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип рынка
          </label>
          <MarketSelector value={marketType} onChange={onMarketTypeChange} />
        </div>
      </div>
    </div>
  );
}
