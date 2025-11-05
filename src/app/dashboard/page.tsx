"use client";

/**
 * Dashboard страница для отображения order book данных
 */

import { useState } from "react";
import OrderBookTable from "@/components/orderbook/OrderBookTable";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");

  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trading Platform Dashboard
          </h1>
          <p className="text-gray-600">
            Мониторинг стакана ордеров Binance в реальном времени
          </p>
        </div>

        {/* Фильтры */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Выбор символа */}
            <div>
              <h2 className="block text-sm font-medium text-gray-700 mb-2">
                Торговая пара
              </h2>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Выбор типа рынка */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип рынка
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setMarketType("spot")}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    marketType === "spot"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  SPOT
                </button>

                <button
                  type="button"
                  onClick={() => setMarketType("futures")}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
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

        {/* Таблица данных */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <OrderBookTable
            marketType={marketType}
            symbol={symbol}
            refreshInterval={1000}
          />
        </div>
      </div>
    </div>
  );
}
