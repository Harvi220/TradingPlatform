/**
 * Snapshot Service
 *
 * Handles batch writing and caching of snapshots
 */

import { snapshotRepository, SnapshotInput, SnapshotQuery } from '@/backend/repositories/snapshot.repository';
import { getRedisClient } from '@/backend/database/redis.client';

export class SnapshotService {
  private batchBuffer: SnapshotInput[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL_MS = 60000; // 60 seconds
  private readonly CACHE_TTL_SECONDS = 7200; // 2 hours

  async write(snapshot: SnapshotInput): Promise<void> {
    this.batchBuffer.push(snapshot);
    await this.writeToCacheAsync(snapshot);

    if (this.batchBuffer.length >= this.BATCH_SIZE) {
      await this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), this.BATCH_INTERVAL_MS);
    }
  }

  private async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchBuffer.length === 0) return;

    const snapshots = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      const count = await snapshotRepository.createMany(snapshots);
      console.log(`[SnapshotService] Flushed ${count} snapshots to DB`);
    } catch (error) {
      console.error('[SnapshotService] Error flushing:', error);
    }
  }

  private async writeToCacheAsync(snapshot: SnapshotInput): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `snapshot:${snapshot.symbol}:${snapshot.marketType}:${snapshot.depth}:recent`;

      await redis.zAdd(key, {
        score: snapshot.timestamp.getTime(),
        value: JSON.stringify(snapshot),
      });

      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      await redis.zRemRangeByScore(key, 0, twoHoursAgo);
      await redis.expire(key, this.CACHE_TTL_SECONDS);
    } catch (error) {
      console.warn('[SnapshotService] Redis write failed:', error);
    }
  }

  async read(query: SnapshotQuery): Promise<any[]> {
    const cached = await this.readFromCache(query);
    if (cached) {
      console.log('[SnapshotService] Cache hit');
      return cached;
    }

    console.log('[SnapshotService] Cache miss, reading from DB');
    const snapshots = await snapshotRepository.findMany(query);
    await this.writeQueryResultToCache(query, snapshots);
    return snapshots;
  }

  private async readFromCache(query: SnapshotQuery): Promise<any[] | null> {
    try {
      const redis = await getRedisClient();
      const now = Date.now();
      const from = query.from?.getTime() || (now - 2 * 60 * 60 * 1000);
      const to = query.to?.getTime() || now;

      // Try to read from recent cache (last 2 hours)
      if (from >= now - 2 * 60 * 60 * 1000) {
        const key = `snapshot:${query.symbol}:${query.marketType}:${query.depth}:recent`;
        const data = await redis.zRangeByScore(key, from, to);

        if (data && data.length > 0) {
          return data.map(item => JSON.parse(item));
        }
      }

      // Try to read from query cache
      const queryKey = this.getQueryCacheKey(query);
      const cached = await redis.get(queryKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('[SnapshotService] Redis read error:', error);
      return null;
    }
  }

  private async writeQueryResultToCache(query: SnapshotQuery, data: any[]): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = this.getQueryCacheKey(query);
      await redis.setEx(key, this.CACHE_TTL_SECONDS, JSON.stringify(data));
    } catch (error) {
      console.warn('[SnapshotService] Cache write error:', error);
    }
  }

  private getQueryCacheKey(query: SnapshotQuery): string {
    const { symbol, marketType, depth, type, from, to, limit } = query;
    return `query:${symbol}:${marketType}:${depth}:${type || 'all'}:${from?.getTime() || 'noFrom'}:${to?.getTime() || 'noTo'}:${limit || 3600}`;
  }

  async shutdown(): Promise<void> {
    console.log('[SnapshotService] Shutting down...');
    await this.flush();
  }
}

export const snapshotService = new SnapshotService();

// Gracefully shutdown on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await snapshotService.shutdown();
  });
}
