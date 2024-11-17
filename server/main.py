import dash
from dash import dcc, html
import plotly.graph_objs as go
import yfinance as yf
import pandas as pd
import numpy as np
import dash_bootstrap_components as dbc
from dash.dependencies import Input, Output
from plotly.subplots import make_subplots

# Initialize the Dash app
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.BOOTSTRAP])

# Define a list of popular stock symbols
stock_symbols = ["AAPL", "GOOG", "MSFT", "AMZN", "TSLA", "META", "NFLX", "NVDA", "BABA", "INTC"]

# Define the app layout
app.layout = html.Div([
    dbc.Row([
        dbc.Col([
            html.H1("Stock Data Visualization"),
            dcc.Dropdown(
                id='symbol',
                options=[{'label': symbol, 'value': symbol} for symbol in stock_symbols],
                value='AAPL',
                style={'width': '50%'}
            ),
            dcc.DatePickerRange(
                id='dateRange',
                start_date=pd.to_datetime('2024-01-01'),
                end_date=pd.to_datetime('today'),
                display_format='YYYY-MM-DD'
            )
        ], width=4),
        
        dbc.Col([
            dcc.Graph(id='ohlcPlot'),
            dcc.Graph(id='volumePlot'),
            dcc.Graph(id='closingPricePlot'),
            dcc.Graph(id='movingAveragePlot')
        ], width=8)
    ])
])

# Fetch stock data from Yahoo Finance
def fetch_stock_data(symbol, start_date, end_date):
    # Fetch stock data from Yahoo Finance
    stock_data = yf.download(symbol, start=start_date, end=end_date)
    
    if stock_data.empty:
        print(f"No data found for {symbol}")
        return pd.DataFrame()  # Return empty DataFrame if no data is available
    
    # Flatten the MultiIndex columns by joining the levels
    stock_data.columns = [col[0] for col in stock_data.columns]
    
    # Add Date column and reset index
    stock_data['Date'] = stock_data.index
    stock_data.reset_index(drop=True, inplace=True)
    
    # Ensure columns are numeric
    stock_data['Open'] = pd.to_numeric(stock_data['Open'], errors='coerce')
    stock_data['High'] = pd.to_numeric(stock_data['High'], errors='coerce')
    stock_data['Low'] = pd.to_numeric(stock_data['Low'], errors='coerce')
    stock_data['Close'] = pd.to_numeric(stock_data['Close'], errors='coerce')
    stock_data['Volume'] = pd.to_numeric(stock_data['Volume'], errors='coerce')
    
    # Fill missing data if any
    stock_data.fillna(method='ffill', inplace=True)
    
    return stock_data

# Update the plots based on user input
@app.callback(
    [Output('ohlcPlot', 'figure'),
     Output('volumePlot', 'figure'),
     Output('closingPricePlot', 'figure'),
     Output('movingAveragePlot', 'figure')],
    [Input('symbol', 'value'),
     Input('dateRange', 'start_date'),
     Input('dateRange', 'end_date')]
)
def update_plots(symbol, start_date, end_date):
    # Convert string dates to datetime
    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)

    # Fetch stock data
    stock_data = fetch_stock_data(symbol, start_date, end_date)
    print(f"Fetched data for {symbol} from {start_date} to {end_date}")
    
    if stock_data.empty:
        print("No data fetched!")
    
    # Create OHLC plot
    ohlc_fig = go.Figure(data=[go.Candlestick(
    x=stock_data['Date'],
    open=stock_data['Open'],
    high=stock_data['High'],
    low=stock_data['Low'],
    close=stock_data['Close'],
    name=f"{symbol} Candlestick"
    )])
    ohlc_fig.update_layout(title=f"OHLC Chart for {symbol}", xaxis_title="Date", yaxis_title="Price")
    
    # Create Volume plot
    volume_fig = go.Figure(data=[go.Bar(
        x=stock_data['Date'],
        y=stock_data['Volume'],
        name="Volume Traded",
        marker=dict(color='steelblue')
    )])
    volume_fig.update_layout(title="Volume Traded", xaxis_title="Date", yaxis_title="Volume")
    
    # Create Closing Price plot
    closing_price_fig = go.Figure(data=[go.Scatter(
        x=stock_data['Date'],
        y=stock_data['Close'],
        mode='lines',
        name="Closing Price",
        line=dict(color='darkgreen')
    )])
    closing_price_fig.update_layout(title="Closing Price Over Time", xaxis_title="Date", yaxis_title="Closing Price")
    
    # Create Moving Average plot
    stock_data['MA50'] = stock_data['Close'].rolling(window=50).mean()
    stock_data['MA200'] = stock_data['Close'].rolling(window=200).mean()
    
    moving_avg_fig = go.Figure()
    moving_avg_fig.add_trace(go.Scatter(
        x=stock_data['Date'],
        y=stock_data['Close'],
        mode='lines',
        name="Closing Price",
        line=dict(color='darkgreen')
    ))
    moving_avg_fig.add_trace(go.Scatter(
        x=stock_data['Date'],
        y=stock_data['MA50'],
        mode='lines',
        name="50-day Moving Avg",
        line=dict(color='blue', dash='dash')
    ))
    moving_avg_fig.add_trace(go.Scatter(
        x=stock_data['Date'],
        y=stock_data['MA200'],
        mode='lines',
        name="200-day Moving Avg",
        line=dict(color='red', dash='dash')
    ))
    moving_avg_fig.update_layout(title="Closing Price with Moving Averages", xaxis_title="Date", yaxis_title="Price")
    
    return ohlc_fig, volume_fig, closing_price_fig, moving_avg_fig

# Run the Dash app
if __name__ == '__main__':
    app.run_server(debug=True)