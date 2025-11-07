"use client";

/**
 * Dashboard страница для отображения order book данных
 */

import { useState } from "react";
import OrderBookTable from "@/components/orderbook/OrderBookTable";
import OrderBookRestTable from "@/components/orderbook/OrderBookRestTable";
import Navigation from "@/components/layout/Navigation";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");

  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-8">
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

        {/* Таблица данных WebSocket */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">WebSocket данные (режим реального времени)</h2>
          <OrderBookTable
            key={`${symbol}-${marketType}`}
            marketType={marketType}
            symbol={symbol}
            refreshInterval={300}
          />
        </div>

        {/* Таблица данных REST API */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-purple-600">REST API данные (обновление каждую минуту)</h2>
          <OrderBookRestTable
            key={`rest-${symbol}-${marketType}`}
            marketType={marketType}
            symbol={symbol}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
