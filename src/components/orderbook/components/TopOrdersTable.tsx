/**
 * Таблица топ ордеров (Bids/Asks)
 */

import { formatPrice } from "@/shared/utils";
import type { Order } from "@/shared/types/orderbook.types";

interface TopOrdersTableProps {
  bids: Order[];
  asks: Order[];
  baseCurrency: string;
  limit?: number;
}

export function TopOrdersTable({
  bids,
  asks,
  baseCurrency,
  limit = 10,
}: TopOrdersTableProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-gray-800">
        Топ ордеров (Bids / Asks)
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border text-green-700">Цена (Bids)</th>
              <th className="px-4 py-2 border text-green-700">Объем (Bids)</th>
              <th className="px-4 py-2 border text-red-700">Цена (Asks)</th>
              <th className="px-4 py-2 border text-red-700">Объем (Asks)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.max(bids.length, asks.length) })
              .slice(0, limit)
              .map((_, i) => {
                const bid = bids[i];
                const ask = asks[i];
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border text-right font-mono text-green-700">
                      {bid ? `$${formatPrice(bid.price)}` : "-"}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-green-700">
                      {bid ? `${bid.volume.toFixed(8)} ${baseCurrency}` : "-"}
                    </td>
                    <td className="px-4 py-2 border text-right font-mono text-red-700">
                      {ask ? `$${formatPrice(ask.price)}` : "-"}
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
  );
}
