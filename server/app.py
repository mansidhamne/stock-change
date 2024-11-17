from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from alpha_vantage.timeseries import TimeSeries
import os

API_KEY = 'WQ66CQ198JTTGZK0'

app = Flask(__name__)
CORS(app)  # Enable CORS

uri = os.environ.get('MONGODB_URI')
# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))
try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db = client['stockDashboard']
transactions_collection = db['transactions']
portfolio_collection = db['portfolio']

class StockDataset(Dataset):
    def __init__(self, data, lookback=60):
        self.data = data
        self.lookback = lookback

    def __len__(self):
        return len(self.data) - self.lookback

    def __getitem__(self, index):
        x = self.data[index:index + self.lookback]
        y = self.data[index + self.lookback]
        return torch.tensor(x, dtype=torch.float32), torch.tensor(y, dtype=torch.float32)

def fetch_stock_data_lstm(symbol):
    ts = TimeSeries(key=API_KEY, output_format='pandas')
    data, _ = ts.get_daily(symbol=symbol, outputsize='full')
    data = data['4. close']
    data.index = pd.to_datetime(data.index)
    five_years_ago = datetime.now() - timedelta(days=5*365)
    recent_data = data[data.index >= five_years_ago]
    recent_data = recent_data[::-1]
    return recent_data

def normalize(data):
    return (data - np.min(data)) / (np.max(data) - np.min(data)), np.min(data), np.max(data)

class LSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=50, num_layers=1):
        super(LSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

def train_lstm_model(symbol):
    stock_data = fetch_stock_data_lstm(symbol)
    normalized_data, data_min, data_max = normalize(stock_data.values)
    lookback = 60
    dataset = StockDataset(normalized_data, lookback)
    train_size = int(len(dataset) * 0.8)
    train_data, test_data = torch.utils.data.random_split(dataset, [train_size, len(dataset) - train_size])
    train_loader = DataLoader(train_data, batch_size=32, shuffle=True)
    test_loader = DataLoader(test_data, batch_size=32, shuffle=False)

    device = torch.device('cpu' if torch.cuda.is_available() else 'cpu')
    model = LSTM().to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    epochs = 100
    for epoch in range(epochs):
        model.train()
        for x, y in train_loader:
            x, y = x.unsqueeze(-1).to(device), y.to(device)
            optimizer.zero_grad()
            outputs = model(x)
            loss = criterion(outputs, y.unsqueeze(-1))
            loss.backward()
            optimizer.step()

    model.eval()
    predictions = []
    actuals = []
    with torch.no_grad():
        for x, y in test_loader:
            x = x.unsqueeze(-1).to(device)
            predictions.extend(model(x).cpu().numpy())
            actuals.extend(y.numpy())

    predictions = np.array(predictions).flatten()
    actuals = np.array(actuals)
    predictions = predictions * (data_max - data_min) + data_min
    actuals = actuals * (data_max - data_min) + data_min

    return model, data_min, data_max, lookback, normalized_data

def predict_next_day(model, data_min, data_max, lookback, normalized_data):
    device = torch.device('cpu' if torch.cuda.is_available() else 'cpu')
    with torch.no_grad():
        last_60_days = normalized_data[-lookback:]
        last_60_days_tensor = torch.tensor(last_60_days, dtype=torch.float32).unsqueeze(0).unsqueeze(-1).to(device)
        next_day_prediction = model(last_60_days_tensor).item()
        next_day_prediction = next_day_prediction * (data_max - data_min) + data_min
    return next_day_prediction

def predict_next_month(model, data_min, data_max, lookback, normalized_data):
    device = torch.device('cpu' if torch.cuda.is_available() else 'cpu')
    predictions = []
    current_data = normalized_data[-lookback:]
    for _ in range(30):
        with torch.no_grad():
            current_data_tensor = torch.tensor(current_data, dtype=torch.float32).unsqueeze(0).unsqueeze(-1).to(device)
            next_day_prediction = model(current_data_tensor).item()
            next_day_prediction = next_day_prediction * (data_max - data_min) + data_min
            predictions.append(next_day_prediction)
            # Update current_data with the new prediction
            next_day_normalized = (next_day_prediction - data_min) / (data_max - data_min)
            current_data = np.append(current_data[1:], next_day_normalized)
    return predictions

# Buy stocks
@app.route('/api/buy', methods=['POST'])
def buy_stock():
    data = request.json
    symbol = data.get('symbol')
    quantity = data.get('quantity')
    price = data.get('price')

    if not symbol or not quantity or not price:
        return jsonify({'message': 'All fields are required'}), 400

    transaction = {
        'symbol': symbol,
        'quantity': quantity,
        'price': price,
        'type': 'buy',
        'date': datetime.now()
    }
    transactions_collection.insert_one(transaction)

    portfolio_entry = portfolio_collection.find_one({'symbol': symbol})
    if portfolio_entry:
        total_cost = portfolio_entry['totalQuantity'] * portfolio_entry['averagePrice'] + quantity * price
        total_quantity = portfolio_entry['totalQuantity'] + quantity
        new_average_price = total_cost / total_quantity
        portfolio_collection.update_one(
            {'symbol': symbol},
            {'$set': {'totalQuantity': total_quantity, 'averagePrice': new_average_price}}
        )
    else:
        portfolio_collection.insert_one({
            'symbol': symbol,
            'totalQuantity': quantity,
            'averagePrice': price
        })

    return jsonify({'message': 'Stock bought successfully'}), 201

# Sell stocks
@app.route('/api/sell', methods=['POST'])
def sell_stock():
    data = request.json
    symbol = data.get('symbol')
    quantity = data.get('quantity')
    price = data.get('price')

    if not symbol or not quantity or not price:
        return jsonify({'message': 'All fields are required'}), 400

    portfolio_entry = portfolio_collection.find_one({'symbol': symbol})
    if not portfolio_entry or portfolio_entry['totalQuantity'] < quantity:
        return jsonify({'message': 'Not enough stock to sell'}), 400

    transaction = {
        'symbol': symbol,
        'quantity': quantity,
        'price': price,
        'type': 'sell',
        'date': datetime.now()
    }
    transactions_collection.insert_one(transaction)

    new_quantity = portfolio_entry['totalQuantity'] - quantity
    if new_quantity == 0:
        portfolio_collection.delete_one({'symbol': symbol})
    else:
        portfolio_collection.update_one(
            {'symbol': symbol},
            {'$set': {'totalQuantity': new_quantity}}
        )

    return jsonify({'message': 'Stock sold successfully'}), 201

# Get portfolio
@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    portfolio = list(portfolio_collection.find({}, {'_id': 0}))
    return jsonify(portfolio)

# Get stock transactions
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    transactions = list(transactions_collection.find({}, {'_id': 0}))
    return jsonify(transactions)


def fetch_stock_data(symbol, start_date, end_date):
    stock_data = yf.download(symbol, start=start_date, end=end_date)
    
    if stock_data.empty:
        return None
    
    # Flatten the MultiIndex columns
    stock_data.columns = [col[0] for col in stock_data.columns]
    
    # Add Date column and reset index
    stock_data['Date'] = stock_data.index
    stock_data.reset_index(drop=True, inplace=True)

    stock_data = stock_data.where(pd.notnull(stock_data), None)
    
    # Convert DataFrame to dictionary
    return stock_data.to_dict('records')

@app.route('/api/stock-data', methods=['GET'])
def get_stock_data():
    symbol = request.args.get('symbol', 'AAPL')
    start_date = request.args.get('startDate', '2024-08-01')
    end_date = request.args.get('endDate', datetime.now().strftime('%Y-%m-%d'))
    
    data = fetch_stock_data(symbol, start_date, end_date)
    if data is None:
        return jsonify({'error': 'No data found'}), 404
        
    return jsonify(data)

@app.route('/api/symbols', methods=['GET'])
def get_symbols():
    symbols = ["AAPL", "GOOG", "MSFT", "AMZN", "TSLA", "META", "NFLX", "NVDA", "BABA", "INTC"]
    return jsonify(symbols)

@app.route('/api/stock-prediction', methods=['GET'])
def get_stock_prediction():
    symbol = request.args.get('symbol', 'AAPL')
    model, data_min, data_max, lookback, normalized_data = train_lstm_model(symbol)
    next_day_prediction = predict_next_day(model, data_min, data_max, lookback, normalized_data)
    next_month_predictions = predict_next_month(model, data_min, data_max, lookback, normalized_data)
    return jsonify({
        'symbol': symbol,
        'next_day_prediction': next_day_prediction,
        'next_month_predictions': next_month_predictions
    })

@app.route('/')
def index():
    return "Server is running!"

if __name__ == '__main__':
    app.run(debug=True, port=5000)
