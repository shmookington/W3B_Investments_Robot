// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SRCVesting - Token Vesting with Cliff
 * @notice Linear vesting contract for SRC founder and advisor tokens.
 *
 * Features:
 *   - Configurable cliff period (tokens locked until cliff ends)
 *   - Linear vesting after cliff (tokens unlock gradually)
 *   - Emergency revocation by owner (multisig) - unvested tokens returned
 *   - Beneficiary can claim vested tokens at any time after cliff
 *
 * Founder Schedule: 2-year vest, 6-month cliff
 * Advisor Schedule: 1-year vest, 3-month cliff
 *
 * @dev Tokens must be transferred to this contract AFTER deployment.
 */
contract SRCVesting is Ownable {
    using SafeERC20 for IERC20;

    /* ═══════════════════════════════════════════ */
    /*                   STATE                     */
    /* ═══════════════════════════════════════════ */

    /// @notice The ERC-20 token being vested
    IERC20 public immutable token;

    /// @notice Address that receives vested tokens
    address public beneficiary;

    /// @notice Total tokens allocated to this vesting schedule
    uint256 public totalAllocation;

    /// @notice Tokens already claimed by beneficiary
    uint256 public claimed;

    /// @notice Timestamp when vesting starts
    uint256 public startTime;

    /// @notice Duration of cliff period (seconds)
    uint256 public cliffDuration;

    /// @notice Total vesting duration from start (seconds)
    uint256 public vestingDuration;

    /// @notice Whether the vesting has been revoked
    bool public revoked;

    /// @notice Amount vested at the time of revocation
    uint256 public vestedAtRevoke;

    /* ═══════════════════════════════════════════ */
    /*                   EVENTS                    */
    /* ═══════════════════════════════════════════ */

    event TokensClaimed(address indexed beneficiary, uint256 amount, uint256 timestamp);
    event VestingRevoked(address indexed beneficiary, uint256 unvestedReturned, uint256 timestamp);

    /* ═══════════════════════════════════════════ */
    /*                CONSTRUCTOR                   */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Create a new vesting schedule
     * @param _token         Address of the SRC token contract
     * @param _beneficiary   Address that will receive vested tokens
     * @param _totalAllocation Total tokens to vest
     * @param _startTime     Timestamp when vesting begins
     * @param _cliffDuration  Cliff period in seconds (e.g., 6 months = 15768000)
     * @param _vestingDuration Total vesting duration from start in seconds (e.g., 2 years = 63072000)
     * @param _owner         Owner/multisig that can revoke
     */
    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAllocation,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _vestingDuration,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "Vesting: zero token");
        require(_beneficiary != address(0), "Vesting: zero beneficiary");
        require(_totalAllocation > 0, "Vesting: zero allocation");
        require(_vestingDuration > _cliffDuration, "Vesting: cliff >= duration");
        require(_startTime > 0, "Vesting: zero start");

        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAllocation = _totalAllocation;
        startTime = _startTime;
        cliffDuration = _cliffDuration;
        vestingDuration = _vestingDuration;
    }

    /* ═══════════════════════════════════════════ */
    /*                 VIEWS                        */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Calculate total tokens vested up to now
     * @return Total vested amount (including already claimed)
     */
    function vestedAmount() public view returns (uint256) {
        // If revoked, return the frozen vested amount at revoke time
        if (revoked) {
            return vestedAtRevoke;
        }

        if (block.timestamp < startTime + cliffDuration) {
            return 0; // Still in cliff period
        }

        if (block.timestamp >= startTime + vestingDuration) {
            return totalAllocation;
        }

        uint256 elapsed = block.timestamp - startTime;
        return (totalAllocation * elapsed) / vestingDuration;
    }

    /**
     * @notice Calculate tokens available to claim right now
     * @return Claimable amount
     */
    function claimable() public view returns (uint256) {
        return vestedAmount() - claimed;
    }

    /**
     * @notice Calculate unvested tokens remaining
     * @return Unvested amount
     */
    function unvested() public view returns (uint256) {
        return totalAllocation - vestedAmount();
    }

    /* ═══════════════════════════════════════════ */
    /*                 ACTIONS                      */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Claim vested tokens. Only beneficiary can call.
     */
    function claim() external {
        require(msg.sender == beneficiary, "Vesting: not beneficiary");

        uint256 amount = claimable();
        require(amount > 0, "Vesting: nothing to claim");

        claimed += amount;
        token.safeTransfer(beneficiary, amount);

        emit TokensClaimed(beneficiary, amount, block.timestamp);
    }

    /**
     * @notice Revoke vesting. Unvested tokens are returned to owner (multisig).
     *         Beneficiary keeps already vested (but unclaimed) tokens.
     *         Can only be called by owner (multisig).
     */
    function revoke() external onlyOwner {
        require(!revoked, "Vesting: already revoked");

        uint256 vested = vestedAmount();
        uint256 unvestedAmount = totalAllocation - vested;

        // Freeze vested amount at revoke time
        vestedAtRevoke = vested;
        revoked = true;

        // Beneficiary keeps vested amount, unvested goes back to owner
        if (unvestedAmount > 0) {
            token.safeTransfer(owner(), unvestedAmount);
        }

        emit VestingRevoked(beneficiary, unvestedAmount, block.timestamp);
    }

    /* ═══════════════════════════════════════════ */
    /*              INFO / HELPERS                  */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Get full vesting schedule info
     */
    function scheduleInfo() external view returns (
        address _beneficiary,
        uint256 _totalAllocation,
        uint256 _claimed,
        uint256 _claimable,
        uint256 _unvested,
        uint256 _startTime,
        uint256 _cliffEnd,
        uint256 _vestingEnd,
        bool _revoked
    ) {
        return (
            beneficiary,
            totalAllocation,
            claimed,
            claimable(),
            unvested(),
            startTime,
            startTime + cliffDuration,
            startTime + vestingDuration,
            revoked
        );
    }
}
