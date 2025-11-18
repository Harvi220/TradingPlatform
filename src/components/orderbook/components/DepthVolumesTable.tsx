/**
 * Таблица объемов на глубинах
 */

import { formatUSD, formatVolume } from "@/shared/utils";
import type { DepthVolume, DepthDiff } from "@/shared/types/orderbook.types";

interface DepthVolumesTableProps {
  depthVolumes: DepthVolume[];
  diffs: DepthDiff[];
  baseCurrency: string;
}

export function DepthVolumesTable({
  depthVolumes,
  diffs,
  baseCurrency,
}: DepthVolumesTableProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-3">Объемы на глубинах</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Глубина (%)</th>
              <th className="px-4 py-2 border text-green-700">BID Объем</th>
              <th className="px-4 py-2 border text-green-700">BID Сумма (USD)</th>
              <th className="px-4 py-2 border text-red-700">ASK Объем</th>
              <th className="px-4 py-2 border text-red-700">ASK Сумма (USD)</th>
              <th className="px-4 py-2 border">DIFF</th>
              <th className="px-4 py-2 border">DIFF %</th>
              <th className="px-4 py-2 border">Delta (Bid/Ask)</th>
            </tr>
          </thead>
          <tbody>
            {depthVolumes.map((dv, index) => {
              const diff = diffs[index];
              const isBullish = diff.diff > 0;
              const delta = dv.askVolume !== 0 ? dv.bidVolume / dv.askVolume : 0;

              return (
                <tr key={dv.depth} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center font-semibold">
                    {dv.depth}%
                  </td>
                  <td className="px-4 py-2 border text-right font-mono text-green-700">
                    {formatVolume(dv.bidVolume)} {baseCurrency}
                  </td>
                  <td className="px-4 py-2 border text-right font-mono text-green-700 font-bold">
                    {formatUSD(dv.totalBidValue)}
                  </td>
                  <td className="px-4 py-2 border text-right font-mono text-red-700">
                    {formatVolume(dv.askVolume)} {baseCurrency}
                  </td>
                  <td className="px-4 py-2 border text-right font-mono text-red-700 font-bold">
                    {formatUSD(dv.totalAskValue)}
                  </td>
                  <td
                    className={`px-4 py-2 border text-right font-mono ${
                      isBullish ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {diff.diff > 0 ? "+" : ""}
                    {formatVolume(diff.diff)} {baseCurrency}
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
  );
}
