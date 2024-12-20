import axios from 'axios';

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol, startDate, endDate } = req.query;

  try {
    const response = await axios.get(`http://localhost:5000/api/stock-data`, {
      params: {
        symbol,
        startDate,
        endDate
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}