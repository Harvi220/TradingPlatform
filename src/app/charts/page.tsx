/**
 * Charts страница с визуализацией данных через TradingView
 * Серверный компонент - рендеринг на сервере
 */

import Navigation from "@/components/layout/Navigation";
import ChartPageClient from "@/components/charts/ChartPageClient";

export default function ChartsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <ChartPageClient />
    </div>
  );
}
