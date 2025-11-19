"use client";

/**
 * TradingView виджет для отображения графиков
 */

import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;
  marketType: "spot" | "futures";
}

export default function TradingViewWidget({
  symbol,
  marketType,
}: TradingViewWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Очищаем контейнер перед добавлением нового виджета
    const container = chartContainerRef.current;
    container.innerHTML = "";

    // Небольшая задержка для корректной очистки предыдущего виджета
    const timeoutId = setTimeout(() => {
      // Создаем контейнер для виджета
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "100%";
      widgetContainer.style.width = "100%";

      const widgetDiv = document.createElement("div");
      widgetDiv.className = "tradingview-widget-container__widget";
      widgetDiv.style.height = "calc(100% - 32px)";
      widgetDiv.style.width = "100%";

      widgetContainer.appendChild(widgetDiv);

      // Создаем скрипт для виджета
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.async = true;

      // Формируем символ для TradingView
      const tvSymbol =
        marketType === "spot" ? `BINANCE:${symbol}` : `BINANCE:${symbol}.P`;

      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: "tradingview_chart",
        hide_top_toolbar: false,
        hide_side_toolbar: false,
        details: true,
        hotlist: true,
        calendar: false,
        show_popup_button: true,
        popup_width: "1000",
        popup_height: "650",
        support_host: "https://www.tradingview.com",
      });

      widgetContainer.appendChild(script);

      // Добавляем copyright
      const copyright = document.createElement("div");
      copyright.className = "tradingview-widget-copyright";
      copyright.innerHTML = `
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span class="blue-text">Track all markets on TradingView</span>
        </a>
      `;
      widgetContainer.appendChild(copyright);

      if (container) {
        container.appendChild(widgetContainer);
      }
    }, 100);

    // Cleanup функция
    return () => {
      clearTimeout(timeoutId);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [symbol, marketType]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div
        ref={chartContainerRef}
        style={{ height: "calc(100vh - 180px)", width: "100%" }}
      />
    </div>
  );
}
