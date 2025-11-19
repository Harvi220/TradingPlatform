/**
 * Панель управления для страницы графиков
 * Серверный компонент - интерактивность через props
 */

import { TRADING_SYMBOLS } from "@/shared/constants/trading";

interface ChartsControlPanelProps {
  symbol: string;
  marketType: "spot" | "futures";
  onSymbolChange: (symbol: string) => void;
  onMarketTypeChange: (marketType: "spot" | "futures") => void;
}

export default function ChartsControlPanel({
  symbol,
  marketType,
  onSymbolChange,
  onMarketTypeChange,
}: ChartsControlPanelProps) {
  const symbols: string[] = [...TRADING_SYMBOLS];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Charts</h1>
        </div>

        {/* Фильтры справа */}
        <div className="flex items-center gap-6">
          {/* Выбор символа */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Торговая пара:
            </label>
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Выбор типа рынка */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Тип рынка:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onMarketTypeChange("spot")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  marketType === "spot"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                SPOT
              </button>

              <button
                type="button"
                onClick={() => onMarketTypeChange("futures")}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  marketType === "futures"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                FUTURES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
