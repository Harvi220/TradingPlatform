"use client";

/**
 * Секция с индикаторами BID/ASK
 */

import LightweightChart from "./LightweightChart";
import IndicatorsPanel from "./IndicatorsPanel";
import { EnabledIndicators } from "@/shared/types/chart.types";

interface ChartSectionProps {
  symbol: string;
  marketType: "spot" | "futures";
  enabledIndicators: EnabledIndicators;
  onToggleIndicator: (type: "bid" | "ask", depth: string) => void;
}

export default function ChartSection({
  symbol,
  marketType,
  enabledIndicators,
  onToggleIndicator,
}: ChartSectionProps) {
  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Индикаторы глубины BID/ASK
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Исторические данные объемов на разных глубинах рынка
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-4">
          {/* График */}
          <div className="flex-1">
            <LightweightChart
              symbol={symbol}
              marketType={marketType}
              enabledIndicators={enabledIndicators}
            />
          </div>

          {/* Панель управления индикаторами */}
          <div>
            <IndicatorsPanel
              enabledIndicators={enabledIndicators}
              onToggle={onToggleIndicator}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
