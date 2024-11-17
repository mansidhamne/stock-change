import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StockDashboard = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);

  const stockSymbols = [
    'AAPL', 'GOOG', 'MSFT', 'AMZN', 'TSLA', 
    'META', 'NFLX', 'NVDA', 'BABA', 'INTC'
  ];

  useEffect(() => {
    fetchStockData();
  }, [symbol, dateRange]);

  const fetchStockData = async () => {
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/stock-data?symbol=${symbol}&startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`);
      const data = await response.json();
      setStockData(data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Stock Data Visualization</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block mb-2">Stock Symbol</label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stock" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockSymbols.map(sym => (
                      <SelectItem key={sym} value={sym}>
                        {sym}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block mb-2">Date Range</label>
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.start,
                    to: dateRange.end
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ start: range.from, end: range.to });
                    }
                  }}
                  className="rounded-md border"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Price Chart</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                Loading...
              </div>
            ) : stockData ? (
              <LineChart
                width={800}
                height={400}
                data={stockData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="close" stroke="#8884d8" name="Closing Price" />
                <Line type="monotone" dataKey="ma50" stroke="#82ca9d" name="50-day MA" />
                <Line type="monotone" dataKey="ma200" stroke="#ff7300" name="200-day MA" />
              </LineChart>
            ) : (
              <div className="h-64 flex items-center justify-center">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                Loading...
              </div>
            ) : stockData ? (
              <LineChart
                width={500}
                height={300}
                data={stockData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#82ca9d" name="Volume" />
              </LineChart>
            ) : (
              <div className="h-64 flex items-center justify-center">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                Loading...
              </div>
            ) : stockData ? (
              <LineChart
                width={500}
                height={300}
                data={stockData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="high" stroke="#82ca9d" name="High" />
                <Line type="monotone" dataKey="low" stroke="#8884d8" name="Low" />
              </LineChart>
            ) : (
              <div className="h-64 flex items-center justify-center">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockDashboard;