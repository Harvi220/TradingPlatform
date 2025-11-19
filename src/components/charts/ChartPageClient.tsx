"use client";

/**
 * Клиентский компонент для управления состоянием страницы Charts
 * Отвечает за интерактивность и состояние фильтров/индикаторов
 */

import { useState, useEffect } from "react";
import TradingViewWidget from "@/components/charts/TradingViewWidget";
import ChartsControlPanel from "@/components/charts/ChartsControlPanel";
import ChartSection from "@/components/charts/ChartSection";
import { TRADING_SYMBOLS } from "@/shared/constants/trading";
import { DATA_COLLECTION_INTERVAL } from "@/shared/constants/intervals";

export default function ChartPageClient() {
  const [symbol, setSymbol] = useState<string>(TRADING_SYMBOLS[0]);
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");

  // Состояние для индикаторов
  const [enabledIndicators, setEnabledIndicators] = useState<{
    bid: { [key: string]: boolean };
    ask: { [key: string]: boolean };
  }>({
    bid: {
      "1.5": false,
      "3": true, // По умолчанию включен BID 3%
      "5": false,
      "8": false,
      "15": false,
      "30": false,
    },
    ask: {
      "1.5": false,
      "3": true, // По умолчанию включен ASK 3%
      "5": false,
      "8": false,
      "15": false,
      "30": false,
    },
  });

  // Обработчик переключения индикаторов
  const handleToggleIndicator = (type: "bid" | "ask", depth: string) => {
    setEnabledIndicators((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [depth]: !prev[type][depth],
      },
    }));
  };

  // Автоматический запуск сбора данных для графиков bid/ask с регулярным опросом
  useEffect(() => {
    const endpoint =
      marketType === "spot"
        ? `/api/binance/spot?symbol=${symbol}`
        : `/api/binance/futures?symbol=${symbol}`;

    const pollDataCollection = async () => {
      try {
        // Вызываем API для сохранения снэпшотов
        const response = await fetch(endpoint);

        if (!response.ok && response.status !== 503) {
          console.warn(`[Charts] Data collection error:`, response.status);
        }
      } catch (error) {
        console.error("[Charts] Error polling data collection:", error);
      }
    };

    // Запускаем сразу
    pollDataCollection();

    // Опрашиваем каждую секунду для сохранения снэпшотов
    const intervalId = setInterval(
      pollDataCollection,
      DATA_COLLECTION_INTERVAL
    );

    return () => {
      clearInterval(intervalId);
    };
  }, [symbol, marketType]);

  return (
    <div className="p-6">
      <div className="max-w-full mx-auto px-4">
        <ChartsControlPanel
          symbol={symbol}
          marketType={marketType}
          onSymbolChange={setSymbol}
          onMarketTypeChange={setMarketType}
        />

        <TradingViewWidget symbol={symbol} marketType={marketType} />

        <ChartSection
          symbol={symbol}
          marketType={marketType}
          enabledIndicators={enabledIndicators}
          onToggleIndicator={handleToggleIndicator}
        />
      </div>
    </div>
  );
}
