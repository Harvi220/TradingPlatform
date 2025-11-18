/**
 * Общие типы для Order Book данных
 */

export interface Order {
  price: number;
  volume: number;
}

export interface DepthVolume {
  depth: number;
  bidVolume: number;
  askVolume: number;
  totalBidValue: number;
  totalAskValue: number;
}

export interface DepthDiff {
  depth: number;
  diff: number;
  bidVolume: number;
  askVolume: number;
  percentage: number;
}

export interface DepthDetail {
  depth: number;
  bidRange: { from: number; to: number };
  askRange: { from: number; to: number };
  bidOrderCount: number;
  askOrderCount: number;
  bidVolume: number;
  askVolume: number;
  bidMinPrice: number | null;
  bidMaxPrice: number | null;
  askMinPrice: number | null;
  askMaxPrice: number | null;
}

export interface OrderBookLimits {
  lowestBidPrice: number | null;
  highestBidPrice: number | null;
  lowestAskPrice: number | null;
  highestAskPrice: number | null;
  totalBidsCount: number;
  totalAsksCount: number;
}

export interface OrderBookData {
  type?: string;
  symbol: string;
  timestamp: number;
  midPrice: number | null;
  spread: number | null;
  bestBid: Order | null;
  bestAsk: Order | null;
  bids: Order[];
  asks: Order[];
  depthVolumes: DepthVolume[];
  diffs: DepthDiff[];
  wsStatus?: string;
  depthDetails?: DepthDetail[];
  orderBookLimits?: OrderBookLimits;
}
