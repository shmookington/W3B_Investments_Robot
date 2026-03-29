#!/usr/bin/env python3
"""
W3B Liquidation Bot — Monitors positions and executes profitable liquidations.

Monitors all borrower positions for:
  - Health Factor < 1.05 → Pre-liquidation warning
  - Health Factor < 1.0  → Execute liquidation

Profit check: only liquidates if (seized collateral value - gas cost) > 0

Usage:
    python3 liquidation_bot.py --rpc <RPC_URL> --key <PRIVATE_KEY>

Environment Variables:
    RPC_URL          — Base chain RPC endpoint
    PRIVATE_KEY      — Bot wallet private key
    CM_ADDRESS       — CollateralManager contract address
    ENGINE_ADDRESS   — LiquidationEngine contract address
    USDC_ADDRESS     — USDC contract address
"""

import os
import sys
import time
import json
import logging
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("liquidation_bot.log"),
    ],
)
logger = logging.getLogger("liquidation_bot")

# ─────────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────────

RPC_URL = os.getenv("RPC_URL", "https://mainnet.base.org")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
CM_ADDRESS = os.getenv("CM_ADDRESS", "")
ENGINE_ADDRESS = os.getenv("ENGINE_ADDRESS", "")
USDC_ADDRESS = os.getenv("USDC_ADDRESS", "")

# Thresholds
WARNING_HF = 1.05  # Pre-liquidation warning
LIQUIDATION_HF = 1.0  # Execute liquidation
MIN_PROFIT_USD = 10  # Minimum profit to execute ($10)
POLL_INTERVAL = 15  # Seconds between checks
GAS_PRICE_GWEI = 0.01  # Base chain gas price estimate

# Liquidation parameters
MAX_LIQUIDATION_RATIO = 0.5  # 50% of debt
LIQUIDATION_BONUS_BPS = 500  # 5%
PROTOCOL_FEE_BPS = 250  # 2.5%


# ─────────────────────────────────────────────────────────────
#  ABI Fragments (minimal for monitoring and execution)
# ─────────────────────────────────────────────────────────────

CM_ABI = json.loads("""[
    {"inputs":[{"name":"user","type":"address"}],"name":"healthFactor","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"userBorrowValue","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"getUserCollateralInfo","outputs":[{"name":"tokens","type":"address[]"},{"name":"amounts","type":"uint256[]"},{"name":"values","type":"uint256[]"},{"name":"totalValue","type":"uint256"},{"name":"hf","type":"uint256"},{"name":"liquidatable","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"getSupportedCollaterals","outputs":[{"name":"","type":"address[]"}],"stateMutability":"view","type":"function"}
]""")

ENGINE_ABI = json.loads("""[
    {"inputs":[{"components":[{"name":"user","type":"address"},{"name":"collateralToken","type":"address"},{"name":"debtToCover","type":"uint256"}],"name":"params","type":"tuple"}],"name":"liquidate","outputs":[{"components":[{"name":"debtCovered","type":"uint256"},{"name":"collateralSeized","type":"uint256"},{"name":"liquidatorBonus","type":"uint256"},{"name":"protocolFee","type":"uint256"},{"name":"badDebt","type":"bool"}],"name":"result","type":"tuple"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"components":[{"name":"user","type":"address"},{"name":"collateralToken","type":"address"},{"name":"debtToCover","type":"uint256"}],"name":"params","type":"tuple"}],"name":"previewLiquidation","outputs":[{"components":[{"name":"debtCovered","type":"uint256"},{"name":"collateralSeized","type":"uint256"},{"name":"liquidatorBonus","type":"uint256"},{"name":"protocolFee","type":"uint256"},{"name":"badDebt","type":"bool"}],"name":"result","type":"tuple"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"maxLiquidatableDebt","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"isLiquidatable","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"name":"user","type":"address"}],"name":"isNearLiquidation","outputs":[{"name":"","type":"bool"}],"stateMutability":"view","type":"function"}
]""")


# ─────────────────────────────────────────────────────────────
#  Bot Logic
# ─────────────────────────────────────────────────────────────

class LiquidationBot:
    """Monitors borrower positions and executes profitable liquidations."""

    def __init__(self):
        try:
            from web3 import Web3
            self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        except ImportError:
            logger.error("web3 not installed. Run: pip install web3")
            sys.exit(1)

        if not self.w3.is_connected():
            logger.error(f"Cannot connect to RPC: {RPC_URL}")
            sys.exit(1)

        self.cm = self.w3.eth.contract(
            address=Web3.to_checksum_address(CM_ADDRESS), abi=CM_ABI
        )
        self.engine = self.w3.eth.contract(
            address=Web3.to_checksum_address(ENGINE_ADDRESS), abi=ENGINE_ABI
        )

        if PRIVATE_KEY:
            self.account = self.w3.eth.account.from_key(PRIVATE_KEY)
            logger.info(f"Bot wallet: {self.account.address}")
        else:
            self.account = None
            logger.warning("No private key — running in monitor-only mode")

        self.known_borrowers: set = set()
        logger.info("Liquidation bot initialized")

    def check_position(self, user: str) -> Optional[dict]:
        """Check a user's position and return liquidation data if eligible."""
        try:
            hf_raw = self.cm.functions.healthFactor(user).call()
            hf = hf_raw / 1e18

            borrow_raw = self.cm.functions.userBorrowValue(user).call()
            borrow_usd = borrow_raw / 1e18

            if borrow_usd == 0:
                return None

            status = "SAFE"
            if hf < LIQUIDATION_HF:
                status = "LIQUIDATABLE"
            elif hf < WARNING_HF:
                status = "WARNING"

            return {
                "user": user,
                "health_factor": hf,
                "borrow_usd": borrow_usd,
                "status": status,
            }
        except Exception as e:
            logger.error(f"Error checking {user}: {e}")
            return None

    def estimate_profit(self, user: str, collateral_token: str, debt_to_cover: int) -> dict:
        """Estimate profit from a liquidation."""
        try:
            result = self.engine.functions.previewLiquidation(
                (user, collateral_token, debt_to_cover)
            ).call()

            collateral_seized = result[1] / 1e18
            bonus = result[2] / 1e18
            protocol_fee = result[3] / 1e18

            # Estimate gas cost
            gas_estimate = 300_000  # ~300K gas for liquidation
            gas_cost_eth = gas_estimate * GAS_PRICE_GWEI * 1e-9
            gas_cost_usd = gas_cost_eth * 3000  # Rough ETH price

            net_profit = (bonus * 3000) - gas_cost_usd  # Bonus in ETH terms

            return {
                "collateral_seized": collateral_seized,
                "bonus_tokens": bonus,
                "protocol_fee_usd": protocol_fee,
                "gas_cost_usd": gas_cost_usd,
                "net_profit_usd": net_profit,
                "profitable": net_profit > MIN_PROFIT_USD,
            }
        except Exception as e:
            logger.error(f"Error estimating profit for {user}: {e}")
            return {"profitable": False}

    def execute_liquidation(self, user: str, collateral_token: str, debt_to_cover: int) -> bool:
        """Execute a liquidation transaction."""
        if not self.account:
            logger.warning("Cannot execute: no private key")
            return False

        try:
            from web3 import Web3

            tx = self.engine.functions.liquidate(
                (user, collateral_token, debt_to_cover)
            ).build_transaction({
                "from": self.account.address,
                "nonce": self.w3.eth.get_transaction_count(self.account.address),
                "gas": 500_000,
                "maxFeePerGas": Web3.to_wei(0.1, "gwei"),
                "maxPriorityFeePerGas": Web3.to_wei(0.01, "gwei"),
            })

            signed = self.account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)

            if receipt.status == 1:
                logger.info(f"✅ Liquidation SUCCESS: {tx_hash.hex()}")
                return True
            else:
                logger.error(f"❌ Liquidation FAILED: {tx_hash.hex()}")
                return False

        except Exception as e:
            logger.error(f"Liquidation execution error: {e}")
            return False

    def run(self):
        """Main monitoring loop."""
        logger.info("=" * 60)
        logger.info("W3B Liquidation Bot — Starting")
        logger.info(f"  Warning threshold:  HF < {WARNING_HF}")
        logger.info(f"  Liquidation threshold: HF < {LIQUIDATION_HF}")
        logger.info(f"  Min profit: ${MIN_PROFIT_USD}")
        logger.info(f"  Poll interval: {POLL_INTERVAL}s")
        logger.info("=" * 60)

        while True:
            try:
                self._monitor_cycle()
            except KeyboardInterrupt:
                logger.info("Bot stopped by user")
                break
            except Exception as e:
                logger.error(f"Monitor cycle error: {e}")

            time.sleep(POLL_INTERVAL)

    def _monitor_cycle(self):
        """Single monitoring cycle."""
        # In production, get borrowers from events (Borrowed events)
        # For now, check known borrowers
        for user in list(self.known_borrowers):
            position = self.check_position(user)
            if not position:
                continue

            if position["status"] == "WARNING":
                logger.warning(
                    f"⚠️  NEAR LIQUIDATION: {user[:10]}... "
                    f"HF={position['health_factor']:.4f} "
                    f"Debt=${position['borrow_usd']:,.2f}"
                )

            elif position["status"] == "LIQUIDATABLE":
                logger.critical(
                    f"🔴 LIQUIDATABLE: {user[:10]}... "
                    f"HF={position['health_factor']:.4f} "
                    f"Debt=${position['borrow_usd']:,.2f}"
                )

                # Calculate max debt to cover
                max_debt = self.engine.functions.maxLiquidatableDebt(user).call()
                collaterals = self.cm.functions.getSupportedCollaterals().call()

                for token in collaterals:
                    profit = self.estimate_profit(user, token, max_debt)

                    if profit.get("profitable"):
                        logger.info(
                            f"💰 Profitable liquidation found! "
                            f"Net profit: ${profit['net_profit_usd']:.2f}"
                        )
                        self.execute_liquidation(user, token, max_debt)
                        break
                    else:
                        logger.info(
                            f"📊 Not profitable: gas=${profit.get('gas_cost_usd', 0):.2f}"
                        )


# ─────────────────────────────────────────────────────────────
#  Entry Point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not CM_ADDRESS or not ENGINE_ADDRESS:
        logger.error("Set CM_ADDRESS and ENGINE_ADDRESS environment variables")
        logger.info("Example:")
        logger.info("  export CM_ADDRESS=0x...")
        logger.info("  export ENGINE_ADDRESS=0x...")
        sys.exit(1)

    bot = LiquidationBot()
    bot.run()
