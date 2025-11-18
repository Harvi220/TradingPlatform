/**
 * Селектор торговой пары
 */

import { TRADING_SYMBOLS } from "@/shared/constants/trading";

interface SymbolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function SymbolSelector({ value, onChange, label = "Торговая пара" }: SymbolSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {TRADING_SYMBOLS.map((symbol) => (
          <option key={symbol} value={symbol}>
            {symbol}
          </option>
        ))}
      </select>
    </div>
  );
}
