/**
 * API Route для получения данных для графиков в формате Lightweight Charts
 * GET /api/chart-data?symbol=BTCUSDT&marketType=SPOT&depth=5&type=bid
 *
 * UPDATED: Теперь использует напрямую SnapshotService вместо внутреннего fetch
 */

import { NextRequest, NextResponse } from 'next/server';
import { snapshotService } from '@/backend/services/snapshot.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const marketType = (searchParams.get('marketType') || 'SPOT') as 'SPOT' | 'FUTURES';
    const depthParam = searchParams.get('depth');
    const type = searchParams.get('type') as 'bid' | 'ask' | null;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    console.log(`[API/chart-data] Request: symbol=${symbol}, marketType=${marketType}, depth=${depthParam}, type=${type}`);

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

    // Default: last hour
    const to = toParam ? new Date(parseInt(toParam)) : new Date();
    const from = fromParam ? new Date(parseInt(fromParam)) : new Date(to.getTime() - 60 * 60 * 1000);

    // Read from database via SnapshotService (with caching)
    const snapshots = await snapshotService.read({
      symbol,
      marketType,
      depth,
      type: type || undefined,
      from,
      to,
      limit: 3600, // Max 1 hour of minute data
    });

    console.log(`[API/chart-data] Found ${snapshots.length} snapshots`);

    // Transform to Lightweight Charts format
    // Format: { time: number (in seconds), value: number }[]
    const chartData = snapshots.map((s: any) => {
      const timestamp = s.timestamp.getTime ? s.timestamp.getTime() : s.timestamp;
      const value = type === 'bid' ? s.bidVolumeUsd
        : type === 'ask' ? s.askVolumeUsd
        : (s.bidVolumeUsd + s.askVolumeUsd) / 2;

      return {
        time: Math.floor(timestamp / 1000), // Convert to seconds
        value,
      };
    });

    console.log(`[API/chart-data] Returning ${chartData.length} chart points`);

    return NextResponse.json({
      symbol,
      marketType,
      depth,
      type: type || 'both',
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
