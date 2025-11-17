/**
 * Data Collector Initialization
 *
 * Automatically starts the Binance REST collector on server startup
 * Runs only on server-side (not in browser)
 */

import { binanceCollector } from '@/backend/services/binance-rest-collector';

/**
 * Start the data collection process
 * This function is called automatically when the module is imported
 */
export function startDataCollection() {
  // Only run on server-side
  if (typeof window === 'undefined') {
    console.log('[Init] Starting Binance data collector...');

    try {
      binanceCollector.start();
      console.log('[Init] ✓ Binance data collector started successfully');
    } catch (error) {
      console.error('[Init] ✗ Failed to start Binance data collector:', error);
    }
  }
}

/**
 * Auto-start in production environment
 * For development, you can manually start via API: POST /api/collector
 */
if (process.env.NODE_ENV === 'production') {
  startDataCollection();
}

export default startDataCollection;
