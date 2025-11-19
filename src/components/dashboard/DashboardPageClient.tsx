"use client";

/**
 * Клиентский компонент для управления состоянием страницы Dashboard
 * Отвечает за интерактивность и состояние фильтров
 */

import { useState } from "react";
import OrderBookTable from "@/components/orderbook/OrderBookTable";
import OrderBookRestTable from "@/components/orderbook/OrderBookRestTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { ControlPanel } from "@/components/layout/ControlPanel";
import { Section } from "@/components/layout/Section";
import { TRADING_SYMBOLS } from "@/shared/constants/trading";

export default function DashboardPageClient() {
  const [symbol, setSymbol] = useState<string>(TRADING_SYMBOLS[0]);
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Dashboard"
          description="Мониторинг стакана ордеров Binance в реальном времени"
        />

        <ControlPanel
          symbol={symbol}
          marketType={marketType}
          onSymbolChange={setSymbol}
          onMarketTypeChange={setMarketType}
        />

        <Section
          title="WebSocket данные (режим реального времени)"
          titleColor="text-blue-600"
          className="mb-8"
        >
          <OrderBookTable
            key={`${symbol}-${marketType}`}
            marketType={marketType}
            symbol={symbol}
            refreshInterval={300}
          />
        </Section>

        <Section
          title="REST API данные (обновление каждую минуту)"
          titleColor="text-purple-600"
        >
          <OrderBookRestTable
            key={`rest-${symbol}-${marketType}`}
            marketType={marketType}
            symbol={symbol}
          />
        </Section>
      </div>
    </div>
  );
}
