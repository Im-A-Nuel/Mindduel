// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MindDuelRanking} from "../src/MindDuelRanking.sol";

/**
 * Deploy MindDuelRanking to Celo.
 *
 *   forge script script/Deploy.s.sol --rpc-url celo --broadcast
 *
 * Env:
 *   PRIVATE_KEY      deployer/relayer key (0x...)
 *   RELAYER_ADDRESS  optional contract owner; defaults to the deployer
 */
contract Deploy is Script {
    function run() external returns (MindDuelRanking ranking) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address ownerArg = vm.envOr("RELAYER_ADDRESS", deployer);

        console.log("Deployer:", deployer);
        console.log("Owner:   ", ownerArg);

        vm.startBroadcast(pk);
        ranking = new MindDuelRanking(ownerArg);
        vm.stopBroadcast();

        console.log("MindDuelRanking deployed at:", address(ranking));
        console.log("Set frontend NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS and backend RANKING_CONTRACT_ADDRESS to this address.");
    }
}
