const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory cache for 15 minutes
const cache = new NodeCache({ stdTTL: 900 });

// Persistent cache file path
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_MAX_AGE = 15 * 60 * 1000; // 15 minutes in milliseconds

// Request queue to ensure sequential processing
class RequestQueue {
  constructor(delayMs = 1100) {
    this.queue = [];
    this.processing = false;
    this.delayMs = delayMs;
    this.lastRequestTime = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();

      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.delayMs) {
        await sleep(this.delayMs - timeSinceLastRequest);
      }

      try {
        this.lastRequestTime = Date.now();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }
}

const requestQueue = new RequestQueue(1100); // 1.1 seconds between requests

app.use(cors());
app.use(express.json());

// S&P 500 stocks by sector - top stocks per sector for the heatmap
const STOCKS_BY_SECTOR = {
  'Technology': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ADBE', 'CRM', 'CSCO', 'ACN', 'AMD', 'INTC', 'ORCL', 'QCOM', 'TXN'],
  'Healthcare': ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE', 'BMY', 'AMGN', 'GILD', 'CVS', 'MDT', 'CI'],
  'Financial': ['BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'AXP', 'SPGI', 'BLK', 'C', 'SCHW', 'CB', 'MMC'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX', 'BKNG', 'ABNB', 'CMG', 'MAR', 'F', 'GM', 'ORLY'],
  'Communication': ['GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'EA', 'TTWO', 'WBD', 'PARA', 'LYV', 'MTCH'],
  'Consumer Defensive': ['WMT', 'PG', 'KO', 'PEP', 'COST', 'PM', 'MO', 'CL', 'MDLZ', 'KMB', 'GIS', 'KHC', 'STZ', 'HSY', 'SYY'],
  'Industrials': ['UPS', 'HON', 'UNP', 'RTX', 'BA', 'CAT', 'DE', 'LMT', 'GE', 'MMM', 'GD', 'NSC', 'ETN', 'EMR', 'ITW'],
  'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'PXD', 'VLO', 'WMB', 'OXY', 'HES', 'KMI', 'HAL', 'DVN'],
  'Basic Materials': ['LIN', 'APD', 'SHW', 'ECL', 'DD', 'NEM', 'FCX', 'DOW', 'NUE', 'PPG', 'ALB', 'CTVA', 'VMC', 'MLM', 'FMC'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'SPG', 'O', 'WELL', 'DLR', 'SBAC', 'AVB', 'EQR', 'VICI', 'VTR', 'ARE'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'SRE', 'EXC', 'XEL', 'ED', 'PEG', 'ES', 'WEC', 'DTE', 'ETR', 'AWK']
};

// Get all unique tickers
const getAllTickers = () => {
  const allTickers = new Set();
  Object.values(STOCKS_BY_SECTOR).forEach(stocks => {
    stocks.forEach(ticker => allTickers.add(ticker));
  });
  return Array.from(allTickers);
};

// Utility function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load persistent cache from disk
const loadPersistentCache = () => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const cached = JSON.parse(data);
      const age = Date.now() - new Date(cached.timestamp).getTime();

      if (age < CACHE_MAX_AGE * 2) { // Allow serving stale cache up to 30 min
        console.log(`Loaded persistent cache (${Math.round(age / 1000 / 60)} minutes old)`);
        return cached.data;
      } else {
        console.log('Persistent cache too old, ignoring');
      }
    }
  } catch (error) {
    console.error('Error loading persistent cache:', error.message);
  }
  return null;
};

// Save cache to disk
const savePersistentCache = (data) => {
  try {
    const cacheData = {
      timestamp: new Date().toISOString(),
      data: data
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    console.log('Saved cache to disk');
  } catch (error) {
    console.error('Error saving persistent cache:', error.message);
  }
};

// Rate limiter configuration
// Finnhub free tier: 60 API calls/minute
// Strategy: 1.1s delay between requests = ~55 requests/minute (safely under limit)
// With 2 requests per ticker (quote + profile), we can process ~27 tickers/minute
const RATE_LIMIT = {
  maxRetries: 5,
  initialBackoff: 2000, // 2 seconds
  maxBackoff: 32000, // 32 seconds
  requestDelay: 1100, // 1.1 seconds between requests (allows ~55 requests/minute)
};

// Fetch with retry logic and exponential backoff using request queue
const fetchWithRetry = async (url, params, retryCount = 0) => {
  return requestQueue.add(async () => {
    try {
      const response = await axios.get(url, { params, timeout: 10000 });
      return response.data;
    } catch (error) {
      // Handle 429 (Too Many Requests) with exponential backoff
      if (error.response?.status === 429 && retryCount < RATE_LIMIT.maxRetries) {
        const backoffTime = Math.min(
          RATE_LIMIT.initialBackoff * Math.pow(2, retryCount),
          RATE_LIMIT.maxBackoff
        );
        console.log(`Rate limited. Retrying in ${backoffTime}ms (attempt ${retryCount + 1}/${RATE_LIMIT.maxRetries})...`);
        await sleep(backoffTime);
        return fetchWithRetry(url, params, retryCount + 1);
      }

      // Log error with symbol for better debugging
      const symbol = params.symbol || 'unknown';
      if (error.response?.status === 429) {
        console.error(`Error fetching ${symbol}: ${error.message}`);
      }
      return null;
    }
  });
};

// Fetch quote data from Finnhub
const fetchQuote = async (symbol) => {
  return fetchWithRetry('https://finnhub.io/api/v1/quote', {
    symbol: symbol,
    token: process.env.FINNHUB_API_KEY
  });
};

// Fetch company profile from Finnhub
const fetchProfile = async (symbol) => {
  return fetchWithRetry('https://finnhub.io/api/v1/stock/profile2', {
    symbol: symbol,
    token: process.env.FINNHUB_API_KEY
  });
};

// Flag to prevent multiple simultaneous refresh operations
let isRefreshing = false;

// Background refresh function
const refreshHeatmapData = async () => {
  if (isRefreshing) {
    console.log('Refresh already in progress, skipping...');
    return null;
  }

  isRefreshing = true;
  console.log('Starting background data refresh...');

  try {
    const tickers = getAllTickers();
    const stockData = [];

    // Fetch data for all stocks sequentially using the request queue
    // The queue ensures proper rate limiting (1.1s between requests)
    console.log(`Processing ${tickers.length} tickers...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      try {
        // Fetch quote and profile - the request queue handles rate limiting
        const quote = await fetchQuote(ticker);
        const profile = await fetchProfile(ticker);

        if (quote && quote.c > 0) {
          // Find sector for this ticker
          let sector = 'Other';
          for (const [sectorName, stocks] of Object.entries(STOCKS_BY_SECTOR)) {
            if (stocks.includes(ticker)) {
              sector = sectorName;
              break;
            }
          }

          stockData.push({
            symbol: ticker,
            name: profile?.name || ticker,
            price: quote.c,
            change: quote.d,
            changePercent: quote.dp,
            marketCap: profile?.marketCapitalization || 0,
            sector: sector,
            volume: quote.v || 0,
            high: quote.h,
            low: quote.l,
            open: quote.o,
            previousClose: quote.pc
          });

          // Log progress every 10 stocks
          if ((i + 1) % 10 === 0) {
            console.log(`Processed ${i + 1}/${tickers.length} tickers...`);
          }
        }
      } catch (error) {
        console.error(`Error processing ticker ${ticker}:`, error.message);
      }
    }

    console.log(`Successfully fetched data for ${stockData.length} stocks`);

    // Group by sector and calculate sector totals
    const sectorData = {};
    stockData.forEach(stock => {
      if (!sectorData[stock.sector]) {
        sectorData[stock.sector] = {
          name: stock.sector,
          stocks: [],
          totalMarketCap: 0,
          weightedChange: 0
        };
      }
      sectorData[stock.sector].stocks.push(stock);
      sectorData[stock.sector].totalMarketCap += stock.marketCap;
      sectorData[stock.sector].weightedChange += stock.changePercent * stock.marketCap;
    });

    // Calculate weighted average change for each sector
    Object.values(sectorData).forEach(sector => {
      if (sector.totalMarketCap > 0) {
        sector.averageChange = sector.weightedChange / sector.totalMarketCap;
      }
    });

    const result = {
      sectors: Object.values(sectorData),
      lastUpdated: new Date().toISOString()
    };

    // Cache the result in memory and on disk
    cache.set('heatmap', result);
    savePersistentCache(result);

    console.log('Data refresh completed successfully');
    return result;
  } catch (error) {
    console.error('Error during refresh:', error);
    return null;
  } finally {
    isRefreshing = false;
  }
};

// Main endpoint to get heatmap data
app.get('/api/heatmap', async (req, res) => {
  try {
    // Check in-memory cache first
    let cachedData = cache.get('heatmap');

    if (cachedData) {
      console.log('Returning in-memory cached data');
      return res.json(cachedData);
    }

    // Check persistent cache
    cachedData = loadPersistentCache();

    if (cachedData) {
      const age = Date.now() - new Date(cachedData.lastUpdated).getTime();

      // If cache is fresh enough (< 15 min), return it
      if (age < CACHE_MAX_AGE) {
        console.log('Returning fresh persistent cache');
        cache.set('heatmap', cachedData); // Also set in memory
        return res.json(cachedData);
      }

      // If cache is stale but not too old (< 30 min), return it and refresh in background
      if (age < CACHE_MAX_AGE * 2) {
        console.log('Returning stale cache, refreshing in background...');
        cache.set('heatmap', cachedData);

        // Trigger background refresh (don't await)
        refreshHeatmapData().catch(err =>
          console.error('Background refresh failed:', err)
        );

        return res.json(cachedData);
      }
    }

    // No cache available or too old - fetch fresh data (blocking)
    console.log('No valid cache, fetching fresh data...');
    const freshData = await refreshHeatmapData();

    if (freshData) {
      return res.json(freshData);
    } else {
      // If refresh failed, return stale cache if available
      if (cachedData) {
        console.log('Refresh failed, returning stale cache');
        return res.json(cachedData);
      }

      return res.status(503).json({
        error: 'Unable to fetch data. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error in /api/heatmap:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  if (!process.env.FINNHUB_API_KEY) {
    console.warn('WARNING: FINNHUB_API_KEY not set in .env file');
  }
});
