import Link from 'next/link';
import Navigation from '@/components/layout/Navigation';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Trading Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Анализ стакана ордеров Binance в реальном времени
        </p>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              📊 Dashboard
            </Link>

            <Link
              href="/charts"
              className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
            >
              📈 Charts
            </Link>
          </div>

          <div className="text-sm text-gray-500">
            <a
              href="/api/health"
              target="_blank"
              className="text-blue-600 hover:underline"
            >
              API Health Check
            </a>
          </div>
        </div>

        <div className="mt-12 max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Возможности</h2>
          <ul className="text-left space-y-2 text-gray-700">
            <li>✓ Мониторинг SPOT и FUTURES рынков Binance</li>
            <li>✓ Расчет объемов на глубинах: 1.5%, 3%, 5%, 8%, 15%, 30%</li>
            <li>✓ Индикатор DIFF (разница между bid и ask)</li>
            <li>✓ Обновление данных в реальном времени (каждую секунду)</li>
            <li>✓ Отображение топ ордеров покупки и продажи</li>
          </ul>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          Version 0.1.0 (MVP)
        </div>
      </div>
      </div>
    </div>
  );
}
