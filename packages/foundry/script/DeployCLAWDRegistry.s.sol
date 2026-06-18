// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DeployHelpers.s.sol";
import "../contracts/CLAWDRegistry.sol";

/**
 * @notice Deploy script for CLAWDRegistry
 * @dev Deploys the burn-to-submit competition registry on Base.
 *
 * Example:
 *   yarn deploy --file DeployCLAWDRegistry.s.sol --network base
 */
contract DeployCLAWDRegistry is ScaffoldETHDeploy {
    // Client wallet that will hold admin privileges post-deploy
    address constant CLIENT_ADMIN = 0x34aA3F359A9D614239015126635CE7732c18fDF3;

    // 5000 CLAWD (18 decimals) — ~$5 at current prices
    uint256 constant INITIAL_BURN_AMOUNT = 5000 * 1e18;

    function run() external ScaffoldEthDeployerRunner {
        CLAWDRegistry registry = new CLAWDRegistry(CLIENT_ADMIN, INITIAL_BURN_AMOUNT);

        deployments.push(Deployment({ name: "CLAWDRegistry", addr: address(registry) }));

        console.log("CLAWDRegistry deployed at:", address(registry));
        console.log("Admin:", CLIENT_ADMIN);
        console.log("Burn amount:", INITIAL_BURN_AMOUNT);
    }
}
