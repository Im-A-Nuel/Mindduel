// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MindDuelRanking} from "../src/MindDuelRanking.sol";

/// Test harness exposing the internal Elo math for property/fuzz testing.
contract Harness is MindDuelRanking {
    constructor(address o) MindDuelRanking(o) {}
    function exposedExpected(uint256 s, uint256 o) external pure returns (uint256) {
        return _expected(s, o);
    }
    function exposedDrawDelta(uint256 a, uint256 b) external pure returns (int256) {
        return _drawDelta(a, b);
    }
}

contract MindDuelRankingTest is Test {
    MindDuelRanking internal c;
    Harness internal h;

    address internal owner = address(0xA11CE);
    address internal relayer = address(0xB0B);
    address internal alice = address(0x1111);
    address internal bob = address(0x2222);
    address internal carol = address(0x3333);
    address internal stranger = address(0x4444);

    uint256 constant SCALE = 1_000_000;

    function setUp() public {
        vm.prank(owner);
        c = new MindDuelRanking(owner);
        h = new Harness(owner);
    }

    function _id(string memory s) internal pure returns (bytes32) {
        return keccak256(bytes(s));
    }

    // ─── Basics ───────────────────────────────────────────────────────────
    function test_StartsAt1000_AndIsZeroSumOnEvenWin() public {
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("m1"));

        MindDuelRanking.Player memory a = c.getPlayer(alice);
        MindDuelRanking.Player memory b = c.getPlayer(bob);

        assertEq(a.points, 1016);
        assertEq(b.points, 984);
        assertEq(a.wins, 1);
        assertEq(b.losses, 1);
        assertEq(a.points + b.points, 2000); // zero-sum
        assertTrue(a.exists && b.exists);
    }

    function test_UnknownPlayerIsEmpty() public view {
        MindDuelRanking.Player memory p = c.getPlayer(stranger);
        assertEq(p.points, 0);
        assertFalse(p.exists);
        assertEq(p.wins, 0);
    }

    function test_PlayerCountIsUniquePerAddress() public {
        vm.startPrank(owner);
        c.recordMatch(alice, bob, false, _id("a"));
        c.recordMatch(alice, bob, false, _id("b")); // same two players again
        c.recordMatch(alice, carol, false, _id("c")); // carol new
        vm.stopPrank();
        assertEq(c.playerCount(), 3); // alice, bob, carol — counted once each
    }

    // ─── Elo direction & magnitude ────────────────────────────────────────
    function test_UnderdogWinsMoreThanEven_FavouriteWinsLess() public {
        // Raise bob to a clear favourite.
        vm.startPrank(owner);
        c.recordMatch(bob, stranger, false, _id("seed1"));
        c.recordMatch(bob, stranger, false, _id("seed2"));
        c.recordMatch(bob, stranger, false, _id("seed3"));
        vm.stopPrank();
        uint256 bobPts = c.getPlayer(bob).points;
        assertGt(bobPts, 1000);

        // Underdog alice (1000) beats favourite bob -> gains more than 16.
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("upset"));
        uint256 underdogGain = c.getPlayer(alice).points - 1000;
        assertGt(underdogGain, 16);

        // Favourite carol (raise her) beating a 1000 newbie gains less than 16.
        vm.startPrank(owner);
        c.recordMatch(carol, stranger, false, _id("seed4"));
        c.recordMatch(carol, stranger, false, _id("seed5"));
        c.recordMatch(carol, stranger, false, _id("seed6"));
        uint256 carolBefore = c.getPlayer(carol).points;
        c.recordMatch(carol, address(0x9999), false, _id("fav-win")); // fresh 1000 opp
        vm.stopPrank();
        uint256 favGain = c.getPlayer(carol).points - carolBefore;
        assertLt(favGain, 16);
        assertGt(favGain, 0); // clamp keeps it positive
    }

    function test_DecisiveWinIsZeroSumWhenNoFloor() public {
        // Seed alice up so ratings differ but loser won't floor.
        vm.startPrank(owner);
        c.recordMatch(alice, stranger, false, _id("s1"));
        c.recordMatch(alice, stranger, false, _id("s2"));
        // bob fresh at 1000; alice ~1030. alice beats bob.
        uint256 aBefore = c.getPlayer(alice).points;
        uint256 bBefore = 1000; // bob unseen -> START
        c.recordMatch(alice, bob, false, _id("zs"));
        vm.stopPrank();

        uint256 aAfter = c.getPlayer(alice).points;
        uint256 bAfter = c.getPlayer(bob).points;
        assertEq(aAfter - aBefore, bBefore - bAfter); // winner gain == loser loss
    }

    function test_WinnerNeverLosesLoserNeverGains() public {
        vm.startPrank(owner);
        for (uint256 i = 0; i < 10; i++) {
            uint256 aB = c.getPlayer(alice).points;
            uint256 bB = c.getPlayer(bob).points;
            c.recordMatch(alice, bob, false, _id(string.concat("win", vm.toString(i))));
            assertGe(c.getPlayer(alice).points, aB == 0 ? 1000 : aB); // winner up (or first-time START+)
            assertLe(c.getPlayer(bob).points, bB == 0 ? 1000 : bB); // loser down
        }
        vm.stopPrank();
    }

    // ─── Draws ────────────────────────────────────────────────────────────
    function test_EvenDrawNoChange() public {
        vm.prank(owner);
        c.recordMatch(alice, bob, true, _id("draw-even"));
        assertEq(c.getPlayer(alice).points, 1000);
        assertEq(c.getPlayer(bob).points, 1000);
        assertEq(c.getPlayer(alice).draws, 1);
        assertEq(c.getPlayer(bob).draws, 1);
    }

    function test_DrawHigherRatedLosesPoints_ZeroSum() public {
        // Raise alice above bob, then draw: alice should drop, bob should rise.
        vm.startPrank(owner);
        c.recordMatch(alice, stranger, false, _id("d1"));
        c.recordMatch(alice, stranger, false, _id("d2"));
        c.recordMatch(alice, stranger, false, _id("d3"));
        uint256 aBefore = c.getPlayer(alice).points;
        uint256 bBefore = 1000;
        c.recordMatch(alice, bob, true, _id("draw-skew"));
        vm.stopPrank();
        uint256 aAfter = c.getPlayer(alice).points;
        uint256 bAfter = c.getPlayer(bob).points;
        assertLt(aAfter, aBefore); // higher-rated loses on a draw
        assertGt(bAfter, bBefore); // lower-rated gains
        assertEq(aBefore - aAfter, bAfter - bBefore); // zero-sum
        assertEq(aAfter + bAfter, aBefore + bBefore);
    }

    // ─── Counters & timestamp ─────────────────────────────────────────────
    function test_CountersAccumulate() public {
        vm.startPrank(owner);
        c.recordMatch(alice, bob, false, _id("c1")); // alice win
        c.recordMatch(bob, alice, false, _id("c2")); // bob win, alice loss
        c.recordMatch(alice, bob, true, _id("c3"));  // draw
        vm.stopPrank();
        MindDuelRanking.Player memory a = c.getPlayer(alice);
        assertEq(a.wins, 1);
        assertEq(a.losses, 1);
        assertEq(a.draws, 1);
    }

    function test_LastPlayedUpdates() public {
        vm.warp(1_000_000);
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("t1"));
        assertEq(c.getPlayer(alice).lastPlayed, 1_000_000);
    }

    function test_RepeatedLossesNeverUnderflow() public {
        vm.startPrank(owner);
        for (uint256 i = 0; i < 120; i++) {
            c.recordMatch(alice, bob, false, _id(string.concat("loss", vm.toString(i))));
        }
        vm.stopPrank();
        MindDuelRanking.Player memory b = c.getPlayer(bob);
        assertEq(b.losses, 120);
        assertLt(b.points, 1000);
        // never reverted -> floor held
    }

    // ─── Access control / guards / idempotency ────────────────────────────
    function test_OnlyOwnerCanRecord() public {
        vm.prank(stranger);
        vm.expectRevert(MindDuelRanking.NotOwner.selector);
        c.recordMatch(alice, bob, false, _id("x"));
    }

    function test_IdempotentPerMatchId() public {
        vm.startPrank(owner);
        c.recordMatch(alice, bob, false, _id("dup"));
        uint256 aAfter = c.getPlayer(alice).points;
        vm.expectRevert(MindDuelRanking.AlreadySettled.selector);
        c.recordMatch(alice, bob, false, _id("dup"));
        vm.stopPrank();
        assertEq(c.getPlayer(alice).points, aAfter); // no double-count
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
        // out-of-range start -> empty
        (address[] memory a2,) = c.getPlayers(5, 10);
        assertEq(a2.length, 0);
    }

    // ─── Daily check-in ───────────────────────────────────────────────────
    function test_CheckInIncrementsAndIsPermissionless() public {
        vm.warp(2 days + 100);
        vm.prank(alice);
        c.checkIn();
        assertEq(c.checkInCount(alice), 1);
        assertEq(c.totalCheckIns(), 1);

        vm.prank(bob); // anyone, not just owner
        c.checkIn();
        assertEq(c.checkInCount(bob), 1);
        assertEq(c.totalCheckIns(), 2);
    }

    function test_CheckInOncePerDay() public {
        vm.warp(5 days + 10);
        vm.prank(alice);
        c.checkIn();
        vm.prank(alice);
        vm.expectRevert(MindDuelRanking.AlreadyCheckedIn.selector);
        c.checkIn();
        // next day -> allowed again
        vm.warp(6 days + 10);
        vm.prank(alice);
        c.checkIn();
        assertEq(c.checkInCount(alice), 2);
    }

    function test_TransfersOwnership() public {
        vm.prank(owner);
        c.transferOwnership(relayer);
        assertEq(c.owner(), relayer);
        vm.prank(owner);
        vm.expectRevert(MindDuelRanking.NotOwner.selector);
        c.recordMatch(alice, bob, false, _id("o1"));
        vm.prank(relayer);
        c.recordMatch(alice, bob, false, _id("o2"));
        assertEq(c.getPlayer(alice).wins, 1);
    }

    function test_TransferOwnershipRejectsZero() public {
        vm.prank(owner);
        vm.expectRevert(MindDuelRanking.ZeroAddress.selector);
        c.transferOwnership(address(0));
    }

    function test_EmitsMatchRecorded() public {
        vm.expectEmit(true, true, true, true);
        emit MindDuelRanking.MatchRecorded(_id("e1"), alice, bob, false, 1016, 984);
        vm.prank(owner);
        c.recordMatch(alice, bob, false, _id("e1"));
    }

    // ─── Fuzz: Elo expected-score invariants ──────────────────────────────
    /// E(self,opp) must be a probability in [0, 1] (scaled to 1e6).
    function testFuzz_ExpectedInRange(uint256 self, uint256 opp) public view {
        self = bound(self, 0, 5000);
        opp = bound(opp, 0, 5000);
        uint256 e = h.exposedExpected(self, opp);
        assertLe(e, SCALE);
    }

    /// Symmetry: E(a,b) + E(b,a) == 1 (within integer-rounding tolerance).
    /// This validates the reciprocal handling for the d<0 branch.
    function testFuzz_ExpectedSymmetry(uint256 a, uint256 b) public view {
        a = bound(a, 0, 5000);
        b = bound(b, 0, 5000);
        uint256 eAB = h.exposedExpected(a, b);
        uint256 eBA = h.exposedExpected(b, a);
        uint256 sum = eAB + eBA;
        // allow a few units of rounding error from two integer divisions
        assertApproxEqAbs(sum, SCALE, 5);
    }

    /// Monotonic: a stronger opponent never raises self's expected score.
    function testFuzz_ExpectedMonotonic(uint256 self, uint256 opp, uint256 bump) public view {
        self = bound(self, 0, 5000);
        opp = bound(opp, 0, 4000);
        bump = bound(bump, 1, 1000);
        uint256 eLow = h.exposedExpected(self, opp);
        uint256 eHigh = h.exposedExpected(self, opp + bump);
        assertLe(eHigh, eLow);
    }

    /// Equal ratings -> expected score is exactly 0.5.
    function testFuzz_EqualIsHalf(uint256 p) public view {
        p = bound(p, 0, 5000);
        assertEq(h.exposedExpected(p, p), SCALE / 2);
    }

    /// Draw delta is anti-symmetric: drawDelta(a,b) == -drawDelta(b,a).
    function testFuzz_DrawDeltaAntisymmetric(uint256 a, uint256 b) public view {
        a = bound(a, 0, 5000);
        b = bound(b, 0, 5000);
        assertEq(h.exposedDrawDelta(a, b), -h.exposedDrawDelta(b, a));
    }

    /// Fuzz a decisive match between two seeded players: zero-sum holds unless
    /// the loser floors at 0, and the per-match move is bounded by K.
    function testFuzz_DecisiveZeroSumBounded(uint8 aWins, uint8 bWins) public {
        aWins = uint8(bound(aWins, 0, 20));
        bWins = uint8(bound(bWins, 0, 20));
        vm.startPrank(owner);
        for (uint256 i = 0; i < aWins; i++) {
            c.recordMatch(alice, stranger, false, _id(string.concat("aw", vm.toString(i))));
        }
        for (uint256 i = 0; i < bWins; i++) {
            c.recordMatch(bob, carol, false, _id(string.concat("bw", vm.toString(i))));
        }
        uint256 aBefore = c.getPlayer(alice).points == 0 ? 1000 : c.getPlayer(alice).points;
        uint256 bBefore = c.getPlayer(bob).points == 0 ? 1000 : c.getPlayer(bob).points;
        c.recordMatch(alice, bob, false, _id("fuzz-decisive"));
        vm.stopPrank();

        uint256 aAfter = c.getPlayer(alice).points;
        uint256 bAfter = c.getPlayer(bob).points;
        uint256 gain = aAfter - aBefore;
        assertLe(gain, c.K()); // never moves more than K
        if (bBefore >= gain) {
            assertEq(bBefore - bAfter, gain); // zero-sum when no floor
        } else {
            assertEq(bAfter, 0); // floored
        }
    }
}
