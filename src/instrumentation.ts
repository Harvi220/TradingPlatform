/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically called by Next.js when the server starts
 * Perfect place to initialize background services like the Binance collector
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing server-side services...');

    try {
      // Import and start the Binance data collector
      const { startDataCollection } = await import('./backend/init/startCollector');
      startDataCollection();

      console.log('[Instrumentation] ✓ All services initialized successfully');
    } catch (error) {
      console.error('[Instrumentation] ✗ Failed to initialize services:', error);
    }
  }
}
