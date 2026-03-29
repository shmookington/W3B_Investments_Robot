// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title SRCToken - W3B Governance Token
 * @notice ERC-20 governance token with capped supply, burning, voting/delegation,
 *         and gasless approvals (EIP-2612 Permit).
 *
 * Token Distribution (100M total):
 *   - 20% Founder   (20M) - vested over 2 years with 6-month cliff
 *   - 30% Community  (30M) - LBP, rewards, grants
 *   - 20% Treasury   (20M) - protocol-controlled
 *   - 15% Liquidity   (15M) - DEX pools
 *   - 10% Advisors    (10M) - 1-year vest
 *   -  5% Security     (5M) - bug bounties & audits
 *
 * @dev Inherits:
 *   - ERC20:        Standard token logic
 *   - ERC20Capped:  Hard cap on total supply (100M)
 *   - ERC20Burnable: Holders can burn their own tokens
 *   - ERC20Permit:  Gasless approvals via EIP-2612
 *   - ERC20Votes:   Delegation and vote checkpointing for governance
 *   - Ownable:      Admin functions (minting)
 */
contract SRCToken is ERC20, ERC20Capped, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {

    /* ═══════════════════════════════════════════ */
    /*                  CONSTANTS                  */
    /* ═══════════════════════════════════════════ */

    /// @notice Maximum total supply: 100 million SRC (18 decimals)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    /// @notice Distribution allocations
    uint256 public constant FOUNDER_ALLOCATION   = 20_000_000 * 1e18; // 20%
    uint256 public constant COMMUNITY_ALLOCATION  = 30_000_000 * 1e18; // 30%
    uint256 public constant TREASURY_ALLOCATION   = 20_000_000 * 1e18; // 20%
    uint256 public constant LIQUIDITY_ALLOCATION  = 15_000_000 * 1e18; // 15%
    uint256 public constant ADVISOR_ALLOCATION    = 10_000_000 * 1e18; // 10%
    uint256 public constant SECURITY_ALLOCATION   =  5_000_000 * 1e18; //  5%

    /* ═══════════════════════════════════════════ */
    /*                   STATE                     */
    /* ═══════════════════════════════════════════ */

    /// @notice Whether initial distribution has been executed
    bool public distributed;

    /// @notice Addresses that received initial distribution
    address public founderVesting;
    address public communityPool;
    address public treasury;
    address public liquidityPool;
    address public advisorVesting;
    address public securityFund;

    /* ═══════════════════════════════════════════ */
    /*                   EVENTS                    */
    /* ═══════════════════════════════════════════ */

    event TokensDistributed(
        address indexed founderVesting,
        address indexed communityPool,
        address indexed treasury,
        uint256 timestamp
    );

    /* ═══════════════════════════════════════════ */
    /*                CONSTRUCTOR                   */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Deploy SRC token with capped supply
     * @param _owner Address that will own the contract (can mint up to cap)
     */
    constructor(address _owner)
        ERC20("Sovereign Reserve Currency", "SRC")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Sovereign Reserve Currency")
        Ownable(_owner)
    {}

    /* ═══════════════════════════════════════════ */
    /*              DISTRIBUTION                    */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Execute the initial token distribution. Can only be called once.
     * @param _founderVesting  Vesting contract for founder tokens
     * @param _communityPool   Community allocation address (LBP, rewards, grants)
     * @param _treasury        Protocol treasury address
     * @param _liquidityPool   DEX liquidity address
     * @param _advisorVesting  Vesting contract for advisor tokens
     * @param _securityFund    Bug bounty / audit fund address
     */
    function distribute(
        address _founderVesting,
        address _communityPool,
        address _treasury,
        address _liquidityPool,
        address _advisorVesting,
        address _securityFund
    ) external onlyOwner {
        require(!distributed, "SRC: already distributed");
        require(_founderVesting != address(0), "SRC: zero address");
        require(_communityPool != address(0), "SRC: zero address");
        require(_treasury != address(0), "SRC: zero address");
        require(_liquidityPool != address(0), "SRC: zero address");
        require(_advisorVesting != address(0), "SRC: zero address");
        require(_securityFund != address(0), "SRC: zero address");

        distributed = true;

        founderVesting = _founderVesting;
        communityPool = _communityPool;
        treasury = _treasury;
        liquidityPool = _liquidityPool;
        advisorVesting = _advisorVesting;
        securityFund = _securityFund;

        _mint(_founderVesting, FOUNDER_ALLOCATION);
        _mint(_communityPool, COMMUNITY_ALLOCATION);
        _mint(_treasury, TREASURY_ALLOCATION);
        _mint(_liquidityPool, LIQUIDITY_ALLOCATION);
        _mint(_advisorVesting, ADVISOR_ALLOCATION);
        _mint(_securityFund, SECURITY_ALLOCATION);

        emit TokensDistributed(_founderVesting, _communityPool, _treasury, block.timestamp);
    }

    /* ═══════════════════════════════════════════ */
    /*              OWNER MINTING                   */
    /* ═══════════════════════════════════════════ */

    /**
     * @notice Mint additional tokens (up to MAX_SUPPLY cap).
     *         Only callable by owner. Intended for post-distribution needs
     *         that stay within the 100M hard cap.
     * @param to Recipient address
     * @param amount Amount to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /* ═══════════════════════════════════════════ */
    /*           REQUIRED OVERRIDES                 */
    /* ═══════════════════════════════════════════ */

    // Resolve multiple inheritance conflicts between ERC20, ERC20Capped, and ERC20Votes

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
