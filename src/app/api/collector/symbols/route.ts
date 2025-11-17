/**
 * Collector Symbols Management API
 *
 * Endpoints for managing which symbols the collector tracks
 */

import { NextRequest, NextResponse } from 'next/server';
import { binanceCollector } from '@/backend/services/binance-rest-collector';

// POST - add symbols to collection
export async function POST(request: NextRequest) {
  const { symbols } = await request.json();

  if (!Array.isArray(symbols)) {
    return NextResponse.json(
      { error: 'symbols must be an array' },
      { status: 400 }
    );
  }

  binanceCollector.addSymbols(symbols);

  return NextResponse.json({
    success: true,
    message: `Added ${symbols.length} symbols`,
  });
}

// DELETE - remove symbols from collection
export async function DELETE(request: NextRequest) {
  const { symbols } = await request.json();

  if (!Array.isArray(symbols)) {
    return NextResponse.json(
      { error: 'symbols must be an array' },
      { status: 400 }
    );
  }

  binanceCollector.removeSymbols(symbols);

  return NextResponse.json({
    success: true,
    message: `Removed ${symbols.length} symbols`,
  });
}
