'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { Bell, Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface PortfolioEntry {
  symbol: string
  totalQuantity: number
  averagePrice: number
}

interface TradeFormData {
    symbol: string;
    quantity: string | number;
    price: string | number;
  }

interface Transaction {
  symbol: string
  quantity: number
  price: number
  type: string
  date: string
}

export default function StockDashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      symbol: '',
      quantity: 0,
      price: 0,
    },
  })

  useEffect(() => {
    fetchPortfolio()
    fetchTransactions()
  }, [])

  const normalizePortfolioEntry = (entry: any): PortfolioEntry => {
    return {
      symbol: entry.symbol,
      totalQuantity: Number(entry.totalQuantity),
      averagePrice: Number(entry.averagePrice)
    };
  };

  const normalizeTradeData = (data: TradeFormData) => {
    return {
      symbol: data.symbol.toUpperCase(),
      quantity: Number(data.quantity),
      price: Number(data.price)
    };
  };

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/portfolio')
      const data = await response.json()
      const normalizedData = data.map(normalizePortfolioEntry);
      setPortfolio(normalizedData);
      //setPortfolio(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching portfolio:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch portfolio data',
        variant: 'destructive',
      })
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/transactions')
      const data = await response.json()
      setTransactions(data)
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch transaction data',
        variant: 'destructive',
      })
    }
  }

  const handleTrade = async (data: any, type: 'buy' | 'sell') => {
    try {
      setIsLoading(true)
      const normalizedData = normalizeTradeData(data);
      const response = await axios.post(`http://localhost:5000/api/${type}`, normalizedData)
      toast({
        title: 'Success',
        description: response.data.message,
      })
      fetchPortfolio()
      fetchTransactions()
      reset()
    } catch (error) {
      console.error(`Error ${type}ing stock:`, error)
      toast({
        title: 'Error',
        description: `Failed to ${type} stock`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Menu className="h-6 w-6" />
            <h1 className="text-xl font-bold">StockOverflow</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/"><Button variant="ghost">Dashboard</Button></Link>
            <Button variant="ghost">Analytics</Button>
            <Button variant="ghost">Settings</Button>
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
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Trade Stocks</CardTitle>
              <CardDescription>Buy or sell stocks in your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((data) => handleTrade(data, 'buy'))}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input id="symbol" {...register('symbol', { required: true })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      {...register('quantity', { required: true, min: 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price', { required: true, min: 0.01 })}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit" onClick={handleSubmit((data) => handleTrade(data, 'buy'))}>
                Buy
              </Button>
              <Button
                type="submit"
                variant="secondary"
                onClick={handleSubmit((data) => handleTrade(data, 'sell'))}
              >
                Sell
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>Your current stock holdings</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : portfolio.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Avg. Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolio.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{entry.symbol}</TableCell>
                        <TableCell>{entry.totalQuantity}</TableCell>
                        <TableCell>${entry.averagePrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground">No stocks in portfolio</p>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your recent stock trades</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(txn.date).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{txn.symbol}</TableCell>
                      <TableCell>{txn.type}</TableCell>
                      <TableCell>{txn.quantity}</TableCell>
                      <TableCell>${txn.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground">No transactions found</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
