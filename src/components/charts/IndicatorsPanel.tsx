"use client";

/**
 * Панель управления индикаторами BID/ASK
 */

interface IndicatorsPanelProps {
  enabledIndicators: {
    bid: { [key: string]: boolean };
    ask: { [key: string]: boolean };
  };
  onToggle: (type: "bid" | "ask", depth: string) => void;
}

const DEPTHS = ["1.5", "3", "5", "8", "15", "30"];

// Цветовые индикаторы для визуализации
const INDICATOR_COLORS = {
  bid: {
    "1.5": "#90EE90",
    "3": "#00C853",
    "5": "#00897B",
    "8": "#00ACC1",
    "15": "#1976D2",
    "30": "#0D47A1",
  },
  ask: {
    "1.5": "#FFCDD2",
    "3": "#EF5350",
    "5": "#D32F2F",
    "8": "#FF6F00",
    "15": "#F57C00",
    "30": "#E65100",
  },
};

export default function IndicatorsPanel({
  enabledIndicators,
  onToggle,
}: IndicatorsPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 w-64">
      <h3 className="text-lg font-bold mb-4 text-gray-800">
        Индикаторы глубины
      </h3>

      {/* BID индикаторы */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-green-700 mb-2">
          BID (Покупка)
        </h4>
        <div className="space-y-2">
          {DEPTHS.map((depth) => (
            <label
              key={`bid-${depth}`}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={enabledIndicators.bid[depth] || false}
                onChange={() => onToggle("bid", depth)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div
                className="w-4 h-4 rounded"
                style={{
                  backgroundColor:
                    INDICATOR_COLORS.bid[
                      depth as keyof typeof INDICATOR_COLORS.bid
                    ],
                }}
              ></div>
              <span className="text-sm text-gray-700">BID {depth}%</span>
            </label>
          ))}
        </div>
      </div>

      {/* ASK индикаторы */}
      <div>
        <h4 className="text-sm font-semibold text-red-700 mb-2">
          ASK (Продажа)
        </h4>
        <div className="space-y-2">
          {DEPTHS.map((depth) => (
            <label
              key={`ask-${depth}`}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={enabledIndicators.ask[depth] || false}
                onChange={() => onToggle("ask", depth)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <div
                className="w-4 h-4 rounded"
                style={{
                  backgroundColor:
                    INDICATOR_COLORS.ask[
                      depth as keyof typeof INDICATOR_COLORS.ask
                    ],
                }}
              ></div>
              <span className="text-sm text-gray-700">ASK {depth}%</span>
            </label>
          ))}
        </div>
      </div>

      {/* Кнопки управления */}
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={() => {
            DEPTHS.forEach((depth) => {
              onToggle("bid", depth);
            });
          }}
          className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
        >
          Включить все BID
        </button>
        <button
          type="button"
          onClick={() => {
            DEPTHS.forEach((depth) => {
              onToggle("ask", depth);
            });
          }}
          className="w-full px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Включить все ASK
        </button>
      </div>
    </div>
  );
}
