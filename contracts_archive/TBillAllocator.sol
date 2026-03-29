// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ITBillToken — Interface for tokenized T-Bill products
 * @dev Represents both Ondo USDY and BlackRock BUIDL
 */
interface ITBillToken is IERC20 {
    /// @notice Deposit stablecoin, receive T-Bill tokens
    function deposit(uint256 amount) external returns (uint256 shares);

    /// @notice Redeem T-Bill tokens for stablecoin
    function redeem(uint256 shares) external returns (uint256 amount);

    /// @notice Current exchange rate (stablecoin per T-Bill token)
    function exchangeRate() external view returns (uint256);

    /// @notice Accrued yield since last claim
    function accruedYield(address account) external view returns (uint256);
}

/**
 * @title TBillAllocator — T-Bill Investment Manager
 * @notice Manages vault idle funds by deploying them into tokenized T-Bills
 *         (Ondo USDY and BlackRock BUIDL) to earn risk-free yield.
 *
 * Strategy:
 *   - Default: 80% of idle vault funds allocated to T-Bills
 *   - Keep 20% liquid for immediate withdrawals
 *   - Dynamic rebalancing based on withdrawal frequency
 *   - Yield distributed back to SovereignVault periodically
 *
 * Products:
 *   - Ondo USDY: Primary T-Bill allocation (tokenized US Treasuries)
 *   - BlackRock BUIDL: Secondary allocation (institutional grade)
 *
 * @dev Called by SovereignVault.deployToStrategy() and recallFromStrategy()
 */
contract TBillAllocator is Ownable, Pausable {
    using SafeERC20 for IERC20;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    uint256 public constant BPS_DENOMINATOR = 10_000;

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Underlying stablecoin (USDC)
    IERC20 public immutable stablecoin;

    /// @notice The vault that owns and funds this allocator
    address public vault;

    /// @notice Ondo USDY token contract
    ITBillToken public usdy;

    /// @notice BlackRock BUIDL token contract
    ITBillToken public buidl;

    /// @notice Target allocation to USDY in BPS (default: 6000 = 60%)
    uint256 public usdyAllocationBps;

    /// @notice Target allocation to BUIDL in BPS (default: 2000 = 20%)
    uint256 public buidlAllocationBps;

    /// @notice Remaining keeps as liquid stablecoin (default: 2000 = 20%)
    /// @dev = BPS_DENOMINATOR - usdyAllocationBps - buidlAllocationBps

    /// @notice Total USDC deposited into USDY
    uint256 public usdyDeposited;

    /// @notice Total USDC deposited into BUIDL
    uint256 public buidlDeposited;

    /// @notice Total yield ever harvested
    uint256 public totalYieldHarvested;

    /// @notice Last rebalance timestamp
    uint256 public lastRebalanceTime;

    /// @notice Withdrawal frequency tracker (rolling 7-day count)
    uint256 public withdrawalCount7d;
    uint256 public withdrawalWindowStart;

    /// @notice Rebalance cooldown (minimum time between rebalances)
    uint256 public rebalanceCooldown;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event AllocatedToUSDY(uint256 amount, uint256 sharesReceived, uint256 timestamp);
    event AllocatedToBUIDL(uint256 amount, uint256 sharesReceived, uint256 timestamp);
    event RedeemedFromUSDY(uint256 shares, uint256 amountReceived, uint256 timestamp);
    event RedeemedFromBUIDL(uint256 shares, uint256 amountReceived, uint256 timestamp);
    event YieldHarvested(uint256 usdyYield, uint256 buidlYield, uint256 totalYield, uint256 timestamp);
    event Rebalanced(uint256 usdyAmount, uint256 buidlAmount, uint256 liquidAmount, uint256 timestamp);
    event AllocationUpdated(uint256 usdyBps, uint256 buidlBps, uint256 liquidBps);
    event WithdrawalTracked(uint256 count7d, uint256 timestamp);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @param _stablecoin USDC address
     * @param _vault      SovereignVault address (only vault can deposit/recall)
     * @param _usdy       Ondo USDY token address
     * @param _buidl      BlackRock BUIDL token address
     * @param _owner      Admin/multisig
     */
    constructor(
        address _stablecoin,
        address _vault,
        address _usdy,
        address _buidl,
        address _owner
    ) Ownable(_owner) {
        require(_stablecoin != address(0), "TBill: zero stablecoin");
        require(_vault != address(0), "TBill: zero vault");

        stablecoin = IERC20(_stablecoin);
        vault = _vault;
        usdy = ITBillToken(_usdy);
        buidl = ITBillToken(_buidl);

        // Default allocation: 60% USDY + 20% BUIDL + 20% liquid
        usdyAllocationBps = 6000;
        buidlAllocationBps = 2000;

        rebalanceCooldown = 1 days;
        lastRebalanceTime = block.timestamp;
        withdrawalWindowStart = block.timestamp;
    }

    /* ============================================================ */
    /*                    ALLOCATION FUNCTIONS                      */
    /* ============================================================ */

    /**
     * @notice Allocate incoming funds according to target allocation.
     *         Called when SovereignVault deploys funds to this strategy.
     * @param amount USDC amount to allocate
     */
    function allocate(uint256 amount) external whenNotPaused {
        require(msg.sender == vault, "TBill: only vault");
        require(amount > 0, "TBill: zero amount");

        stablecoin.safeTransferFrom(vault, address(this), amount);

        uint256 toUsdy = (amount * usdyAllocationBps) / BPS_DENOMINATOR;
        uint256 toBuidl = (amount * buidlAllocationBps) / BPS_DENOMINATOR;
        // Remainder stays liquid in this contract

        if (toUsdy > 0 && address(usdy) != address(0)) {
            stablecoin.approve(address(usdy), toUsdy);
            uint256 shares = usdy.deposit(toUsdy);
            usdyDeposited += toUsdy;
            emit AllocatedToUSDY(toUsdy, shares, block.timestamp);
        }

        if (toBuidl > 0 && address(buidl) != address(0)) {
            stablecoin.approve(address(buidl), toBuidl);
            uint256 shares = buidl.deposit(toBuidl);
            buidlDeposited += toBuidl;
            emit AllocatedToBUIDL(toBuidl, shares, block.timestamp);
        }
    }

    /**
     * @notice Recall funds back to the vault. Redeems from T-Bills if needed.
     * @param amount USDC amount to return to vault
     */
    function recall(uint256 amount) external whenNotPaused {
        require(msg.sender == vault, "TBill: only vault");
        require(amount > 0, "TBill: zero amount");

        uint256 liquid = stablecoin.balanceOf(address(this));

        if (liquid >= amount) {
            // Enough liquid funds
            stablecoin.safeTransfer(vault, amount);
            return;
        }

        // Need to redeem from T-Bills
        uint256 needed = amount - liquid;

        // Try BUIDL first (usually faster redemption)
        if (needed > 0 && buidlDeposited > 0) {
            uint256 redeemFromBuidl = needed > buidlDeposited ? buidlDeposited : needed;
            uint256 buidlShares = IERC20(address(buidl)).balanceOf(address(this));
            uint256 sharesToRedeem = (buidlShares * redeemFromBuidl) / buidlDeposited;
            if (sharesToRedeem > buidlShares) sharesToRedeem = buidlShares;

            if (sharesToRedeem > 0) {
                uint256 received = buidl.redeem(sharesToRedeem);
                buidlDeposited = buidlDeposited > received ? buidlDeposited - received : 0;
                needed = needed > received ? needed - received : 0;
                emit RedeemedFromBUIDL(sharesToRedeem, received, block.timestamp);
            }
        }

        // Then USDY
        if (needed > 0 && usdyDeposited > 0) {
            uint256 redeemFromUsdy = needed > usdyDeposited ? usdyDeposited : needed;
            uint256 usdyShares = IERC20(address(usdy)).balanceOf(address(this));
            uint256 sharesToRedeem = (usdyShares * redeemFromUsdy) / usdyDeposited;
            if (sharesToRedeem > usdyShares) sharesToRedeem = usdyShares;

            if (sharesToRedeem > 0) {
                uint256 received = usdy.redeem(sharesToRedeem);
                usdyDeposited = usdyDeposited > received ? usdyDeposited - received : 0;
                emit RedeemedFromUSDY(sharesToRedeem, received, block.timestamp);
            }
        }

        // Transfer everything available back to vault
        uint256 available = stablecoin.balanceOf(address(this));
        uint256 toTransfer = available >= amount ? amount : available;
        stablecoin.safeTransfer(vault, toTransfer);
    }

    /* ============================================================ */
    /*                    YIELD HARVESTING                          */
    /* ============================================================ */

    /**
     * @notice Harvest accrued yield from both T-Bill products and send to vault
     */
    function harvestYield() external {
        uint256 usdyYield = 0;
        uint256 buidlYield = 0;

        // Calculate yield from USDY
        if (address(usdy) != address(0) && usdyDeposited > 0) {
            uint256 usdyShares = IERC20(address(usdy)).balanceOf(address(this));
            uint256 currentValue = (usdyShares * usdy.exchangeRate()) / 1e18;
            if (currentValue > usdyDeposited) {
                usdyYield = currentValue - usdyDeposited;
            }
        }

        // Calculate yield from BUIDL
        if (address(buidl) != address(0) && buidlDeposited > 0) {
            uint256 buidlShares = IERC20(address(buidl)).balanceOf(address(this));
            uint256 currentValue = (buidlShares * buidl.exchangeRate()) / 1e18;
            if (currentValue > buidlDeposited) {
                buidlYield = currentValue - buidlDeposited;
            }
        }

        uint256 totalYield = usdyYield + buidlYield;

        if (totalYield > 0) {
            // Redeem yield portion from T-Bills
            if (usdyYield > 0) {
                uint256 usdyShares = IERC20(address(usdy)).balanceOf(address(this));
                uint256 yieldShares = (usdyShares * usdyYield) / (usdyDeposited + usdyYield);
                if (yieldShares > 0) {
                    usdy.redeem(yieldShares);
                }
            }

            if (buidlYield > 0) {
                uint256 buidlShares = IERC20(address(buidl)).balanceOf(address(this));
                uint256 yieldShares = (buidlShares * buidlYield) / (buidlDeposited + buidlYield);
                if (yieldShares > 0) {
                    buidl.redeem(yieldShares);
                }
            }

            // Transfer harvested yield to vault
            uint256 available = stablecoin.balanceOf(address(this));
            uint256 toTransfer = available >= totalYield ? totalYield : available;
            if (toTransfer > 0) {
                stablecoin.safeTransfer(vault, toTransfer);
                totalYieldHarvested += toTransfer;
            }
        }

        emit YieldHarvested(usdyYield, buidlYield, totalYield, block.timestamp);
    }

    /* ============================================================ */
    /*                    DYNAMIC REBALANCING                       */
    /* ============================================================ */

    /**
     * @notice Track a withdrawal event for dynamic rebalancing.
     *         High withdrawal frequency → keep more liquid.
     */
    function trackWithdrawal() external {
        require(msg.sender == vault, "TBill: only vault");

        // Reset window every 7 days
        if (block.timestamp >= withdrawalWindowStart + 7 days) {
            withdrawalCount7d = 0;
            withdrawalWindowStart = block.timestamp;
        }

        withdrawalCount7d++;
        emit WithdrawalTracked(withdrawalCount7d, block.timestamp);
    }

    /**
     * @notice Rebalance allocations based on withdrawal frequency.
     *         If withdrawals are high, keep more liquid.
     *
     * Tiers:
     *   - Low  (< 10/week):  60% USDY + 20% BUIDL + 20% liquid (default)
     *   - Med  (10-50/week): 50% USDY + 15% BUIDL + 35% liquid
     *   - High (> 50/week):  40% USDY + 10% BUIDL + 50% liquid
     */
    function rebalance() external onlyOwner {
        require(block.timestamp >= lastRebalanceTime + rebalanceCooldown, "TBill: cooldown active");

        if (withdrawalCount7d < 10) {
            // Low frequency — standard allocation
            usdyAllocationBps = 6000;
            buidlAllocationBps = 2000;
        } else if (withdrawalCount7d < 50) {
            // Medium frequency — more liquid
            usdyAllocationBps = 5000;
            buidlAllocationBps = 1500;
        } else {
            // High frequency — maximum liquidity
            usdyAllocationBps = 4000;
            buidlAllocationBps = 1000;
        }

        lastRebalanceTime = block.timestamp;

        uint256 liquidBps = BPS_DENOMINATOR - usdyAllocationBps - buidlAllocationBps;
        emit Rebalanced(usdyAllocationBps, buidlAllocationBps, liquidBps, block.timestamp);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Total assets managed by this allocator
     */
    function totalAssets() public view returns (uint256) {
        uint256 liquid = stablecoin.balanceOf(address(this));

        uint256 usdyValue = 0;
        if (address(usdy) != address(0)) {
            uint256 usdyShares = IERC20(address(usdy)).balanceOf(address(this));
            usdyValue = (usdyShares * usdy.exchangeRate()) / 1e18;
        }

        uint256 buidlValue = 0;
        if (address(buidl) != address(0)) {
            uint256 buidlShares = IERC20(address(buidl)).balanceOf(address(this));
            buidlValue = (buidlShares * buidl.exchangeRate()) / 1e18;
        }

        return liquid + usdyValue + buidlValue;
    }

    /**
     * @notice Current yield rate estimate (annualized, in BPS)
     */
    function currentYieldBps() external view returns (uint256 usdyYieldBps, uint256 buidlYieldBps) {
        if (address(usdy) != address(0)) {
            usdyYieldBps = (usdy.exchangeRate() - 1e18) * BPS_DENOMINATOR / 1e18;
        }
        if (address(buidl) != address(0)) {
            buidlYieldBps = (buidl.exchangeRate() - 1e18) * BPS_DENOMINATOR / 1e18;
        }
    }

    /**
     * @notice Full allocator status
     */
    function allocatorStatus() external view returns (
        uint256 _totalAssets,
        uint256 _usdyDeposited,
        uint256 _buidlDeposited,
        uint256 _liquidBalance,
        uint256 _totalYieldHarvested,
        uint256 _usdyAllocationBps,
        uint256 _buidlAllocationBps,
        uint256 _liquidAllocationBps,
        uint256 _withdrawalCount7d
    ) {
        return (
            totalAssets(),
            usdyDeposited,
            buidlDeposited,
            stablecoin.balanceOf(address(this)),
            totalYieldHarvested,
            usdyAllocationBps,
            buidlAllocationBps,
            BPS_DENOMINATOR - usdyAllocationBps - buidlAllocationBps,
            withdrawalCount7d
        );
    }

    /* ============================================================ */
    /*                    ADMIN / GOVERNANCE                        */
    /* ============================================================ */

    function setAllocation(uint256 _usdyBps, uint256 _buidlBps) external onlyOwner {
        require(_usdyBps + _buidlBps <= BPS_DENOMINATOR, "TBill: allocation > 100%");
        usdyAllocationBps = _usdyBps;
        buidlAllocationBps = _buidlBps;
        uint256 liquidBps = BPS_DENOMINATOR - _usdyBps - _buidlBps;
        emit AllocationUpdated(_usdyBps, _buidlBps, liquidBps);
    }

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "TBill: zero vault");
        vault = _vault;
    }

    function setRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        rebalanceCooldown = _cooldown;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency: withdraw all T-Bill positions back to stablecoin
     */
    function emergencyExitAll() external onlyOwner {
        // Redeem all USDY
        uint256 usdyShares = IERC20(address(usdy)).balanceOf(address(this));
        if (usdyShares > 0) {
            uint256 received = usdy.redeem(usdyShares);
            usdyDeposited = 0;
            emit RedeemedFromUSDY(usdyShares, received, block.timestamp);
        }

        // Redeem all BUIDL
        uint256 buidlShares = IERC20(address(buidl)).balanceOf(address(this));
        if (buidlShares > 0) {
            uint256 received = buidl.redeem(buidlShares);
            buidlDeposited = 0;
            emit RedeemedFromBUIDL(buidlShares, received, block.timestamp);
        }

        // Transfer everything to vault
        uint256 balance = stablecoin.balanceOf(address(this));
        if (balance > 0) {
            stablecoin.safeTransfer(vault, balance);
        }
    }
}
