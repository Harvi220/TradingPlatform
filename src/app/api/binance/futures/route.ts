/**
 * API Route для получения FUTURES order book данных от Binance
 * GET /api/binance/futures?symbol=BTCUSDT
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrderBookService } from '@/backend/services/binance/OrderBookService';
import { DEPTH_LEVELS } from '@/shared/constants/depths';
import { calculateAllDepthVolumes } from '@/backend/utils/calculations/depthCalculator';
import { calculateAllDiffs } from '@/backend/utils/calculations/diffCalculator';

// Кэш для OrderBookService инстансов
const orderBookServices = new Map<string, OrderBookService>();

/**
 * GET /api/binance/futures?symbol=BTCUSDT
 * Получить текущие данные order book для FUTURES рынка
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Используем уникальный ключ: symbol + marketType
    const cacheKey = `${symbol}:FUTURES`;

    // Получаем или создаем OrderBookService для символа
    let service = orderBookServices.get(cacheKey);

    if (!service) {
      console.log(`Creating new OrderBookService for ${symbol} FUTURES`);
      service = new OrderBookService(symbol, 'FUTURES');
      orderBookServices.set(cacheKey, service);

      // Запускаем сервис и ждем загрузки snapshot
      await service.start();
    }

    // Получаем текущий order book
    const orderBook = service.getOrderBook();

    // Проверяем, есть ли данные
    if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
      return NextResponse.json(
        {
          error: 'NO_DATA',
          message: 'Order book data not available yet. Please try again.',
          timestamp: Date.now(),
        },
        { status: 503 }
      );
    }

    // Рассчитываем объемы на всех глубинах
    const depthVolumes = calculateAllDepthVolumes(orderBook, DEPTH_LEVELS);

    // Сохраняем снэпшоты для каждой глубины (для построения графиков)
    const snapshots = depthVolumes.map(dv => ({
      timestamp: Date.now(),
      symbol: orderBook.symbol,
      marketType: 'FUTURES' as const,
      depth: dv.depth,
      bidVolume: dv.bidVolume,
      askVolume: dv.askVolume,
      bidVolumeUsd: dv.totalBidValue,
      askVolumeUsd: dv.totalAskValue,
    }));

    // Отправляем снэпшоты в фоновом режиме (не блокируем ответ)
    fetch('http://localhost:3000/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshots),
    }).catch(err => console.error('Failed to save snapshots:', err));

    // Рассчитываем DIFF индикаторы
    const diffs = calculateAllDiffs(depthVolumes);

    // Формируем ответ
    const response = {
      type: 'FUTURES',
      symbol: orderBook.symbol,
      timestamp: orderBook.timestamp,
      midPrice: service.getMidPrice(),
      spread: service.getSpread(),
      bestBid: service.getBestBid(),
      bestAsk: service.getBestAsk(),
      bids: orderBook.bids.slice(0, 20), // Топ 20 bids
      asks: orderBook.asks.slice(0, 20), // Топ 20 asks
      depthVolumes,
      diffs,
      wsStatus: service.getWebSocketStatus(), // Статус WebSocket соединения
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/binance/futures:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/binance/futures?symbol=BTCUSDT
 * Остановить и удалить OrderBookService для символа
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Используем уникальный ключ: symbol + marketType
    const cacheKey = `${symbol}:FUTURES`;

    const service = orderBookServices.get(cacheKey);

    if (service) {
      service.stop();
      orderBookServices.delete(cacheKey);

      return NextResponse.json({
        message: `OrderBookService for ${symbol} FUTURES stopped`,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      {
        error: 'NOT_FOUND',
        message: `No active service for symbol ${symbol}`,
        timestamp: Date.now(),
      },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error in DELETE /api/binance/futures:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
