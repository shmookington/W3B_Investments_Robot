// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title SRCTimelock — Governance Timelock for the W3B Protocol
 * @notice Wraps OpenZeppelin TimelockController with the protocol's
 *         default configuration: 24-hour minimum delay.
 *
 * Roles:
 *   - Proposer: SRCGovernor (set after deployment)
 *   - Executor: Anyone (after timelock elapses)
 *   - Admin: Initially deployer, then renounced
 *
 * All governance proposals must pass through this timelock,
 * giving token holders a 24-hour window to exit before
 * any protocol changes take effect.
 */
contract SRCTimelock is TimelockController {
    /// @notice Default minimum delay: 24 hours
    uint256 public constant DEFAULT_MIN_DELAY = 1 days;

    /**
     * @param proposers  Addresses allowed to schedule operations (SRCGovernor)
     * @param executors  Addresses allowed to execute (address(0) = anyone)
     * @param admin      Initial admin (should renounce after setup)
     */
    constructor(
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(DEFAULT_MIN_DELAY, proposers, executors, admin) {}
}
