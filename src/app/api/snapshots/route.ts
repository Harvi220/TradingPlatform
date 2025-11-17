/**
 * API Route для сохранения и получения снапшотов BID/ASK данных
 * POST /api/snapshots - сохранить снапшот
 * GET /api/snapshots?symbol=BTCUSDT&depth=5&type=bid - получить исторические данные
 *
 * UPDATED: Теперь использует PostgreSQL + TimescaleDB вместо in-memory хранилища
 */

import { NextRequest, NextResponse } from 'next/server';
import { snapshotService } from '@/backend/services/snapshot.service';

export interface Snapshot {
  timestamp: number; // Unix timestamp в миллисекундах
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number; // 1.5, 3, 5, 8, 15, 30
  bidVolume: number;
  askVolume: number;
  bidVolumeUsd: number;
  askVolumeUsd: number;
}

/**
 * POST /api/snapshots
 * Сохранить массив снапшотов в базу данных
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ожидаем массив снапшотов или один снапшот
    const snapshots: Snapshot[] = Array.isArray(body) ? body : [body];

    if (snapshots.length === 0) {
      return NextResponse.json(
        {
          error: 'INVALID_DATA',
          message: 'No snapshots provided',
        },
        { status: 400 }
      );
    }

    console.log(`[API/snapshots POST] Received ${snapshots.length} snapshots`);

    // Валидация и сохранение каждого снапшота
    for (const snapshot of snapshots) {
      // Валидация
      if (!snapshot.symbol || !snapshot.marketType || typeof snapshot.depth !== 'number') {
        return NextResponse.json(
          {
            error: 'INVALID_DATA',
            message: 'Invalid snapshot format. Required: symbol, marketType, depth',
          },
          { status: 400 }
        );
      }

      // Сохраняем через Snapshot Service (с батчингом и кэшированием)
      await snapshotService.write({
        timestamp: new Date(snapshot.timestamp),
        symbol: snapshot.symbol,
        marketType: snapshot.marketType,
        depth: snapshot.depth,
        bidVolume: snapshot.bidVolume,
        askVolume: snapshot.askVolume,
        bidVolumeUsd: snapshot.bidVolumeUsd,
        askVolumeUsd: snapshot.askVolumeUsd,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${snapshots.length} snapshots`,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[API/snapshots POST] Error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/snapshots?symbol=BTCUSDT&marketType=SPOT&depth=5&type=bid&from=123456789&to=123456790
 * Получить исторические данные для графика из базы данных
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const marketType = (searchParams.get('marketType') || 'SPOT') as 'SPOT' | 'FUTURES';
    const depthParam = searchParams.get('depth');
    const type = searchParams.get('type') as 'bid' | 'ask' | null;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    if (!symbol || !depthParam) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAMS',
          message: 'Required parameters: symbol, depth',
        },
        { status: 400 }
      );
    }

    const depth = parseFloat(depthParam);
    const from = fromParam ? new Date(parseInt(fromParam)) : undefined;
    const to = toParam ? new Date(parseInt(toParam)) : undefined;
    const limit = limitParam ? parseInt(limitParam) : undefined;

    console.log(`[API/snapshots GET] Query: ${symbol}, ${marketType}, depth=${depth}, type=${type}`);

    // Получаем данные из базы через Snapshot Service (с кэшированием)
    const snapshots = await snapshotService.read({
      symbol,
      marketType,
      depth,
      type: type || undefined,
      from,
      to,
      limit,
    });

    console.log(`[API/snapshots GET] Found ${snapshots.length} snapshots for ${symbol}`);

    // Если указан тип (bid или ask), возвращаем упрощённый формат
    if (type === 'bid' || type === 'ask') {
      const result = snapshots.map((s: any) => ({
        timestamp: s.timestamp.getTime ? s.timestamp.getTime() : s.timestamp,
        value: type === 'bid' ? s.bidVolumeUsd : s.askVolumeUsd,
      }));

      return NextResponse.json({
        symbol,
        marketType,
        depth,
        type,
        data: result,
        count: result.length,
        timestamp: Date.now(),
      });
    }

    // Возвращаем все данные
    return NextResponse.json({
      symbol,
      marketType,
      depth,
      data: snapshots.map((s: any) => ({
        ...s,
        timestamp: s.timestamp.getTime ? s.timestamp.getTime() : s.timestamp,
      })),
      count: snapshots.length,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('[API/snapshots GET] Error:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
