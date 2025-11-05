"use client";

/**
 * Компонент таблицы для отображения order book данных
 */

import { useState, useEffect } from "react";

interface OrderBookData {
  type: string;
  symbol: string;
  timestamp: number;
  midPrice: number | null;
  spread: number | null;
  bestBid: { price: number; volume: number } | null;
  bestAsk: { price: number; volume: number } | null;
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
  depthVolumes: Array<{
    depth: number;
    bidVolume: number;
    askVolume: number;
    totalBidValue: number;
    totalAskValue: number;
  }>;
  diffs: Array<{
    depth: number;
    diff: number;
    bidVolume: number;
    askVolume: number;
    percentage: number;
  }>;
  wsStatus: string;
}

interface OrderBookTableProps {
  marketType: "spot" | "futures";
  symbol: string;
  refreshInterval?: number;
}

export default function OrderBookTable({
  marketType,
  symbol,
  refreshInterval = 1000,
}: OrderBookTableProps) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Извлекаем базовую валюту из символа (например, BTC из BTCUSDT)
  const getBaseCurrency = (symbol: string): string => {
    // Удаляем известные quote валюты
    const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB'];
    for (const quote of quoteCurrencies) {
      if (symbol.endsWith(quote)) {
        return symbol.slice(0, -quote.length);
      }
    }
    return symbol;
  };

  const baseCurrency = getBaseCurrency(symbol);

  useEffect(() => {
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

    return () => clearInterval(interval);
  }, [marketType, symbol, refreshInterval]);

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

  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);

  // Определяем цвет и текст статуса
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "connected":
        return {
          color: "bg-green-500",
          text: "Подключено",
          textColor: "text-green-700",
        };
      case "connecting":
        return {
          color: "bg-yellow-500",
          text: "Подключение...",
          textColor: "text-yellow-700",
        };
      case "disconnected":
        return {
          color: "bg-gray-500",
          text: "Отключено",
          textColor: "text-gray-700",
        };
      case "error":
        return {
          color: "bg-red-500",
          text: "Ошибка",
          textColor: "text-red-700",
        };
      default:
        return {
          color: "bg-gray-500",
          text: "Неизвестно",
          textColor: "text-gray-700",
        };
    }
  };

  const statusDisplay = getStatusDisplay(data.wsStatus);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold">
            {data.symbol} - {data.type}
          </h2>
          {/* Индикатор статуса WebSocket */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${statusDisplay.color} ${
                data.wsStatus === "connected" ? "animate-pulse" : ""
              }`}
            ></div>
            <span className={`text-sm font-medium ${statusDisplay.textColor}`}>
              {statusDisplay.text}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Mid Price</div>
            <div className="font-mono text-lg">
              {data.midPrice ? `$${data.midPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Spread</div>
            <div className="font-mono text-lg">
              {data.spread ? `$${data.spread.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Best Bid</div>
            <div className="font-mono text-lg">
              {data.bestBid ? `$${data.bestBid.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Best Ask</div>
            <div className="font-mono text-lg">
              {data.bestAsk ? `$${data.bestAsk.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица глубин */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Объемы на глубинах</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Глубина (%)</th>
                <th className="px-4 py-2 border text-green-700">BID Объем</th>
                <th className="px-4 py-2 border text-red-700">ASK Объем</th>
                <th className="px-4 py-2 border">DIFF</th>
                <th className="px-4 py-2 border">DIFF %</th>
                <th className="px-4 py-2 border">Delta (Bid/Ask)</th>
              </tr>
            </thead>
            <tbody>
              {data.depthVolumes.map((dv, index) => {
                const diff = data.diffs[index];
                const isBullish = diff.diff > 0;
                const delta = dv.askVolume !== 0 ? dv.bidVolume / dv.askVolume : 0;

                return (
                  <tr key={dv.depth} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-center font-semibold">
                      {dv.depth}%
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-green-700">
                      {dv.bidVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrency}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-red-700">
                      {dv.askVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrency}
                    </td>
                    <td
                      className={`px-4 py-2 border text-right font-mono ${
                        isBullish ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {diff.diff > 0 ? "+" : ""}
                      {diff.diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {baseCurrency}
                    </td>
                    <td
                      className={`px-4 py-2 border text-right font-mono ${
                        isBullish ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {diff.percentage > 0 ? "+" : ""}
                      {diff.percentage.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-blue-700">
                      {delta.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Топ ордеров */}
      {/* Топ ордеров */}
      <div>
        <h3 className="text-xl font-semibold mb-3 text-gray-800">
          Топ ордеров (Bids / Asks)
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border text-green-700">Цена (Bids)</th>
                <th className="px-4 py-2 border text-green-700">
                  Объем (Bids)
                </th>
                <th className="px-4 py-2 border text-red-700">Цена (Asks)</th>
                <th className="px-4 py-2 border text-red-700">Объем (Asks)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({
                length: Math.max(data.bids.length, data.asks.length),
              })
                .slice(0, 10)
                .map((_, i) => {
                  const bid = data.bids[i];
                  const ask = data.asks[i];
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      {/* Bids */}
                      <td className="px-4 py-2 border text-right font-mono text-green-700">
                        {bid ? `$${bid.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "-"}
                      </td>
                      <td className="px-4 py-2 border text-right font-mono text-green-700">
                        {bid ? `${bid.volume.toFixed(8)} ${baseCurrency}` : "-"}
                      </td>

                      {/* Asks */}
                      <td className="px-4 py-2 border text-right font-mono text-red-700">
                        {ask ? `$${ask.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}` : "-"}
                      </td>
                      <td className="px-4 py-2 border text-right font-mono text-red-700">
                        {ask ? `${ask.volume.toFixed(8)} ${baseCurrency}` : "-"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
