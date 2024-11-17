'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Bell, Menu } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

interface StockData {
  Date: string;
  Close: number;
  High: number;
  Low: number;
  Open: number;
  Volume: number;
}

const StockDashboard = () => {
  const [symbol, setSymbol] = useState('AAPL')
  const [symbols, setSymbols] = useState([])
  const [stockData, setStockData] = useState<StockData[] | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  })
  const [nextDayPrediction, setNextDayPrediction] = useState<number | null>(
    null
  );
  const [nextMonthPredictions, setNextMonthPredictions] = useState<number[]>(
    []
  );
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSymbols()
  }, [])

  useEffect(() => {
    if (symbol && dateRange.start && dateRange.end) {
      fetchStockData()
      fetchStockPrediction();
    }
  }, [symbol, dateRange])

  const fetchSymbols = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/symbols')
      const data = await response.json()
      setSymbols(data)
    } catch (error) {
      console.error('Error fetching symbols:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch stock symbols',
        variant: 'destructive',
      })
    }
  }

  const fetchStockData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/stock-data?symbol=${symbol}&startDate=${dateRange.start.toISOString().split('T')[0]}&endDate=${dateRange.end.toISOString().split('T')[0]}`)
      const data = await response.json()
      setStockData(data)
    } catch (error) {
      console.error('Error fetching stock data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch stock data',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  const fetchStockPrediction = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/stock-prediction?symbol=${symbol}`
      );
      const data = await response.json();
      setNextDayPrediction(data.next_day_prediction);
      setNextMonthPredictions(data.next_month_predictions);
    } catch (error) {
      console.error("Error fetching stock prediction:", error);
      toast({
        title: "Error",
        description: "Failed to fetch stock prediction",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-4">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Menu className="h-6 w-6" />
            <h1 className="text-xl font-bold">StockOverflow</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="ghost">Dashboard</Button>
            <Button variant="ghost">Analytics</Button>
            <Link href="/portfolio"><Button variant="ghost">Portfolio</Button></Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>No new notifications</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Stock Analysis</CardTitle>
            <CardDescription>Select a stock and date range to view detailed charts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col flex-wrap gap-4 items-start">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select stock" />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map(sym => (
                    <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Calendar
                mode="range"
                selected={{
                  from: dateRange.start,
                  to: dateRange.end
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ start: range.from, end: range.to })
                  }
                }}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

            <Card className='mb-6'>
              <CardHeader>
                <CardTitle className="text-xl">Prediction for {symbol}</CardTitle>
              </CardHeader>
              <CardContent>
                {nextDayPrediction !== null ? (
                  <p className="text-lg">
                    The predicted price for the next trading day is: $
                    {nextDayPrediction.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-lg">Loading next day prediction...</p>
                )}
                {nextMonthPredictions.length > 0 ? (
                  <div>
                    <h3 className="text-lg my-2">Next Month Predictions:</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart
                        data={nextMonthPredictions.map((price, index) => ({
                          day: index + 1,
                          price
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#82ca9d"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-lg">Loading next month predictions...</p>
                )}
              </CardContent>
            </Card>
      </div>

        {loading ? (
          <Card>
            <CardContent className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </CardContent>
          </Card>
        ) : stockData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>OHLC Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Date" />
                    <YAxis domain={[dataMin => (Math.round(dataMin) - 10), dataMax => (Math.round(dataMax) + 10)]}/>
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="High" stroke="#6d28d9" strokeWidth={2}/>
                    <Line type="monotone" dataKey="Low" stroke="#2563eb" strokeWidth={2}/>
                    <Line type="monotone" dataKey="Open" stroke="#d97706" strokeWidth={2}/>
                    <Line type="monotone" dataKey="Close" stroke="#f43f5e" strokeWidth={2}/>
                  </LineChart> 
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Date" />
                    <YAxis/>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Volume" fill="#5b21b6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Closing Price</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Close" stroke="#5b21b6" strokeWidth={2} fill="#ddd6fe" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Moving Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={stockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="Date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Close" stroke="#5b21b6" strokeWidth={2} name="Price" />
                    <Line type="monotone" dataKey="MA50" stroke="#3b82f6" strokeWidth={2} name="50 MA" />
                    <Line type="monotone" dataKey="MA200" stroke="#e879f9" strokeWidth={2} name="200 MA" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default StockDashboard