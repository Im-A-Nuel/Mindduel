// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MindDuelRanking} from "../src/MindDuelRanking.sol";

contract MindDuelRankingTest is Test {
    MindDuelRanking internal c;

    address internal owner = address(0xA11CE);
    address internal relayer = address(0xB0B);
    address internal alice = address(0x1111);
    address internal bob = address(0x2222);
    address internal stranger = address(0x3333);

    function setUp() public {
        vm.prank(owner);
        c = new MindDuelRanking(owner);
    }

    function _id(string memory s) internal pure returns (bytes32) {
        return keccak256(bytes(s));
    }

    function test_StartsAt1000_AndIsZeroSumOnEvenWin() public {
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("m1"));

        MindDuelRanking.Player memory a = c.getPlayer(alice);
        MindDuelRanking.Player memory b = c.getPlayer(bob);

        // Even match (both start 1000): E = 0.5, K = 32 => +/-16.
        assertEq(a.points, 1016);
        assertEq(b.points, 984);
        assertEq(a.wins, 1);
        assertEq(b.losses, 1);
        assertEq(a.points + b.points, 2000); // zero-sum
    }

    function test_UnderdogWinsMoreThanFavourite() public {
        // Build bob into a favourite with two wins over a third party.
        vm.startPrank(owner);
        c.recordMatch(bob, stranger, false, _id("seed1"));
        c.recordMatch(bob, stranger, false, _id("seed2"));

        // Underdog alice (starts 1000) beats higher-rated bob.
        c.recordMatch(alice, bob, false, _id("upset"));
        vm.stopPrank();

        uint256 underdogGain = c.getPlayer(alice).points - 1000;
        assertGt(underdogGain, 16); // more than an even-match gain of 16
    }

    function test_EvenDrawNoChange() public {
        vm.prank(owner);
        c.recordMatch(alice, bob, true, _id("draw-even"));
        assertEq(c.getPlayer(alice).points, 1000);
        assertEq(c.getPlayer(bob).points, 1000);
        assertEq(c.getPlayer(alice).draws, 1);
        assertEq(c.getPlayer(bob).draws, 1);
    }

    function test_RepeatedLossesNeverUnderflow() public {
        // Elo shrinks the loser's drop as the rating gap widens, so points
        // converge well above zero rather than hitting it — but the floor
        // guard must hold and the math must never underflow/revert.
        vm.startPrank(owner);
        for (uint256 i = 0; i < 80; i++) {
            c.recordMatch(alice, bob, false, _id(string.concat("loss", vm.toString(i))));
        }
        vm.stopPrank();

        MindDuelRanking.Player memory b = c.getPlayer(bob);
        assertEq(b.losses, 80);
        assertLt(b.points, 1000); // strictly dropped from the 1000 start
    }

    function test_IdempotentPerMatchId() public {
        vm.startPrank(owner);
        c.recordMatch(alice, bob, false, _id("dup"));
        vm.expectRevert(MindDuelRanking.AlreadySettled.selector);
        c.recordMatch(alice, bob, false, _id("dup"));
        vm.stopPrank();
    }

    function test_OnlyOwnerCanRecord() public {
        vm.prank(stranger);
        vm.expectRevert(MindDuelRanking.NotOwner.selector);
        c.recordMatch(alice, bob, false, _id("x"));
    }

    function test_RejectsZeroAndSelfPlay() public {
        vm.startPrank(owner);
        vm.expectRevert(MindDuelRanking.ZeroAddress.selector);
        c.recordMatch(address(0), bob, false, _id("z"));
        vm.expectRevert(MindDuelRanking.SamePlayer.selector);
        c.recordMatch(alice, alice, false, _id("s"));
        vm.stopPrank();
    }

    function test_PaginatesRoster() public {
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("p1"));
        assertEq(c.playerCount(), 2);

        (address[] memory addrs, MindDuelRanking.Player[] memory data) = c.getPlayers(0, 10);
        assertEq(addrs.length, 2);
        assertEq(data[0].points, 1016);
    }

    function test_TransfersOwnership() public {
        vm.prank(owner);
        c.transferOwnership(relayer);
        assertEq(c.owner(), relayer);

        vm.prank(relayer);
        c.recordMatch(alice, bob, false, _id("o"));
        assertEq(c.getPlayer(alice).wins, 1);
    }
}
