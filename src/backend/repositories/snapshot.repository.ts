/**
 * Snapshot Repository
 *
 * Handles database operations for BID/ASK snapshots
 */

import prisma from '@/backend/database/prisma.client';
import { MarketType } from '@prisma/client';

export interface SnapshotInput {
  timestamp: Date;
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
  bidVolume: number;
  askVolume: number;
  bidVolumeUsd: number;
  askVolumeUsd: number;
}

export interface SnapshotQuery {
  symbol: string;
  marketType: 'SPOT' | 'FUTURES';
  depth: number;
  type?: 'bid' | 'ask';
  from?: Date;
  to?: Date;
  limit?: number;
}

export class SnapshotRepository {
  async createMany(snapshots: SnapshotInput[]): Promise<number> {
    const result = await prisma.snapshot.createMany({
      data: snapshots.map(s => ({
        ...s,
        marketType: s.marketType as MarketType,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findMany(query: SnapshotQuery) {
    const { symbol, marketType, depth, type, from, to, limit = 3600 } = query;

    return await prisma.snapshot.findMany({
      where: {
        symbol,
        marketType: marketType as MarketType,
        depth,
        timestamp: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: {
        timestamp: true,
        bidVolume: type === 'bid' || !type,
        askVolume: type === 'ask' || !type,
        bidVolumeUsd: type === 'bid' || !type,
        askVolumeUsd: type === 'ask' || !type,
      },
    });
  }

  async getStats(symbol: string, marketType: 'SPOT' | 'FUTURES') {
    const stats = await prisma.snapshot.aggregate({
      where: { symbol, marketType: marketType as MarketType },
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    return {
      totalSnapshots: stats._count,
      oldestSnapshot: stats._min.timestamp,
      newestSnapshot: stats._max.timestamp,
    };
  }
}

export const snapshotRepository = new SnapshotRepository();
