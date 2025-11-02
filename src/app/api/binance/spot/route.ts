/**
 * API Route для получения SPOT order book данных от Binance
 * GET /api/binance/spot?symbol=BTCUSDT
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrderBookService } from '@/backend/services/binance/OrderBookService';
import { DEPTH_LEVELS } from '@/shared/constants/depths';
import { calculateAllDepthVolumes } from '@/backend/utils/calculations/depthCalculator';
import { calculateAllDiffs } from '@/backend/utils/calculations/diffCalculator';

// Кэш для OrderBookService инстансов
const orderBookServices = new Map<string, OrderBookService>();

/**
 * GET /api/binance/spot?symbol=BTCUSDT
 * Получить текущие данные order book для SPOT рынка
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Получаем или создаем OrderBookService для символа
    let service = orderBookServices.get(symbol);

    if (!service) {
      console.log(`Creating new OrderBookService for ${symbol} SPOT`);
      service = new OrderBookService(symbol, 'SPOT');
      service.start();
      orderBookServices.set(symbol, service);

      // Ждем немного, чтобы получить первые данные
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // Рассчитываем DIFF индикаторы
    const diffs = calculateAllDiffs(depthVolumes);

    // Формируем ответ
    const response = {
      type: 'SPOT',
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
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in /api/binance/spot:', error);

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
 * DELETE /api/binance/spot?symbol=BTCUSDT
 * Остановить и удалить OrderBookService для символа
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    const service = orderBookServices.get(symbol);

    if (service) {
      service.stop();
      orderBookServices.delete(symbol);

      return NextResponse.json({
        message: `OrderBookService for ${symbol} stopped`,
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
    console.error('Error in DELETE /api/binance/spot:', error);

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
