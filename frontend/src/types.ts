export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  sector: string;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface Sector {
  name: string;
  stocks: Stock[];
  totalMarketCap: number;
  weightedChange: number;
  averageChange: number;
}

export interface HeatmapData {
  sectors: Sector[];
  lastUpdated: string;
}

export interface TreemapNode {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  type: 'sector' | 'stock';
  stock?: Stock;
  children?: TreemapNode[];
}
