# Stock Market Heatmap

A production-ready stock market heatmap visualization inspired by Finviz, built with React, TypeScript, D3.js, and real-time stock data.

![Stock Market Heatmap](https://img.shields.io/badge/React-19.2.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue) ![D3.js](https://img.shields.io/badge/D3.js-7.8.5-orange) ![Node.js](https://img.shields.io/badge/Node.js-Express-green)

## Features

- **Real-time Stock Data**: Live data from Finnhub API for S&P 500 stocks
- **Interactive Treemap**: D3.js-powered visualization with size based on market capitalization
- **Color-coded Performance**: Intuitive green/red color scheme showing stock performance
- **Sector Grouping**: Stocks organized by 11 major sectors (Technology, Healthcare, Financial, etc.)
- **Sector Filtering**: Click to filter and view specific sectors
- **Detailed Tooltips**: Hover over stocks to see price, change, volume, and more
- **Responsive Design**: Adapts to different screen sizes
- **Auto-refresh**: Data automatically updates every 5 minutes
- **Production-ready**: Backend caching, error handling, and optimized performance

## Tech Stack

### Frontend
- **React 19.2** with TypeScript
- **Vite** - Fast build tool
- **D3.js** - Data visualization
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

### Backend
- **Node.js** with Express
- **Finnhub API** - Real-time stock data
- **Node-Cache** - API response caching (5 min TTL)
- **CORS** enabled for development

## Prerequisites

- Node.js 18+ and npm
- Finnhub API key (free tier available)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Finance-map
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Finnhub API key:

```
FINNHUB_API_KEY=your_finnhub_api_key_here
PORT=3001
```

**Get your free Finnhub API key:**
1. Go to [https://finnhub.io/](https://finnhub.io/)
2. Sign up for a free account
3. Copy your API key from the dashboard

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory (optional):

```bash
cp .env.example .env
```

The default API URL is `http://localhost:3001`. You can customize it in the `.env` file:

```
VITE_API_URL=http://localhost:3001
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Or for auto-reload during development:
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## Project Structure

```
Finance-map/
├── backend/
│   ├── server.js           # Express server with API endpoints
│   ├── package.json        # Backend dependencies
│   ├── .env.example        # Environment variables template
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Treemap.tsx # D3.js treemap component
│   │   ├── App.tsx         # Main application component
│   │   ├── types.ts        # TypeScript type definitions
│   │   ├── index.css       # Tailwind CSS imports
│   │   └── main.tsx        # App entry point
│   ├── package.json        # Frontend dependencies
│   ├── tailwind.config.js  # Tailwind configuration
│   ├── vite.config.ts      # Vite configuration
│   └── .env.example        # Environment variables template
└── README.md
```

## API Endpoints

### `GET /api/heatmap`
Returns hierarchical stock data grouped by sectors.

**Response:**
```json
{
  "sectors": [
    {
      "name": "Technology",
      "stocks": [
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "price": 175.50,
          "change": 2.30,
          "changePercent": 1.33,
          "marketCap": 2800,
          "sector": "Technology",
          "volume": 50000000,
          "high": 176.20,
          "low": 174.80,
          "open": 175.00,
          "previousClose": 173.20
        }
      ],
      "totalMarketCap": 15000,
      "averageChange": 1.25
    }
  ],
  "lastUpdated": "2025-11-17T15:00:00.000Z"
}
```

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T15:00:00.000Z"
}
```

## Features in Detail

### Treemap Visualization
- Rectangles sized by market capitalization
- Color intensity shows performance magnitude
- Stocks grouped by sectors with sector labels
- Smooth animations and transitions

### Color Scheme
- **Dark Green** (`#00AA00`): > +3%
- **Green** (`#44CC44`): +1% to +3%
- **Light Green** (`#66DD66`): 0% to +1%
- **Light Red** (`#FF6666`): 0% to -1%
- **Red** (`#FF4444`): -1% to -3%
- **Dark Red** (`#BB0000`): < -3%

### Sectors Covered
1. Technology
2. Healthcare
3. Financial
4. Consumer Cyclical
5. Communication
6. Consumer Defensive
7. Industrials
8. Energy
9. Basic Materials
10. Real Estate
11. Utilities

## Performance Optimizations

- **Backend caching**: API responses cached for 5 minutes
- **Batch API requests**: Stocks fetched in batches to respect rate limits
- **Smart re-rendering**: React components optimized with proper dependencies
- **Responsive sizing**: Treemap adapts to window size

## Customization

### Add More Stocks
Edit `backend/server.js` and modify the `STOCKS_BY_SECTOR` object to include additional tickers.

### Adjust Cache Duration
In `backend/server.js`, change the cache TTL:
```javascript
const cache = new NodeCache({ stdTTL: 300 }); // 300 seconds = 5 minutes
```

### Modify Color Scheme
In `frontend/src/components/Treemap.tsx`, update the `colorScale` function.

### Change Refresh Interval
In `frontend/src/App.tsx`, adjust the interval:
```javascript
const interval = setInterval(fetchData, 5 * 60 * 1000); // 5 minutes
```

## Troubleshooting

### "Failed to fetch data"
- Ensure backend server is running on port 3001
- Check that your Finnhub API key is valid
- Verify CORS settings if running on different domains

### "API rate limit exceeded"
- Finnhub free tier has rate limits (60 calls/minute)
- Backend implements batching and delays to stay within limits
- Consider upgrading Finnhub plan for production use

### No data showing
- Check browser console for errors
- Verify API key is set in `backend/.env`
- Check network tab to see if API calls are successful

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Acknowledgments

- Inspired by [Finviz Stock Map](https://finviz.com/map.ashx)
- Stock data provided by [Finnhub API](https://finnhub.io/)
- Built with [D3.js](https://d3js.org/) for data visualization

## Deployment

For production deployment:

1. **Backend**: Deploy to services like Heroku, Railway, or DigitalOcean
2. **Frontend**: Deploy to Vercel, Netlify, or Cloudflare Pages
3. Update `VITE_API_URL` in frontend to point to production backend
4. Set environment variables on hosting platforms
5. Consider upgrading Finnhub API plan for higher rate limits

## Support

For issues or questions, please open an issue on GitHub.
