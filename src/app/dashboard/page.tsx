"use client";

/**
 * Dashboard страница для отображения order book данных
 */

import { useState } from "react";
import OrderBookTable from "@/components/orderbook/OrderBookTable";
import OrderBookRestTable from "@/components/orderbook/OrderBookRestTable";
import Navigation from "@/components/layout/Navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ControlPanel } from "@/components/layout/ControlPanel";
import { Section } from "@/components/layout/Section";
import { TRADING_SYMBOLS } from "@/shared/constants/trading";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<string>(TRADING_SYMBOLS[0]);
  const [marketType, setMarketType] = useState<"spot" | "futures">("spot");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
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
    </div>
  );
}
