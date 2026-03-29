#!/usr/bin/env python3
"""
W3B Stock Price Relayer — Off-Chain Oracle for Synthetic Assets

Fetches real-time stock prices from multiple APIs and pushes them
to the OracleAggregator contract's custom feed.

Data Sources:
  1. Marketstack API (primary) — free tier
  2. iTick.org API (secondary) — free tier

Usage:
    export MARKETSTACK_API_KEY=<your_key>
    export ITICK_API_KEY=<your_key>
    export RPC_URL=https://mainnet.base.org
    export PRIVATE_KEY=<relayer_private_key>
    export ORACLE_ADDRESS=<OracleAggregator_address>
    python3 stock_price_relayer.py

Config:
    Edit TRACKED_ASSETS to add/remove stocks.
"""

import os
import sys
import time
import json
import logging
from typing import Optional, Dict, List, Tuple

import requests

# ─────────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("stock_relayer.log"),
    ],
)
logger = logging.getLogger("stock_relayer")

# API Keys
MARKETSTACK_API_KEY = os.getenv("MARKETSTACK_API_KEY", "")
ITICK_API_KEY = os.getenv("ITICK_API_KEY", "")

# Blockchain
RPC_URL = os.getenv("RPC_URL", "https://mainnet.base.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
ORACLE_ADDRESS = os.getenv("ORACLE_ADDRESS", "")

# Tracked assets: { symbol: custom_feed_address }
TRACKED_ASSETS: Dict[str, str] = {
    "AAPL": "",   # Set after deployment
    "TSLA": "",
    "GOOGL": "",
    "MSFT": "",
    "AMZN": "",
    "META": "",
    "NVDA": "",
    "SPY": "",    # S&P 500 ETF
}

# Relayer settings
POLL_INTERVAL = 60       # Seconds between price updates
PRICE_DECIMALS = 8       # Push prices with 8 decimal places
MAX_DEVIATION_PCT = 2.0  # Reject if sources disagree > 2%


# ─────────────────────────────────────────────────────────────
#  Data Source: Marketstack
# ─────────────────────────────────────────────────────────────

class MarketstackFeed:
    """Fetches stock prices from Marketstack API (free tier)."""

    BASE_URL = "http://api.marketstack.com/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_price(self, symbol: str) -> Optional[float]:
        """Get latest price for a stock symbol."""
        try:
            resp = requests.get(
                f"{self.BASE_URL}/eod/latest",
                params={
                    "access_key": self.api_key,
                    "symbols": symbol,
                    "limit": 1,
                },
                timeout=10,
            )
            data = resp.json()
            if "data" in data and len(data["data"]) > 0:
                return float(data["data"][0]["close"])
            logger.warning(f"Marketstack: no data for {symbol}")
            return None
        except Exception as e:
            logger.error(f"Marketstack error for {symbol}: {e}")
            return None

    def get_prices_batch(self, symbols: List[str]) -> Dict[str, Optional[float]]:
        """Fetch prices for multiple symbols at once."""
        try:
            resp = requests.get(
                f"{self.BASE_URL}/eod/latest",
                params={
                    "access_key": self.api_key,
                    "symbols": ",".join(symbols),
                    "limit": len(symbols),
                },
                timeout=15,
            )
            data = resp.json()
            prices = {}
            if "data" in data:
                for item in data["data"]:
                    prices[item["symbol"]] = float(item["close"])
            return prices
        except Exception as e:
            logger.error(f"Marketstack batch error: {e}")
            return {}


# ─────────────────────────────────────────────────────────────
#  Data Source: iTick.org
# ─────────────────────────────────────────────────────────────

class ITickFeed:
    """Fetches stock prices from iTick.org API (free tier)."""

    BASE_URL = "https://api.itick.org/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def get_price(self, symbol: str) -> Optional[float]:
        """Get latest price for a stock symbol."""
        try:
            resp = requests.get(
                f"{self.BASE_URL}/stock/quote",
                params={"symbol": symbol},
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            data = resp.json()
            if "data" in data and "price" in data["data"]:
                return float(data["data"]["price"])
            logger.warning(f"iTick: no data for {symbol}")
            return None
        except Exception as e:
            logger.error(f"iTick error for {symbol}: {e}")
            return None


# ─────────────────────────────────────────────────────────────
#  Price Aggregation
# ─────────────────────────────────────────────────────────────

def aggregate_price(prices: List[float], max_deviation_pct: float = MAX_DEVIATION_PCT) -> Optional[float]:
    """
    Aggregate prices from multiple sources using median.
    Rejects if sources disagree by more than max_deviation_pct.
    """
    valid = [p for p in prices if p is not None and p > 0]
    if not valid:
        return None

    if len(valid) == 1:
        return valid[0]

    # Check deviation
    for i in range(len(valid)):
        for j in range(i + 1, len(valid)):
            avg = (valid[i] + valid[j]) / 2
            deviation = abs(valid[i] - valid[j]) / avg * 100
            if deviation > max_deviation_pct:
                logger.warning(
                    f"Price deviation too high: {valid[i]:.2f} vs {valid[j]:.2f} "
                    f"({deviation:.2f}% > {max_deviation_pct}%)"
                )
                # Use the primary (first) source as fallback
                return valid[0]

    # Median
    valid.sort()
    mid = len(valid) // 2
    if len(valid) % 2 == 0:
        return (valid[mid - 1] + valid[mid]) / 2
    return valid[mid]


# ─────────────────────────────────────────────────────────────
#  On-Chain Relayer
# ─────────────────────────────────────────────────────────────

class OnChainRelayer:
    """Pushes aggregated prices to OracleAggregator contract."""

    ORACLE_ABI = json.loads("""[
        {"inputs":[{"name":"feeds","type":"address[]"},{"name":"prices_","type":"int256[]"},{"name":"decimals_","type":"uint8[]"}],"name":"batchSetCustomPrices","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"inputs":[{"name":"feed","type":"address"},{"name":"price","type":"int256"},{"name":"decimals_","type":"uint8"}],"name":"setCustomPrice","outputs":[],"stateMutability":"nonpayable","type":"function"}
    ]""")

    def __init__(self):
        try:
            from web3 import Web3
            self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        except ImportError:
            logger.error("web3 not installed. Run: pip install web3")
            sys.exit(1)

        if PRIVATE_KEY:
            self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
        else:
            self.account = None
            logger.warning("No private key — dry run mode")

        self.oracle = self.w3.eth.contract(
            address=Web3.to_checksum_address(ORACLE_ADDRESS),
            abi=self.ORACLE_ABI,
        )

    def push_prices(self, prices: Dict[str, float]) -> bool:
        """Push batch prices to the oracle contract."""
        if not self.account:
            logger.info(f"[DRY RUN] Would push: {prices}")
            return True

        feeds = []
        price_values = []
        decimals = []

        for symbol, price in prices.items():
            feed_addr = TRACKED_ASSETS.get(symbol)
            if not feed_addr:
                continue
            feeds.append(feed_addr)
            price_values.append(int(price * 10**PRICE_DECIMALS))
            decimals.append(PRICE_DECIMALS)

        if not feeds:
            return False

        try:
            from web3 import Web3

            tx = self.oracle.functions.batchSetCustomPrices(
                feeds, price_values, decimals
            ).build_transaction({
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "gas": 300_000,
                "maxFeePerGas": Web3.to_wei(0.1, "gwei"),
                "maxPriorityFeePerGas": Web3.to_wei(0.01, "gwei"),
            })

            signed = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            if receipt.status == 1:
                logger.info(f"✅ Prices pushed: {tx_hash.hex()}")
                return True
            else:
                logger.error(f"❌ TX failed: {tx_hash.hex()}")
                return False

        except Exception as e:
            logger.error(f"Push error: {e}")
            return False


# ─────────────────────────────────────────────────────────────
#  Main Loop
# ─────────────────────────────────────────────────────────────

def main():
    logger.info("=" * 60)
    logger.info("W3B Stock Price Relayer — Starting")
    logger.info(f"  Tracked: {list(TRACKED_ASSETS.keys())}")
    logger.info(f"  Poll interval: {POLL_INTERVAL}s")
    logger.info(f"  Max deviation: {MAX_DEVIATION_PCT}%")
    logger.info("=" * 60)

    marketstack = MarketstackFeed(MARKETSTACK_API_KEY) if MARKETSTACK_API_KEY else None
    itick = ITickFeed(ITICK_API_KEY) if ITICK_API_KEY else None

    if not marketstack and not itick:
        logger.error("No API keys configured. Set MARKETSTACK_API_KEY or ITICK_API_KEY")
        sys.exit(1)

    relayer = None
    if ORACLE_ADDRESS and PRIVATE_KEY:
        relayer = OnChainRelayer()

    while True:
        try:
            symbols = list(TRACKED_ASSETS.keys())
            aggregated: Dict[str, float] = {}

            for symbol in symbols:
                prices: List[float] = []

                if marketstack:
                    p = marketstack.get_price(symbol)
                    if p: prices.append(p)

                if itick:
                    p = itick.get_price(symbol)
                    if p: prices.append(p)

                final = aggregate_price(prices)
                if final:
                    aggregated[symbol] = final
                    logger.info(f"  {symbol}: ${final:.2f}")
                else:
                    logger.warning(f"  {symbol}: NO VALID PRICE")

            if relayer and aggregated:
                relayer.push_prices(aggregated)

        except KeyboardInterrupt:
            logger.info("Relayer stopped")
            break
        except Exception as e:
            logger.error(f"Cycle error: {e}")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
