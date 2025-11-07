"use client";

/**
 * Компонент таблицы для отображения order book данных через REST API Binance
 * Обновляется каждую минуту
 */

import { useState, useEffect } from "react";

interface OrderBookData {
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
  depthDetails: Array<{
    depth: number;
    bidRange: { from: number; to: number };
    askRange: { from: number; to: number };
    bidOrderCount: number;
    askOrderCount: number;
    bidVolume: number;
    askVolume: number;
    bidMinPrice: number | null;
    bidMaxPrice: number | null;
    askMinPrice: number | null;
    askMaxPrice: number | null;
  }>;
  orderBookLimits: {
    lowestBidPrice: number | null;
    highestBidPrice: number | null;
    lowestAskPrice: number | null;
    highestAskPrice: number | null;
    totalBidsCount: number;
    totalAsksCount: number;
  };
}

interface OrderBookRestTableProps {
  marketType: "spot" | "futures";
  symbol: string;
}

export default function OrderBookRestTable({
  marketType,
  symbol,
}: OrderBookRestTableProps) {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [nextUpdate, setNextUpdate] = useState<number>(60);

  // Извлекаем базовую валюту из символа (например, BTC из BTCUSDT)
  const getBaseCurrency = (symbol: string): string => {
    const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB'];
    for (const quote of quoteCurrencies) {
      if (symbol.endsWith(quote)) {
        return symbol.slice(0, -quote.length);
      }
    }
    return symbol;
  };

  const baseCurrency = getBaseCurrency(symbol);

  // Функция для получения данных напрямую от Binance REST API
  const fetchBinanceData = async () => {
    try {
      setLoading(true);

      // Получаем данные стакана от Binance (максимальный лимит)
      const binanceUrl = marketType === "spot"
        ? `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=5000`
        : `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=1000`;

      const response = await fetch(binanceUrl);

      if (!response.ok) {
        throw new Error(`Binance API error! status: ${response.status}`);
      }

      const binanceData = await response.json();

      // Обрабатываем данные
      const bids = binanceData.bids.map(([price, volume]: [string, string]) => ({
        price: parseFloat(price),
        volume: parseFloat(volume),
      }));

      const asks = binanceData.asks.map(([price, volume]: [string, string]) => ({
        price: parseFloat(price),
        volume: parseFloat(volume),
      }));

      const bestBid = bids[0] || null;
      const bestAsk = asks[0] || null;
      const midPrice = bestBid && bestAsk ? (bestBid.price + bestAsk.price) / 2 : null;
      const spread = bestBid && bestAsk ? bestAsk.price - bestBid.price : null;

      // Вычисляем объемы на различных глубинах
      const depths = [1.5, 3, 5, 8, 10, 15, 20, 30];
      const depthVolumes: any[] = [];
      const depthDetails: any[] = [];

      depths.forEach(depth => {
        if (!bestBid || !bestAsk) {
          depthVolumes.push({
            depth,
            bidVolume: 0,
            askVolume: 0,
            totalBidValue: 0,
            totalAskValue: 0,
          });
          depthDetails.push({
            depth,
            bidRange: { from: 0, to: 0 },
            askRange: { from: 0, to: 0 },
            bidOrderCount: 0,
            askOrderCount: 0,
            bidVolume: 0,
            askVolume: 0,
          });
          return;
        }

        // Для bid: от (bestBid × (1 - depth%)) до bestBid
        const bidLowerBound = bestBid.price * (1 - depth / 100);
        const bidUpperBound = bestBid.price;

        // Для ask: от bestAsk до (bestAsk × (1 + depth%))
        const askLowerBound = bestAsk.price;
        const askUpperBound = bestAsk.price * (1 + depth / 100);

        const filteredBids = bids.filter(bid => bid.price >= bidLowerBound && bid.price <= bidUpperBound);
        const filteredAsks = asks.filter(ask => ask.price >= askLowerBound && ask.price <= askUpperBound);

        const bidVolume = filteredBids.reduce((sum, bid) => sum + bid.volume, 0);
        const askVolume = filteredAsks.reduce((sum, ask) => sum + ask.volume, 0);

        const totalBidValue = filteredBids.reduce((sum, bid) => sum + bid.price * bid.volume, 0);
        const totalAskValue = filteredAsks.reduce((sum, ask) => sum + ask.price * ask.volume, 0);

        depthVolumes.push({
          depth,
          bidVolume,
          askVolume,
          totalBidValue,
          totalAskValue,
        });

        // Находим минимальную и максимальную цену среди отфильтрованных ордеров
        const bidMinPrice = filteredBids.length > 0 ? Math.min(...filteredBids.map(b => b.price)) : null;
        const bidMaxPrice = filteredBids.length > 0 ? Math.max(...filteredBids.map(b => b.price)) : null;
        const askMinPrice = filteredAsks.length > 0 ? Math.min(...filteredAsks.map(a => a.price)) : null;
        const askMaxPrice = filteredAsks.length > 0 ? Math.max(...filteredAsks.map(a => a.price)) : null;

        depthDetails.push({
          depth,
          bidRange: { from: bidLowerBound, to: bidUpperBound },
          askRange: { from: askLowerBound, to: askUpperBound },
          bidOrderCount: filteredBids.length,
          askOrderCount: filteredAsks.length,
          bidVolume,
          askVolume,
          bidMinPrice,
          bidMaxPrice,
          askMinPrice,
          askMaxPrice,
        });
      });

      // Общая информация о пределах order book
      const orderBookLimits = {
        lowestBidPrice: bids.length > 0 ? Math.min(...bids.map(b => b.price)) : null,
        highestBidPrice: bids.length > 0 ? Math.max(...bids.map(b => b.price)) : null,
        lowestAskPrice: asks.length > 0 ? Math.min(...asks.map(a => a.price)) : null,
        highestAskPrice: asks.length > 0 ? Math.max(...asks.map(a => a.price)) : null,
        totalBidsCount: bids.length,
        totalAsksCount: asks.length,
      };

      // Вычисляем разницы
      const diffs = depthVolumes.map(dv => {
        const diff = dv.bidVolume - dv.askVolume;
        const total = dv.bidVolume + dv.askVolume;
        const percentage = total !== 0 ? (diff / total) * 100 : 0;

        return {
          depth: dv.depth,
          diff,
          bidVolume: dv.bidVolume,
          askVolume: dv.askVolume,
          percentage,
        };
      });

      setData({
        symbol,
        timestamp: Date.now(),
        midPrice,
        spread,
        bestBid,
        bestAsk,
        bids: bids.slice(0, 10),
        asks: asks.slice(0, 10),
        depthVolumes,
        diffs,
        depthDetails,
        orderBookLimits,
      });

      setLastUpdate(Date.now());
      setNextUpdate(60);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  useEffect(() => {
    // Сбрасываем состояние при смене символа или рынка
    setLoading(true);
    setError(null);
    setData(null);

    // Первоначальная загрузка
    fetchBinanceData();

    // Периодическое обновление каждую минуту (60000 ms)
    const interval = setInterval(fetchBinanceData, 60000);

    // Cleanup: очищаем interval при размонтировании или смене зависимостей
    return () => {
      clearInterval(interval);
    };
  }, [marketType, symbol]);

  // Обновляем счетчик до следующего обновления
  useEffect(() => {
    const timer = setInterval(() => {
      const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);
      const remaining = 60 - timeSinceUpdate;
      setNextUpdate(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdate]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Загрузка данных через REST API...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Ошибка REST API:</strong> {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-2xl font-bold">
            {data.symbol} - REST API
          </h2>
          {/* Индикатор обновления */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm font-medium text-purple-700">
              Обновление через {nextUpdate}с
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
        <h3 className="text-xl font-semibold mb-3">Объемы на глубинах (REST API)</h3>
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

                // Проверяем, совпадают ли данные с предыдущей глубиной
                const prevDepth = index > 0 ? data.depthVolumes[index - 1] : null;
                const isDataSameAsPrevious = prevDepth &&
                  Math.abs(dv.bidVolume - prevDepth.bidVolume) < 0.0001 &&
                  Math.abs(dv.askVolume - prevDepth.askVolume) < 0.0001;

                return (
                  <tr key={dv.depth} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-center font-semibold">
                      {dv.depth}%
                    </td>
                    {isDataSameAsPrevious ? (
                      <>
                        <td className="px-4 py-2 border text-center text-gray-400" colSpan={5}>
                          — Недостаточно данных —
                        </td>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Информация о пределах стакана */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Информация о полученных данных от Binance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Всего BID ордеров</div>
            <div className="font-mono text-lg text-green-700">{data.orderBookLimits.totalBidsCount}</div>
          </div>
          <div>
            <div className="text-gray-600">Всего ASK ордеров</div>
            <div className="font-mono text-lg text-red-700">{data.orderBookLimits.totalAsksCount}</div>
          </div>
          <div>
            <div className="text-gray-600">BID: Самая низкая цена</div>
            <div className="font-mono text-sm text-green-700">
              {data.orderBookLimits.lowestBidPrice ? `$${data.orderBookLimits.lowestBidPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">BID: Самая высокая цена</div>
            <div className="font-mono text-sm text-green-700">
              {data.orderBookLimits.highestBidPrice ? `$${data.orderBookLimits.highestBidPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">ASK: Самая низкая цена</div>
            <div className="font-mono text-sm text-red-700">
              {data.orderBookLimits.lowestAskPrice ? `$${data.orderBookLimits.lowestAskPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-600">ASK: Самая высокая цена</div>
            <div className="font-mono text-sm text-red-700">
              {data.orderBookLimits.highestAskPrice ? `$${data.orderBookLimits.highestAskPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Детальная информация по глубинам */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Детальная информация по глубинам</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-2 border">Глубина</th>
                <th className="px-2 py-2 border text-green-700">BID диапазон (расчетный)</th>
                <th className="px-2 py-2 border text-green-700">BID факт. цены</th>
                <th className="px-2 py-2 border text-green-700">Кол-во</th>
                <th className="px-2 py-2 border text-red-700">ASK диапазон (расчетный)</th>
                <th className="px-2 py-2 border text-red-700">ASK факт. цены</th>
                <th className="px-2 py-2 border text-red-700">Кол-во</th>
              </tr>
            </thead>
            <tbody>
              {data.depthDetails.map((detail, index) => {
                // Проверяем, совпадают ли данные с предыдущей глубиной
                const prevDetail = index > 0 ? data.depthDetails[index - 1] : null;
                const isDataSameAsPrevious = prevDetail &&
                  detail.bidOrderCount === prevDetail.bidOrderCount &&
                  detail.askOrderCount === prevDetail.askOrderCount;

                return (
                  <tr key={detail.depth} className="hover:bg-gray-50">
                    <td className="px-2 py-2 border text-center font-semibold">
                      {detail.depth}%
                    </td>
                    {isDataSameAsPrevious ? (
                      <>
                        <td className="px-2 py-2 border text-center text-gray-400" colSpan={6}>
                          — Недостаточно данных —
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2 border text-right font-mono text-green-700">
                          ${detail.bidRange.from.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                          ${detail.bidRange.to.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 border text-right font-mono text-green-600">
                          {detail.bidMinPrice ? `$${detail.bidMinPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}<br/>
                          {detail.bidMaxPrice ? `$${detail.bidMaxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-2 py-2 border text-center font-mono text-green-700">
                          {detail.bidOrderCount}
                        </td>
                        <td className="px-2 py-2 border text-right font-mono text-red-700">
                          ${detail.askRange.from.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
                          ${detail.askRange.to.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2 border text-right font-mono text-red-600">
                          {detail.askMinPrice ? `$${detail.askMinPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}<br/>
                          {detail.askMaxPrice ? `$${detail.askMaxPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="px-2 py-2 border text-center font-mono text-red-700">
                          {detail.askOrderCount}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
