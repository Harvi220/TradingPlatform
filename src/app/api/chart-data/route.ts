/**
 * API Route для получения данных для графиков в формате Lightweight Charts
 * GET /api/chart-data?symbol=BTCUSDT&marketType=SPOT&depth=5&type=bid
 */

import { NextRequest, NextResponse } from 'next/server';

// Используем существующий snapshotsStore из /api/snapshots
// Но так как мы не можем напрямую импортировать из другого route,
// создадим свой эндпоинт, который будет проксировать запросы к /api/snapshots

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const marketType = searchParams.get('marketType') || 'SPOT';
    const depthParam = searchParams.get('depth');
    const type = searchParams.get('type'); // 'bid' или 'ask'

    console.log(`[API/chart-data] Request: symbol=${symbol}, marketType=${marketType}, depth=${depthParam}, type=${type}`);

    if (!symbol || !depthParam || !type) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAMS',
          message: 'Required parameters: symbol, depth, type (bid/ask)',
        },
        { status: 400 }
      );
    }

    // Формируем URL для запроса к /api/snapshots
    const snapshotsUrl = new URL('/api/snapshots', request.url);
    snapshotsUrl.searchParams.set('symbol', symbol);
    snapshotsUrl.searchParams.set('marketType', marketType);
    snapshotsUrl.searchParams.set('depth', depthParam);
    snapshotsUrl.searchParams.set('type', type);

    console.log(`[API/chart-data] Fetching from: ${snapshotsUrl.toString()}`);

    // Делаем внутренний запрос к /api/snapshots
    const snapshotsResponse = await fetch(snapshotsUrl.toString());

    if (!snapshotsResponse.ok) {
      console.error(`[API/chart-data] Snapshots request failed:`, snapshotsResponse.status);
      throw new Error('Failed to fetch snapshots');
    }

    const snapshotsData = await snapshotsResponse.json();
    console.log(`[API/chart-data] Snapshots data:`, {
      count: snapshotsData.data?.length || 0,
      sample: snapshotsData.data?.[0],
    });

    // Преобразуем данные в формат Lightweight Charts
    // Формат: { time: number (в секундах), value: number }[]
    const chartData = snapshotsData.data.map((item: any) => ({
      time: Math.floor(item.timestamp / 1000), // Конвертируем из миллисекунд в секунды
      value: item.value,
    }));

    console.log(`[API/chart-data] Returning ${chartData.length} chart points`);

    return NextResponse.json({
      symbol,
      marketType,
      depth: parseFloat(depthParam),
      type,
      data: chartData,
      count: chartData.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[API/chart-data] Error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
