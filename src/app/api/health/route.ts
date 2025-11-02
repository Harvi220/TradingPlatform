/**
 * Health check endpoint
 * GET /api/health
 */

import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  const uptime = Date.now() - startTime;

  return NextResponse.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime,
    uptimeSeconds: Math.floor(uptime / 1000),
    service: 'Trading Platform API',
    version: '0.1.0',
  });
}
