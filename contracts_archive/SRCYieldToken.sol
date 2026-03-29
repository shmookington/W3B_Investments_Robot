// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title SRCYieldToken (aSRC) - Interest-Bearing Vault Token
 * @notice ERC-4626 tokenized vault. Users deposit USDC, receive aSRC shares.
 *         As yield accrues from MONOLITH strategies, share price increases.
 *
 * Mechanics:
 *   - Deposit USDC -> receive aSRC shares (at current exchange rate)
 *   - aSRC value increases as yield is added to vault
 *   - Redeem aSRC -> receive USDC (at current exchange rate)
 *   - 1% annual management fee accrued daily, collected by protocol
 *
 * @dev Inherits:
 *   - ERC4626:  Standard vault interface (deposit, withdraw, redeem, share pricing)
 *   - Ownable:  Admin functions (pause, fee collection, yield injection)
 *   - Pausable: Emergency pause for deposits/withdrawals
 */
contract SRCYieldToken is ERC4626, Ownable, Pausable {
    using Math for uint256;

    /* ============================================================ */
    /*                         CONSTANTS                            */
    /* ============================================================ */

    /// @notice 1% annual management fee (in basis points: 100 = 1%)
    uint256 public constant MANAGEMENT_FEE_BPS = 100;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Minimum deposit: 10 USDC (6 decimals)
    uint256 public constant MIN_DEPOSIT = 10 * 1e6;

    /// @notice Maximum deposit per transaction: 1M USDC
    uint256 public constant MAX_DEPOSIT = 1_000_000 * 1e6;

    /* ============================================================ */
    /*                          STATE                               */
    /* ============================================================ */

    /// @notice Protocol fee collector address
    address public feeCollector;

    /// @notice Total yield ever distributed to this vault
    uint256 public totalYieldAccrued;

    /// @notice Total management fees ever collected
    uint256 public totalFeesCollected;

    /// @notice Last timestamp when fees were accrued
    uint256 public lastFeeAccrualTime;

    /// @notice Per-user deposit tracking
    mapping(address => uint256) public userTotalDeposited;

    /// @notice Per-user yield tracking (for tax reporting)
    mapping(address => uint256) public userYieldEarned;

    /* ============================================================ */
    /*                          EVENTS                              */
    /* ============================================================ */

    event YieldDistributed(uint256 amount, uint256 newTotalAssets, uint256 sharePrice, uint256 timestamp);
    event ManagementFeeCollected(uint256 feeAmount, address collector, uint256 timestamp);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    event DepositTracked(address indexed user, uint256 assets, uint256 shares, uint256 sharePrice);
    event WithdrawTracked(address indexed user, uint256 assets, uint256 shares, uint256 yieldEarned);

    /* ============================================================ */
    /*                       CONSTRUCTOR                            */
    /* ============================================================ */

    /**
     * @notice Deploy the aSRC yield token vault
     * @param _asset      USDC token address on Base
     * @param _owner      Admin address (multisig)
     * @param _feeCollector Address that receives management fees
     */
    constructor(
        IERC20 _asset,
        address _owner,
        address _feeCollector
    )
        ERC20("W3B Yield Token", "aSRC")
        ERC4626(_asset)
        Ownable(_owner)
    {
        require(_feeCollector != address(0), "aSRC: zero fee collector");
        feeCollector = _feeCollector;
        lastFeeAccrualTime = block.timestamp;
    }

    /* ============================================================ */
    /*                    YIELD MANAGEMENT                          */
    /* ============================================================ */

    /**
     * @notice Distribute yield to the vault. Called by MONOLITH engine
     *         or strategy manager when yield is earned.
     *         Simply transfers USDC into the vault, increasing share price.
     * @param amount USDC amount of yield to distribute
     *
     * @dev Caller must have approved this contract to spend `amount` USDC.
     */
    function distributeYield(uint256 amount) external onlyOwner {
        require(amount > 0, "aSRC: zero yield");

        // Pull USDC into the vault
        IERC20(asset()).transferFrom(msg.sender, address(this), amount);

        totalYieldAccrued += amount;

        emit YieldDistributed(
            amount,
            totalAssets(),
            sharePrice(),
            block.timestamp
        );
    }

    /* ============================================================ */
    /*                    FEE MANAGEMENT                            */
    /* ============================================================ */

    /**
     * @notice Accrue and collect management fees. Called periodically.
     *         Fee = 1% annual on total AUM, pro-rated daily.
     *
     * Formula: fee = totalAssets * (1% / 365) * daysSinceLastAccrual
     */
    function collectManagementFee() external {
        uint256 elapsed = block.timestamp - lastFeeAccrualTime;
        require(elapsed >= 1 days, "aSRC: too early");

        uint256 assets = totalAssets();
        if (assets == 0) {
            lastFeeAccrualTime = block.timestamp;
            return;
        }

        // fee = assets * MANAGEMENT_FEE_BPS / BPS_DENOMINATOR * elapsed / 365 days
        uint256 fee = (assets * MANAGEMENT_FEE_BPS * elapsed) / (BPS_DENOMINATOR * 365 days);

        if (fee > 0) {
            // Transfer fee from vault to collector
            IERC20(asset()).transfer(feeCollector, fee);
            totalFeesCollected += fee;
        }

        lastFeeAccrualTime = block.timestamp;

        emit ManagementFeeCollected(fee, feeCollector, block.timestamp);
    }

    /**
     * @notice Update the fee collector address
     * @param _newCollector New fee collector address
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "aSRC: zero address");
        address old = feeCollector;
        feeCollector = _newCollector;
        emit FeeCollectorUpdated(old, _newCollector);
    }

    /* ============================================================ */
    /*                    VIEW FUNCTIONS                            */
    /* ============================================================ */

    /**
     * @notice Current price of 1 aSRC share in USDC (6 decimals)
     * @return Price of 1 full share (1e18 shares) in USDC terms
     */
    function sharePrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e6; // 1 USDC per share initially
        return totalAssets().mulDiv(1e18, supply);
    }

    /**
     * @notice Get user's current position value in USDC
     * @param user Address to query
     * @return depositedUsdc Total USDC deposited by user
     * @return currentValueUsdc Current value of user's shares in USDC
     * @return yieldEarned Total yield earned (current value - deposited, can be negative shown as 0)
     */
    function userPosition(address user) external view returns (
        uint256 depositedUsdc,
        uint256 currentValueUsdc,
        uint256 yieldEarned
    ) {
        depositedUsdc = userTotalDeposited[user];
        currentValueUsdc = convertToAssets(balanceOf(user));
        yieldEarned = currentValueUsdc > depositedUsdc ? currentValueUsdc - depositedUsdc : 0;
    }

    /**
     * @notice Pending management fee that would be collected now
     */
    function pendingManagementFee() external view returns (uint256) {
        uint256 elapsed = block.timestamp - lastFeeAccrualTime;
        if (elapsed < 1 days) return 0;
        uint256 assets = totalAssets();
        return (assets * MANAGEMENT_FEE_BPS * elapsed) / (BPS_DENOMINATOR * 365 days);
    }

    /* ============================================================ */
    /*                    DEPOSIT / WITHDRAW HOOKS                  */
    /* ============================================================ */

    /**
     * @dev Override to enforce deposit limits and track per-user deposits
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        require(assets >= MIN_DEPOSIT, "aSRC: below minimum deposit");
        require(assets <= MAX_DEPOSIT, "aSRC: above maximum deposit");

        // Track user deposit
        userTotalDeposited[receiver] += assets;

        super._deposit(caller, receiver, assets, shares);

        emit DepositTracked(receiver, assets, shares, sharePrice());
    }

    /**
     * @dev Override to track per-user withdrawals and yield earned
     */
    function _withdraw(
        address caller,
        address receiver,
        address _owner,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        // Calculate yield earned on this withdrawal
        uint256 deposited = userTotalDeposited[_owner];
        uint256 proportionBps = shares.mulDiv(BPS_DENOMINATOR, balanceOf(_owner) + shares);
        uint256 proportionalDeposit = deposited.mulDiv(proportionBps, BPS_DENOMINATOR);
        uint256 yieldOnWithdraw = assets > proportionalDeposit ? assets - proportionalDeposit : 0;

        // Update tracking
        userYieldEarned[_owner] += yieldOnWithdraw;
        if (proportionalDeposit <= userTotalDeposited[_owner]) {
            userTotalDeposited[_owner] -= proportionalDeposit;
        } else {
            userTotalDeposited[_owner] = 0;
        }

        super._withdraw(caller, receiver, _owner, assets, shares);

        emit WithdrawTracked(_owner, assets, shares, yieldOnWithdraw);
    }

    /* ============================================================ */
    /*                    ADMIN / EMERGENCY                         */
    /* ============================================================ */

    /**
     * @notice Pause deposits and withdrawals (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause deposits and withdrawals
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /* ============================================================ */
    /*                    ERC4626 OVERRIDES                         */
    /* ============================================================ */

    /**
     * @dev Offset decimals by 12 to handle USDC (6 decimals) -> aSRC (18 decimals)
     *      This mitigates the first-depositor inflation attack.
     */
    function _decimalsOffset() internal pure override returns (uint8) {
        return 12;
    }
}
