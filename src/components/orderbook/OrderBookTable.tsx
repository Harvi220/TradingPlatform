'use client';

/**
 * Компонент таблицы для отображения order book данных
 */

import { useState, useEffect } from 'react';

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
}

interface OrderBookTableProps {
  marketType: 'spot' | 'futures';
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/binance/${marketType}?symbol=${symbol}`);

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
        setError(err instanceof Error ? err.message : 'Unknown error');
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

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">
          {data.symbol} - {data.type}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Mid Price</div>
            <div className="font-mono text-lg">
              {data.midPrice?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Spread</div>
            <div className="font-mono text-lg">
              {data.spread?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Best Bid</div>
            <div className="font-mono text-lg">
              {data.bestBid?.price.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Best Ask</div>
            <div className="font-mono text-lg">
              {data.bestAsk?.price.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Обновлено {timeSinceUpdate}с назад
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
                <th className="px-4 py-2 border">Тренд</th>
              </tr>
            </thead>
            <tbody>
              {data.depthVolumes.map((dv, index) => {
                const diff = data.diffs[index];
                const isBullish = diff.diff > 0;

                return (
                  <tr key={dv.depth} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-center font-semibold">
                      {dv.depth}%
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-green-700">
                      {dv.bidVolume.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-red-700">
                      {dv.askVolume.toFixed(4)}
                    </td>
                    <td className={`px-4 py-2 border text-right font-mono ${
                      isBullish ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {diff.diff > 0 ? '+' : ''}{diff.diff.toFixed(4)}
                    </td>
                    <td className={`px-4 py-2 border text-right font-mono ${
                      isBullish ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {diff.percentage > 0 ? '+' : ''}{diff.percentage.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 border text-center">
                      {isBullish ? (
                        <span className="text-green-700">▲ Бычий</span>
                      ) : (
                        <span className="text-red-700">▼ Медвежий</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Топ ордеров */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bids */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-green-700">
            Топ Bids (покупка)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-4 py-2 border">Цена</th>
                  <th className="px-4 py-2 border">Объем</th>
                </tr>
              </thead>
              <tbody>
                {data.bids.slice(0, 10).map((bid, index) => (
                  <tr key={index} className="hover:bg-green-50">
                    <td className="px-4 py-2 border text-right font-mono">
                      {bid.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono">
                      {bid.volume.toFixed(8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asks */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-red-700">
            Топ Asks (продажа)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead className="bg-red-50">
                <tr>
                  <th className="px-4 py-2 border">Цена</th>
                  <th className="px-4 py-2 border">Объем</th>
                </tr>
              </thead>
              <tbody>
                {data.asks.slice(0, 10).map((ask, index) => (
                  <tr key={index} className="hover:bg-red-50">
                    <td className="px-4 py-2 border text-right font-mono">
                      {ask.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono">
                      {ask.volume.toFixed(8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
