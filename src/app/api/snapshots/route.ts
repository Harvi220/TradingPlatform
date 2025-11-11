/**
 * API Route для сохранения и получения снапшотов BID/ASK данных
 * POST /api/snapshots - сохранить снапшот
 * GET /api/snapshots?symbol=BTCUSDT&depth=5&type=bid - получить исторические данные
 */

import { NextRequest, NextResponse } from 'next/server';

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

// Хранилище снапшотов в памяти
// Key: `${symbol}:${marketType}:${depth}` (например: "BTCUSDT:SPOT:5")
// Value: массив снапшотов, отсортированных по времени
const snapshotsStore = new Map<string, Snapshot[]>();

// TTL для снапшотов (1 час = 3600 секунд = 3600000 миллисекунд)
const SNAPSHOT_TTL = 3600000;

// Максимальное количество снапшотов на один ключ (1 час * 1 снапшот в секунду = 3600)
const MAX_SNAPSHOTS_PER_KEY = 3600;

/**
 * Очистка старых снапшотов (старше 1 часа)
 */
function cleanupOldSnapshots() {
  const now = Date.now();
  const cutoffTime = now - SNAPSHOT_TTL;

  for (const [key, snapshots] of snapshotsStore.entries()) {
    // Фильтруем снапшоты, оставляя только свежие
    const freshSnapshots = snapshots.filter(s => s.timestamp > cutoffTime);

    if (freshSnapshots.length === 0) {
      // Если нет свежих снапшотов - удаляем ключ
      snapshotsStore.delete(key);
    } else {
      // Обновляем массив, оставляя только свежие
      snapshotsStore.set(key, freshSnapshots);
    }
  }
}

// Запускаем периодическую очистку каждую минуту
setInterval(cleanupOldSnapshots, 60000);

/**
 * POST /api/snapshots
 * Сохранить массив снапшотов
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
    const savedKeys = new Set<string>();
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

      // Формируем ключ
      const key = `${snapshot.symbol}:${snapshot.marketType}:${snapshot.depth}`;
      savedKeys.add(key);

      // Получаем или создаем массив снапшотов для этого ключа
      let existingSnapshots = snapshotsStore.get(key) || [];

      // Добавляем новый снапшот
      existingSnapshots.push(snapshot);

      // Ограничиваем размер массива
      if (existingSnapshots.length > MAX_SNAPSHOTS_PER_KEY) {
        existingSnapshots = existingSnapshots.slice(-MAX_SNAPSHOTS_PER_KEY);
      }

      // Сортируем по времени (на всякий случай)
      existingSnapshots.sort((a, b) => a.timestamp - b.timestamp);

      // Сохраняем обратно
      snapshotsStore.set(key, existingSnapshots);
    }

    console.log(`[API/snapshots POST] Saved to keys:`, Array.from(savedKeys));

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
 * GET /api/snapshots?symbol=BTCUSDT&marketType=SPOT&depth=5&type=bid
 * Получить исторические данные для графика
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const marketType = searchParams.get('marketType') || 'SPOT';
    const depthParam = searchParams.get('depth');
    const type = searchParams.get('type'); // 'bid' или 'ask'

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

    // Формируем ключ
    const key = `${symbol}:${marketType}:${depth}`;

    console.log(`[API/snapshots GET] Key: ${key}, Type: ${type}, Store keys:`, Array.from(snapshotsStore.keys()));

    // Получаем снапшоты
    const snapshots = snapshotsStore.get(key) || [];

    // Очищаем старые снапшоты перед возвратом
    const now = Date.now();
    const cutoffTime = now - SNAPSHOT_TTL;
    const freshSnapshots = snapshots.filter(s => s.timestamp > cutoffTime);

    console.log(`[API/snapshots GET] Found ${freshSnapshots.length} snapshots for ${key}`);

    // Если указан тип (bid или ask), фильтруем по нему
    let data = freshSnapshots;

    if (type === 'bid' || type === 'ask') {
      // Возвращаем только нужное поле
      const result = freshSnapshots.map(s => ({
        timestamp: s.timestamp,
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
      data: freshSnapshots,
      count: freshSnapshots.length,
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

/**
 * DELETE /api/snapshots?symbol=BTCUSDT&marketType=SPOT
 * Удалить все снапшоты для символа и типа рынка
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const marketType = searchParams.get('marketType');

    if (!symbol) {
      // Если символ не указан, очищаем всё
      snapshotsStore.clear();
      return NextResponse.json({
        message: 'All snapshots cleared',
        timestamp: Date.now(),
      });
    }

    // Удаляем снапшоты для конкретного символа
    const keysToDelete: string[] = [];
    for (const key of snapshotsStore.keys()) {
      if (marketType) {
        // Удаляем только для конкретного символа и типа рынка
        if (key.startsWith(`${symbol}:${marketType}:`)) {
          keysToDelete.push(key);
        }
      } else {
        // Удаляем для символа на всех рынках
        if (key.startsWith(`${symbol}:`)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach(key => snapshotsStore.delete(key));

    return NextResponse.json({
      message: `Deleted ${keysToDelete.length} snapshot groups`,
      deletedKeys: keysToDelete,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Error in DELETE /api/snapshots:', error);

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
