const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Cache for 15 minutes (increased to reduce API calls since full fetch takes ~6 minutes)
const cache = new NodeCache({ stdTTL: 900 });

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

// Fetch with retry logic and exponential backoff
const fetchWithRetry = async (url, params, retryCount = 0) => {
  try {
    await sleep(RATE_LIMIT.requestDelay); // Delay before each request
    const response = await axios.get(url, { params });
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

    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
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

// Main endpoint to get heatmap data
app.get('/api/heatmap', async (req, res) => {
  try {
    // Check cache first
    const cachedData = cache.get('heatmap');
    if (cachedData) {
      console.log('Returning cached data');
      return res.json(cachedData);
    }

    console.log('Fetching fresh data...');
    const tickers = getAllTickers();
    const stockData = [];

    // Fetch data for all stocks sequentially to respect rate limits
    // With requestDelay of 1.1s per request and 2 requests per ticker,
    // this will take ~2.2s per ticker (well under 60 requests/minute)
    console.log(`Processing ${tickers.length} tickers...`);

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];

      try {
        // Fetch quote and profile sequentially (not in parallel) to better control rate
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

    // Cache the result
    cache.set('heatmap', result);

    res.json(result);
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
