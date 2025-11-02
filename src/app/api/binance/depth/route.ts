/**
 * API Route для получения depth данных (объемы на глубинах)
 * GET /api/binance/depth?depth=5&type=all&symbol=BTCUSDT
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidDepth, DEPTH_LEVELS } from '@/shared/constants/depths';

/**
 * GET /api/binance/depth?depth=5&type=all&symbol=BTCUSDT
 * Получить объемы на заданной глубине для SPOT и/или FUTURES
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const depthParam = searchParams.get('depth');
    const type = searchParams.get('type') || 'all'; // spot, futures, all
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Валидация depth параметра
    if (!depthParam) {
      return NextResponse.json(
        {
          error: 'MISSING_PARAMETER',
          message: 'Depth parameter is required',
          availableDepths: DEPTH_LEVELS,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const depth = parseFloat(depthParam);

    if (!isValidDepth(depth)) {
      return NextResponse.json(
        {
          error: 'INVALID_DEPTH',
          message: `Invalid depth value: ${depth}`,
          availableDepths: DEPTH_LEVELS,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const result: any = {
      depth,
      symbol,
      timestamp: Date.now(),
    };

    // Получаем данные для SPOT
    if (type === 'spot' || type === 'all') {
      try {
        const spotResponse = await fetch(
          `${request.nextUrl.origin}/api/binance/spot?symbol=${symbol}`
        );

        if (spotResponse.ok) {
          const spotData = await spotResponse.json();
          const spotDepthVolume = spotData.depthVolumes?.find(
            (dv: any) => dv.depth === depth
          );
          const spotDiff = spotData.diffs?.find((d: any) => d.depth === depth);

          if (spotDepthVolume && spotDiff) {
            result.spot = {
              bid: spotDepthVolume.bidVolume,
              ask: spotDepthVolume.askVolume,
              diff: spotDiff.diff,
              percentage: spotDiff.percentage,
              totalBidValue: spotDepthVolume.totalBidValue,
              totalAskValue: spotDepthVolume.totalAskValue,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching SPOT data:', error);
        result.spot = { error: 'Failed to fetch SPOT data' };
      }
    }

    // Получаем данные для FUTURES
    if (type === 'futures' || type === 'all') {
      try {
        const futuresResponse = await fetch(
          `${request.nextUrl.origin}/api/binance/futures?symbol=${symbol}`
        );

        if (futuresResponse.ok) {
          const futuresData = await futuresResponse.json();
          const futuresDepthVolume = futuresData.depthVolumes?.find(
            (dv: any) => dv.depth === depth
          );
          const futuresDiff = futuresData.diffs?.find(
            (d: any) => d.depth === depth
          );

          if (futuresDepthVolume && futuresDiff) {
            result.futures = {
              bid: futuresDepthVolume.bidVolume,
              ask: futuresDepthVolume.askVolume,
              diff: futuresDiff.diff,
              percentage: futuresDiff.percentage,
              totalBidValue: futuresDepthVolume.totalBidValue,
              totalAskValue: futuresDepthVolume.totalAskValue,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching FUTURES data:', error);
        result.futures = { error: 'Failed to fetch FUTURES data' };
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/binance/depth:', error);

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
