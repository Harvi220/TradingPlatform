"use client";

/**
 * Компонент таблицы для отображения order book данных
 */

import { useState, useEffect } from "react";
import { OrderBookData } from "@/shared/types/orderbook.types";
import { WS_REFRESH_INTERVAL } from "@/shared/constants/intervals";
import { getBaseCurrency } from "@/shared/utils";
import { OrderBookHeader, DepthVolumesTable, TopOrdersTable } from "./components";

interface OrderBookTableProps {
  marketType: "spot" | "futures";
  symbol: string;
  refreshInterval?: number;
}

export default function OrderBookTable({
  marketType,
  symbol,
  refreshInterval = WS_REFRESH_INTERVAL,
}: OrderBookTableProps) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const baseCurrency = getBaseCurrency(symbol);

  useEffect(() => {
    // Сбрасываем состояние при смене символа или рынка
    setLoading(true);
    setError(null);
    setData(null);

    const fetchData = async () => {
      try {
        const response = await fetch(
          `/api/binance/${marketType}?symbol=${symbol}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();

        if (json.error) {
          throw new Error(json.message);
        }

        setData(json);
        setLastUpdate(Date.now());
        setError(null);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    // Первоначальная загрузка
    fetchData();

    // Периодическое обновление
    const interval = setInterval(fetchData, refreshInterval);

    // Cleanup: очищаем interval при размонтировании или смене зависимостей
    return () => {
      clearInterval(interval);
    };
  }, [marketType, symbol, refreshInterval]);

  // Отправка снапшотов в API для графиков
  useEffect(() => {
    if (!data || !data.depthVolumes) {
      return;
    }

    const sendSnapshots = async () => {
      try {
        // Формируем снапшоты для всех глубин
        const snapshots = data.depthVolumes.map(dv => ({
          timestamp: data.timestamp,
          symbol: data.symbol,
          marketType: (data.type?.toUpperCase() || marketType.toUpperCase()) as 'SPOT' | 'FUTURES',
          depth: dv.depth,
          bidVolume: dv.bidVolume,
          askVolume: dv.askVolume,
          bidVolumeUsd: dv.totalBidValue,
          askVolumeUsd: dv.totalAskValue,
        }));

        console.log(`[OrderBook] Sending snapshots for ${data.symbol} ${data.type}:`, snapshots.length);

        // Отправляем снапшоты
        const response = await fetch('/api/snapshots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(snapshots),
        });

        if (!response.ok) {
          console.error('[OrderBook] Failed to send snapshots:', response.status);
        } else {
          const result = await response.json();
          console.log('[OrderBook] Snapshots saved:', result);
        }
      } catch (error) {
        console.error('[OrderBook] Error sending snapshots:', error);
      }
    };

    // Отправляем снапшоты при каждом обновлении данных
    sendSnapshots();
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Ошибка:</strong> {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <OrderBookHeader
        symbol={data.symbol}
        type={data.type}
        timestamp={data.timestamp}
        midPrice={data.midPrice}
        spread={data.spread}
        bestBid={data.bestBid}
        bestAsk={data.bestAsk}
        wsStatus={data.wsStatus}
        lastUpdate={lastUpdate}
      />

      <DepthVolumesTable
        depthVolumes={data.depthVolumes}
        diffs={data.diffs}
        baseCurrency={baseCurrency}
      />

      <TopOrdersTable
        bids={data.bids}
        asks={data.asks}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
