/**
 * Binance REST API Collector
 *
 * Collects BID/ASK order book data from Binance using REST API
 * instead of WebSocket to avoid connection limits (max 5 WebSocket connections per IP)
 */

import { snapshotService } from "./snapshot.service";

interface BinanceDepthResponse {
  lastUpdateId: number;
  bids: [string, string][];
  asks: [string, string][];
}

interface OrderBook {
  bids: Array<{ price: number; quantity: number }>;
  asks: Array<{ price: number; quantity: number }>;
}

interface DepthVolumes {
  [depth: number]: {
    bidVolume: number;
    askVolume: number;
    bidValueUsd: number;
    askValueUsd: number;
  };
}

export class BinanceRestCollector {
  // API endpoints
  private readonly SPOT_API = "https://api.binance.com/api/v3/depth";
  private readonly FUTURES_API = "https://fapi.binance.com/fapi/v1/depth";

  // Rate limiting
  private readonly REQUEST_DELAY_MS = 300; // 300ms between requests
  private readonly LIMIT = 500; // Order book limit (weight ≈ 5)

  // Depths to calculate
  private readonly DEPTHS = [1.5, 3, 5, 8, 15, 30];

  // Symbols to track
  private symbols: string[];

  // Interval ID
  private intervalId: NodeJS.Timeout | null = null;

  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastCollectionTime: null as Date | null,
  };

  constructor(symbols: string[]) {
    this.symbols = symbols;
  }

  /**
   * Fetch order book from Binance API
   */
  async fetchOrderBook(
    symbol: string,
    marketType: "SPOT" | "FUTURES"
  ): Promise<BinanceDepthResponse> {
    const url =
      marketType === "SPOT"
        ? `${this.SPOT_API}?symbol=${symbol}&limit=${this.LIMIT}`
        : `${this.FUTURES_API}?symbol=${symbol}&limit=${this.LIMIT}`;

    this.stats.totalRequests++;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      this.stats.failedRequests++;
      throw new Error(
        `Binance API error: ${response.status} ${response.statusText}`
      );
    }

    this.stats.successfulRequests++;
    return await response.json();
  }

  /**
   * Parse Binance response to OrderBook format
   */
  parseOrderBook(data: BinanceDepthResponse): OrderBook {
    return {
      bids: data.bids.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
      asks: data.asks.map(([price, qty]) => ({
        price: parseFloat(price),
        quantity: parseFloat(qty),
      })),
    };
  }

  /**
   * Calculate volumes at different depth levels
   */
  calculateDepthVolumes(orderBook: OrderBook): DepthVolumes {
    const bestBid = orderBook.bids[0]?.price;
    const bestAsk = orderBook.asks[0]?.price;

    if (!bestBid || !bestAsk) {
      throw new Error("Empty order book");
    }

    const result: DepthVolumes = {};

    for (const depthPercent of this.DEPTHS) {
      const bidThreshold = bestBid * (1 - depthPercent / 100);
      const askThreshold = bestAsk * (1 + depthPercent / 100);

      // Calculate BID volume
      let bidVolume = 0;
      let bidValueUsd = 0;

      for (const bid of orderBook.bids) {
        if (bid.price >= bidThreshold) {
          bidVolume += bid.quantity;
          bidValueUsd += bid.price * bid.quantity;
        } else {
          break; // Bids are sorted descending
        }
      }

      // Calculate ASK volume
      let askVolume = 0;
      let askValueUsd = 0;

      for (const ask of orderBook.asks) {
        if (ask.price <= askThreshold) {
          askVolume += ask.quantity;
          askValueUsd += ask.price * ask.quantity;
        } else {
          break; // Asks are sorted ascending
        }
      }

      result[depthPercent] = {
        bidVolume,
        askVolume,
        bidValueUsd,
        askValueUsd,
      };
    }

    return result;
  }

  /**
   * Collect snapshots for one symbol
   */
  async collectSymbol(symbol: string, marketType: "SPOT" | "FUTURES") {
    try {
      // 1. Fetch order book
      const data = await this.fetchOrderBook(symbol, marketType);

      // 2. Parse to OrderBook format
      const orderBook = this.parseOrderBook(data);

      // 3. Calculate volumes at all depths
      const depthVolumes = this.calculateDepthVolumes(orderBook);

      // 4. Save snapshots to database
      const timestamp = new Date();
      // Round timestamp to the nearest minute
      timestamp.setSeconds(0, 0);

      for (const depth of this.DEPTHS) {
        const volumes = depthVolumes[depth];

        await snapshotService.write({
          timestamp,
          symbol,
          marketType,
          depth,
          bidVolume: volumes.bidVolume,
          askVolume: volumes.askVolume,
          bidVolumeUsd: volumes.bidValueUsd,
          askVolumeUsd: volumes.askValueUsd,
        });
      }

      console.log(`[Collector] ${symbol} ${marketType}`);
    } catch (error) {
      console.error(`[Collector] ${symbol} ${marketType}:`, error);
      // Continue with next symbol (don't break the whole cycle)
    }
  }

  /**
   * Collect snapshots for all symbols
   */
  async collectAllSnapshots() {
    const startTime = Date.now();
    console.log(
      `[Collector] Starting collection for ${this.symbols.length} symbols...`
    );

    for (const symbol of this.symbols) {
      // Collect SPOT
      await this.collectSymbol(symbol, "SPOT");
      await this.sleep(this.REQUEST_DELAY_MS);

      // Collect FUTURES
      await this.collectSymbol(symbol, "FUTURES");
      await this.sleep(this.REQUEST_DELAY_MS);
    }

    const duration = Date.now() - startTime;
    this.stats.lastCollectionTime = new Date();

    console.log(`[Collector] Collection completed in ${duration}ms`);
    console.log(`[Collector] Stats:`, {
      total: this.stats.totalRequests,
      success: this.stats.successfulRequests,
      failed: this.stats.failedRequests,
    });
  }

  /**
   * Start periodic collection
   */
  start() {
    if (this.intervalId) {
      console.log("[Collector] Already running");
      return;
    }

    console.log("[Collector] Starting periodic collection...");
    console.log(`[Collector] Symbols: ${this.symbols.length}`);
    console.log(`[Collector] Interval: 60 seconds`);

    // Run immediately
    this.collectAllSnapshots();

    // Then every minute
    this.intervalId = setInterval(() => {
      this.collectAllSnapshots();
    }, 60000);
  }

  /**
   * Stop periodic collection
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[Collector] Stopped");
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Add symbols to collection
   */
  addSymbols(symbols: string[]) {
    this.symbols = [...new Set([...this.symbols, ...symbols])];
    console.log(`[Collector] Symbols updated: ${this.symbols.length} total`);
  }

  /**
   * Remove symbols from collection
   */
  removeSymbols(symbols: string[]) {
    this.symbols = this.symbols.filter((s) => !symbols.includes(s));
    console.log(`[Collector] Symbols updated: ${this.symbols.length} total`);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance with default symbols
export const binanceCollector = new BinanceRestCollector([
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "ADAUSDT",
]);
