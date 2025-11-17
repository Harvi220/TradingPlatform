/**
 * Collector Management API
 *
 * Endpoints for controlling the Binance data collector
 */

import { NextResponse } from 'next/server';
import { binanceCollector } from '@/backend/services/binance-rest-collector';

// GET - get collector status and statistics
export async function GET() {
  const stats = binanceCollector.getStats();

  return NextResponse.json({
    success: true,
    stats,
  });
}

// POST - start the collector
export async function POST() {
  binanceCollector.start();

  return NextResponse.json({
    success: true,
    message: 'Collector started',
  });
}

// DELETE - stop the collector
export async function DELETE() {
  binanceCollector.stop();

  return NextResponse.json({
    success: true,
    message: 'Collector stopped',
  });
}
