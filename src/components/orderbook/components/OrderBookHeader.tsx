/**
 * Заголовок OrderBook с информацией и статусом
 */

import { StatusIndicator } from "@/components/ui";
import { formatTime, formatPrice } from "@/shared/utils";

interface OrderBookHeaderProps {
  symbol: string;
  type?: string;
  timestamp: number;
  midPrice: number | null;
  spread: number | null;
  bestBid: { price: number; volume: number } | null;
  bestAsk: { price: number; volume: number } | null;
  wsStatus?: string;
  lastUpdate: number;
}

export function OrderBookHeader({
  symbol,
  type,
  timestamp,
  midPrice,
  spread,
  bestBid,
  bestAsk,
  wsStatus,
  lastUpdate,
}: OrderBookHeaderProps) {
  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold">
            {symbol} {type ? `- ${type} (WebSocket)` : ""}
          </h2>
          <div className="text-xs text-gray-600 mt-1">
            Последнее обновление: {formatTime(timestamp)}
            <span className="ml-2">({timeSinceUpdate}с назад)</span>
          </div>
        </div>
        {wsStatus && <StatusIndicator status={wsStatus} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Mid Price</div>
          <div className="font-mono text-lg">
            {midPrice ? `$${formatPrice(midPrice)}` : "N/A"}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Spread</div>
          <div className="font-mono text-lg">
            {spread ? `$${formatPrice(spread)}` : "N/A"}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Best Bid</div>
          <div className="font-mono text-lg">
            {bestBid ? `$${formatPrice(bestBid.price)}` : "N/A"}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Best Ask</div>
          <div className="font-mono text-lg">
            {bestAsk ? `$${formatPrice(bestAsk.price)}` : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
