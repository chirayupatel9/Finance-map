import { useState, useEffect } from 'react';
import axios from 'axios';
import { Treemap } from './components/Treemap';
import type { HeatmapData, TreemapNode, Sector } from './types';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });

  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth - 40, 1600);
      const height = Math.min(window.innerHeight - 200, 900);
      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh data every 15 minutes (matches backend cache TTL)
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<HeatmapData>(`${API_URL}/api/heatmap`);
      setData(response.data);
    } catch (err) {
      setError('Failed to fetch data. Make sure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const transformToTreemapData = (heatmapData: HeatmapData): TreemapNode => {
    let sectors = heatmapData.sectors;

    // Filter by selected sectors if any are selected
    if (selectedSectors.size > 0) {
      sectors = sectors.filter(sector => selectedSectors.has(sector.name));
    }

    return {
      name: 'Market',
      value: 0,
      change: 0,
      changePercent: 0,
      type: 'sector',
      children: sectors.map(sector => ({
        name: sector.name,
        value: sector.totalMarketCap,
        change: 0,
        changePercent: sector.averageChange || 0,
        type: 'sector' as const,
        children: sector.stocks.map(stock => ({
          name: stock.symbol,
          value: stock.marketCap,
          change: stock.change,
          changePercent: stock.changePercent,
          type: 'stock' as const,
          stock: stock
        }))
      }))
    };
  };

  const toggleSector = (sectorName: string) => {
    setSelectedSectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectorName)) {
        newSet.delete(sectorName);
      } else {
        newSet.add(sectorName);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedSectors(new Set());
  };

  const getSectorStats = (sector: Sector) => {
    const avgChange = sector.averageChange || 0;
    const stockCount = sector.stocks.length;
    return { avgChange, stockCount };
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <div className="text-white text-xl">Loading market data...</div>
          <div className="text-gray-400 text-sm mt-2">First load may take 5-7 minutes due to API rate limits</div>
          <div className="text-gray-500 text-xs mt-1">Subsequent requests will be cached for 15 minutes</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠ {error}</div>
          <button
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const treemapData = transformToTreemapData(data);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-5">
      <div className="max-w-screen-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Stock Market Heatmap</h1>
              <p className="text-gray-400 text-sm mt-1">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  🔄 Refresh
                </>
              )}
            </button>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-6 mb-4">
            <span className="text-sm text-gray-400">Performance:</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#00AA00' }}></div>
                <span className="text-xs text-gray-400">&gt;3%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#44CC44' }}></div>
                <span className="text-xs text-gray-400">1-3%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#66DD66' }}></div>
                <span className="text-xs text-gray-400">0-1%</span>
              </div>
              <div className="w-px h-4 bg-gray-600"></div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#FF6666' }}></div>
                <span className="text-xs text-gray-400">0 to -1%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#FF4444' }}></div>
                <span className="text-xs text-gray-400">-1 to -3%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4" style={{ backgroundColor: '#BB0000' }}></div>
                <span className="text-xs text-gray-400">&lt;-3%</span>
              </div>
            </div>
          </div>

          {/* Sector Filters */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Filter by Sector:</span>
              {selectedSectors.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.sectors.map(sector => {
                const { avgChange, stockCount } = getSectorStats(sector);
                const isSelected = selectedSectors.has(sector.name);
                return (
                  <button
                    key={sector.name}
                    onClick={() => toggleSector(sector.name)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {sector.name}
                    <span className={`ml-2 ${avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
                    </span>
                    <span className="ml-1 text-gray-500 text-xs">
                      ({stockCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Treemap */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
          <Treemap
            data={treemapData}
            width={dimensions.width}
            height={dimensions.height}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Data powered by Finnhub API • Rectangles sized by market capitalization</p>
        </div>
      </div>
    </div>
  );
}

export default App;
