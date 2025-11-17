/**
 * Redis Client Singleton
 *
 * This file provides a singleton instance of the Redis Client for caching.
 */

import { createClient, RedisClientType } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

// Global variable for Redis client
declare global {
  // eslint-disable-next-line no-var
  var redis: RedisClient | undefined;
}

let redisClient: RedisClient | null = null;

/**
 * Get or create Redis client instance
 */
export async function getRedisClient(): Promise<RedisClient> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  // Use global variable in development to prevent multiple instances
  if (process.env.NODE_ENV !== 'production' && global.redis) {
    return global.redis;
  }

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error('[Redis] Too many retries, giving up');
          return new Error('Too many retries');
        }
        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = Math.min(100 * Math.pow(2, retries), 5000);
        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1})`);
        return delay;
      },
    },
  });

  // Event listeners
  client.on('error', (err) => {
    console.error('[Redis] Error:', err);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    console.log('[Redis] Ready');
  });

  client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  client.on('end', () => {
    console.log('[Redis] Connection closed');
  });

  try {
    await client.connect();
    redisClient = client;

    if (process.env.NODE_ENV !== 'production') {
      global.redis = client;
    }

    return client;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    if (global.redis) {
      global.redis = undefined;
    }
    console.log('[Redis] Connection closed gracefully');
  }
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient !== null && redisClient.isOpen;
}

export type { RedisClientType };
