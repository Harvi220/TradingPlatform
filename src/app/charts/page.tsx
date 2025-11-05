"use client";

/**
 * Charts страница с визуализацией данных через TradingView
 */

import { useEffect, useRef, useState } from "react";
import Navigation from "@/components/layout/Navigation";

export default function ChartsPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Очищаем контейнер перед добавлением нового виджета
    const container = chartContainerRef.current;
    container.innerHTML = "";

    // Небольшая задержка для корректной очистки предыдущего виджета
    const timeoutId = setTimeout(() => {
      // Создаем контейнер для виджета
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "100%";
      widgetContainer.style.width = "100%";

      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      widgetDiv.style.height = "calc(100% - 32px)";
      widgetDiv.style.width = "100%";

      widgetContainer.appendChild(widgetDiv);

      // Создаем скрипт для виджета
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;

      // Формируем символ для TradingView
      const tvSymbol =
        marketType === "spot" ? `BINANCE:${symbol}` : `BINANCE:${symbol}.P`;

      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        // Настройка для индикаторов в отдельных панелях
        container_id: "tradingview_chart",
        // Включаем панель с индикаторами и инструментами
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        details: true,
        hotlist: true,
        calendar: false,
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        support_host: "https://www.tradingview.com",
      });

      widgetContainer.appendChild(script);

      // Добавляем copyright
      const copyright = document.createElement("div");
      copyright.className = "tradingview-widget-copyright";
      copyright.innerHTML = `
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span class="blue-text">Track all markets on TradingView</span>
        </a>
      `;
      widgetContainer.appendChild(copyright);

      if (container) {
        container.appendChild(widgetContainer);
      }
    }, 100);

    // Cleanup функция
    return () => {
      clearTimeout(timeoutId);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, marketType]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-6">
        <div className="max-w-full mx-auto px-4">
          {/* Компактный заголовок и фильтры в одну линию */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Trading Charts
                </h1>
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
                    onChange={(e) => setSymbol(e.target.value)}
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
                      onClick={() => setMarketType("spot")}
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
                      onClick={() => setMarketType("futures")}
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

          {/* График - увеличенная высота */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div
              ref={chartContainerRef}
              style={{ height: "calc(100vh - 180px)", width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
