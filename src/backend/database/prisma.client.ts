/**
 * Prisma Client Singleton
 *
 * This file provides a singleton instance of the Prisma Client to avoid
 * creating multiple instances during development (hot reloading).
 */

import { PrismaClient } from '@prisma/client';

// Declare global variable for Prisma client in development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create Prisma client with logging configuration
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
};

// Use global variable in development to prevent multiple instances
const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

// Export types for convenience
export type { PrismaClient } from '@prisma/client';
