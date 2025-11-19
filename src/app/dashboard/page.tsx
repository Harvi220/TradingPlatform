/**
 * Dashboard страница для отображения order book данных
 * Серверный компонент - рендеринг на сервере
 */

import Navigation from "@/components/layout/Navigation";
import DashboardPageClient from "@/components/dashboard/DashboardPageClient";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <DashboardPageClient />
    </div>
  );
}
