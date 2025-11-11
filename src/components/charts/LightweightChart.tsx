"use client";

/**
 * Компонент для отображения графика с индикаторами BID/ASK
 * Использует TradingView Lightweight Charts
 */

import { useEffect, useRef, useState } from "react";

interface LightweightChartProps {
  symbol: string;
  marketType: "spot" | "futures";
  enabledIndicators: {
    bid: { [key: string]: boolean };
    ask: { [key: string]: boolean };
  };
}

// Цветовая схема для индикаторов
const INDICATOR_COLORS = {
  bid: {
    "1.5": "#90EE90",
    "3": "#00C853",
    "5": "#00897B",
    "8": "#00ACC1",
    "15": "#1976D2",
    "30": "#0D47A1",
  },
  ask: {
    "1.5": "#FFCDD2",
    "3": "#EF5350",
    "5": "#D32F2F",
    "8": "#FF6F00",
    "15": "#F57C00",
    "30": "#E65100",
  },
};

export default function LightweightChart({
  symbol,
  marketType,
  enabledIndicators,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const seriesMapRef = useRef<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // Инициализация графика только на клиенте
  useEffect(() => {
    let isMounted = true;
    let resizeHandler: (() => void) | null = null;

    const initChart = async () => {
      // Проверяем что мы на клиенте
      if (typeof window === 'undefined') {
        console.log('[Chart] Skipping - server side');
        return;
      }

      if (!chartContainerRef.current) {
        console.log('[Chart] Container not ready');
        return;
      }

      try {
        console.log('[Chart] Loading lightweight-charts...');

        // Динамический импорт с небольшой задержкой
        const lwcModule = await import('lightweight-charts');
        console.log('[Chart] Module loaded:', lwcModule);

        if (!isMounted || !chartContainerRef.current) {
          console.log('[Chart] Component unmounted or container gone');
          return;
        }

        const { createChart } = lwcModule;

        if (typeof createChart !== 'function') {
          console.error('[Chart] createChart is not a function!', createChart);
          setError('Ошибка загрузки библиотеки графиков');
          return;
        }

        console.log('[Chart] Creating chart instance...');
        const chart = createChart(chartContainerRef.current, {
          width: chartContainerRef.current.clientWidth,
          height: 500,
          layout: {
            background: { type: 'solid' as const, color: "#FFFFFF" },
            textColor: "#333",
          },
          grid: {
            vertLines: { color: "#E0E0E0" },
            horzLines: { color: "#E0E0E0" },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: true,
          },
          localization: {
            priceFormatter: (price: number) => {
              // Форматируем значения с указанием единиц измерения
              if (price >= 1000000) {
                return `$${(price / 1000000).toFixed(2)}M`;
              } else if (price >= 1000) {
                return `$${(price / 1000).toFixed(2)}K`;
              }
              return `$${price.toFixed(2)}`;
            },
          },
        });

        console.log('[Chart] Chart created, type:', typeof chart);
        console.log('[Chart] Chart methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(chart)));

        // В lightweight-charts v5 нужно использовать addSeries вместо addLineSeries
        const hasAddSeries = typeof chart?.addSeries === 'function';
        const hasAddLineSeries = typeof chart?.addLineSeries === 'function';

        console.log('[Chart] Has addSeries?', hasAddSeries);
        console.log('[Chart] Has addLineSeries?', hasAddLineSeries);

        if (!chart || (!hasAddSeries && !hasAddLineSeries)) {
          console.error('[Chart] Invalid chart object - no series methods!', chart);
          setError('Ошибка инициализации графика');
          return;
        }

        chartInstanceRef.current = chart;
        console.log('[Chart] Chart initialized successfully');

        // Обработчик ресайза
        resizeHandler = () => {
          if (chartContainerRef.current && chartInstanceRef.current) {
            chartInstanceRef.current.applyOptions({
              width: chartContainerRef.current.clientWidth,
            });
          }
        };

        window.addEventListener("resize", resizeHandler);
        setChartReady(true);

      } catch (err) {
        console.error('[Chart] Failed to initialize chart:', err);
        setError('Не удалось загрузить библиотеку графиков: ' + (err instanceof Error ? err.message : String(err)));
        setChartReady(false);
      }
    };

    // Небольшая задержка для гарантии что DOM готов
    const initTimeout = setTimeout(() => {
      initChart();
    }, 50);

    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      isMounted = false;

      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }

      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {
          console.error('[Chart] Error removing chart:', e);
        }
        chartInstanceRef.current = null;
      }
      seriesMapRef.current.clear();
      setChartReady(false);
    };
  }, []);

  // Автоматический запуск сбора данных с регулярным опросом
  useEffect(() => {
    const endpoint = marketType === "spot"
      ? `/api/binance/spot?symbol=${symbol}`
      : `/api/binance/futures?symbol=${symbol}`;

    const pollDataCollection = async () => {
      try {
        console.log(`[Chart] Polling data collection for ${symbol} ${marketType}...`);

        // Вызываем API для сохранения снэпшотов
        const response = await fetch(endpoint);

        if (!response.ok && response.status !== 503) {
          console.warn(`[Chart] Data collection error:`, response.status);
        }
      } catch (error) {
        console.error('[Chart] Error polling data collection:', error);
      }
    };

    // Запускаем сразу
    pollDataCollection();

    // Опрашиваем каждую секунду для сохранения снэпшотов
    const intervalId = setInterval(pollDataCollection, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [symbol, marketType]);

  // Загрузка и обновление данных
  useEffect(() => {
    if (!chartReady || !chartInstanceRef.current) {
      console.log('[Chart] Skipping data load - chart not ready');
      return;
    }

    const chart = chartInstanceRef.current;
    const depths = ["1.5", "3", "5", "8", "15", "30"];
    let intervalId: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    // Очищаем все старые series
    seriesMapRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (e) {
        console.error('[Chart] Error removing series:', e);
      }
    });
    seriesMapRef.current.clear();
    setNoData(false);

    // Загрузка данных для одного индикатора
    const loadIndicatorData = async (depth: string, type: "bid" | "ask") => {
      try {
        const url = `/api/chart-data?symbol=${symbol}&marketType=${marketType.toUpperCase()}&depth=${depth}&type=${type}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.error(`[Chart] Failed to fetch ${type} ${depth}%:`, response.status);
          return null;
        }

        const json = await response.json();

        if (!json.data || json.data.length === 0) {
          console.warn(`[Chart] No data for ${type} ${depth}%`);
          return null;
        }

        console.log(`[Chart] Loaded ${json.data.length} points for ${type} ${depth}%`);
        return { depth, type, data: json.data };
      } catch (error) {
        console.error(`[Chart] Error loading ${type} ${depth}%:`, error);
        return null;
      }
    };

    // Обновление графика с новыми данными
    const updateChart = async (isInitial = false) => {
      if (!chartInstanceRef.current) return;

      try {
        if (isInitial) {
          setLoading(true);
        }

        // Импортируем LineSeries для v5 API
        const { LineSeries } = await import('lightweight-charts');

        const promises: Promise<any>[] = [];

        // Собираем промисы для всех включенных индикаторов
        depths.forEach((depth) => {
          if (enabledIndicators.bid[depth]) {
            promises.push(loadIndicatorData(depth, "bid"));
          }
          if (enabledIndicators.ask[depth]) {
            promises.push(loadIndicatorData(depth, "ask"));
          }
        });

        const results = await Promise.all(promises);

        // Обновляем series
        results.forEach((result) => {
          if (!result || !chartInstanceRef.current) return;

          const { depth, type, data } = result;
          const seriesKey = `${type}-${depth}`;
          const color = INDICATOR_COLORS[type][depth as keyof typeof INDICATOR_COLORS.bid];

          // Проверяем, есть ли уже series для этого индикатора
          let series = seriesMapRef.current.get(seriesKey);

          if (!series) {
            // Проверяем что chart готов
            if (!chartInstanceRef.current) {
              console.error(`[Chart] Chart not ready for ${seriesKey}`);
              return;
            }

            // Создаем новую series
            try {
              // В lightweight-charts v5 используется addSeries вместо addLineSeries
              const hasAddSeries = typeof chartInstanceRef.current.addSeries === 'function';

              if (hasAddSeries) {
                // API v5
                series = chartInstanceRef.current.addSeries(LineSeries, {
                  color,
                  lineWidth: 2,
                  title: `${type.toUpperCase()} ${depth}%`,
                });
              } else {
                // API v4 (fallback)
                series = (chartInstanceRef.current as any).addLineSeries({
                  color,
                  lineWidth: 2,
                  title: `${type.toUpperCase()} ${depth}%`,
                });
              }

              seriesMapRef.current.set(seriesKey, series);
              console.log(`[Chart] Created series for ${seriesKey}`);
            } catch (e) {
              console.error(`[Chart] Failed to create series for ${seriesKey}:`, e);
              return;
            }
          }

          // Обновляем данные
          try {
            // Сортируем и удаляем дубликаты по времени
            const uniqueData = data
              .sort((a: any, b: any) => a.time - b.time)
              .filter((item: any, index: number, arr: any[]) => {
                // Оставляем только уникальные по времени
                if (index === 0) return true;
                return item.time !== arr[index - 1].time;
              });

            if (data.length !== uniqueData.length) {
              console.warn(`[Chart] Removed ${data.length - uniqueData.length} duplicate timestamps for ${seriesKey}`);
            }

            series.setData(uniqueData);
          } catch (e) {
            console.error(`[Chart] Failed to set data for ${seriesKey}:`, e);
          }
        });

        setNoData(seriesMapRef.current.size === 0);
        setLoading(false);
      } catch (err) {
        console.error('[Chart] Error updating chart:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    // Небольшая задержка перед первой загрузкой
    timeoutId = setTimeout(() => {
      updateChart(true);

      // Обновление каждую секунду
      intervalId = setInterval(() => updateChart(false), 1000);
    }, 100);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [chartReady, symbol, marketType, enabledIndicators]);

  return (
    <div className="relative">
      {/* Заголовок графика с валютой */}
      <div className="mb-2 px-2">
        <h3 className="text-xl font-semibold text-gray-800">
          {symbol} ({marketType.toUpperCase()}) - BID/ASK Volume
        </h3>
        <p className="text-sm text-gray-600">Единицы измерения: USD</p>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
          <div className="text-lg">Загрузка графика...</div>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Ошибка:</strong> {error}
        </div>
      )}
      {!loading && noData && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
          <strong>Нет данных:</strong> Сбор данных начался. График появится через несколько секунд...
        </div>
      )}
      <div ref={chartContainerRef} />
    </div>
  );
}
