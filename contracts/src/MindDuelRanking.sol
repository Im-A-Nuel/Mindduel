// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MindDuelRanking
 * @notice On-chain points & ranking ledger for MindDuel — a trivia + tic-tac-toe
 *         duel game on Celo. There is NO staking or betting: ranked matches are
 *         a pure skill ladder. Winning raises your points (and rank); losing
 *         lowers them.
 *
 * Trust model: a trusted backend relayer (the contract `owner`) submits the
 * authoritative result of each ranked PvP match via {recordMatch} and pays the
 * Celo gas. Players never pay gas to be ranked — they just connect a wallet
 * (e.g. MiniPay) and play. Results are idempotent per `matchId` so a retried
 * submission can never double-count.
 *
 * Rating math is a self-contained integer Elo (start 1000, K = 32). Because Elo
 * is zero-sum, the winner gains exactly what the loser drops (floored at 0).
 */
contract MindDuelRanking {
    // ─── Types ────────────────────────────────────────────────────────────
    struct Player {
        uint256 points; // current rating (Elo). 0 until first match (see START).
        uint64 wins;
        uint64 losses;
        uint64 draws;
        uint64 lastPlayed; // unix seconds of most recent recorded match
        bool exists;
    }

    // ─── Constants ────────────────────────────────────────────────────────
    /// Starting rating for a player's first recorded match.
    uint256 public constant START = 1000;
    /// Elo K-factor — the maximum points that can move in a single match.
    uint256 public constant K = 32;
    /// Fixed-point scale used internally for the expected-score logistic.
    uint256 private constant SCALE = 1_000_000;

    // ─── Storage ──────────────────────────────────────────────────────────
    address public owner;
    mapping(address => Player) public players;
    address[] public roster; // every player that has ever been recorded
    mapping(bytes32 => bool) public settled; // matchId => recorded?

    // ─── Daily check-in (player-signed on-chain activity) ──────────────────
    // Players call checkIn() from their own wallet once per day. This is the
    // user-initiated on-chain action (each a distinct sender) that drives daily
    // active users + transactions, separate from owner-recorded match results.
    mapping(address => uint64) public lastCheckInDay; // unix day of last check-in
    mapping(address => uint64) public checkInCount;   // lifetime check-ins per player
    uint256 public totalCheckIns;                     // global counter

    // ─── Events ───────────────────────────────────────────────────────────
    event MatchRecorded(
        bytes32 indexed matchId,
        address indexed winner,
        address indexed loser,
        bool draw,
        uint256 winnerPoints,
        uint256 loserPoints
    );
    event PlayerRegistered(address indexed player);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event CheckedIn(address indexed player, uint64 indexed day, uint64 count, uint256 total);

    // ─── Errors ───────────────────────────────────────────────────────────
    error NotOwner();
    error ZeroAddress();
    error SamePlayer();
    error AlreadySettled();
    error AlreadyCheckedIn();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _owner) {
        owner = _owner == address(0) ? msg.sender : _owner;
        emit OwnershipTransferred(address(0), owner);
    }

    // ─── Admin ────────────────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Core ─────────────────────────────────────────────────────────────
    /**
     * @notice Record a ranked PvP result. Owner-only and idempotent per matchId.
     * @param winner  Winner address. For a draw this is simply "player A".
     * @param loser   Loser address. For a draw this is simply "player B".
     * @param draw    True if the match ended in a draw.
     * @param matchId Unique id of the match (keccak/uuid). Prevents double-count.
     */
    function recordMatch(address winner, address loser, bool draw, bytes32 matchId)
        external
        onlyOwner
    {
        if (winner == address(0) || loser == address(0)) revert ZeroAddress();
        if (winner == loser) revert SamePlayer();
        if (settled[matchId]) revert AlreadySettled();
        settled[matchId] = true;

        Player storage a = _ensure(winner); // "winner" / player A
        Player storage b = _ensure(loser); // "loser" / player B

        if (draw) {
            // Symmetric adjustment toward the expected score of 0.5.
            int256 deltaA = _drawDelta(a.points, b.points);
            a.points = _applyDelta(a.points, deltaA);
            b.points = _applyDelta(b.points, -deltaA);
            a.draws += 1;
            b.draws += 1;
        } else {
            // Winner gains K*(1 - E_winner); loser drops the same amount.
            uint256 gain = (K * (SCALE - _expected(a.points, b.points))) / SCALE;
            a.points += gain;
            b.points = b.points > gain ? b.points - gain : 0;
            a.wins += 1;
            b.losses += 1;
        }

        uint64 ts = uint64(block.timestamp);
        a.lastPlayed = ts;
        b.lastPlayed = ts;

        emit MatchRecorded(matchId, winner, loser, draw, a.points, b.points);
    }

    /**
     * @notice Daily on-chain check-in, called by the player from their own
     *         wallet. One per UTC day per address. Cheap and permissionless —
     *         its purpose is verifiable daily on-chain activity (each caller a
     *         distinct address), not ranking. Reverts if already checked in today.
     */
    function checkIn() external {
        uint64 today = uint64(block.timestamp / 1 days);
        if (lastCheckInDay[msg.sender] == today && checkInCount[msg.sender] != 0) {
            revert AlreadyCheckedIn();
        }
        lastCheckInDay[msg.sender] = today;
        uint64 c = checkInCount[msg.sender] + 1;
        checkInCount[msg.sender] = c;
        totalCheckIns += 1;
        emit CheckedIn(msg.sender, today, c, totalCheckIns);
    }

    // ─── Views ────────────────────────────────────────────────────────────
    function getPlayer(address who) external view returns (Player memory) {
        return players[who];
    }

    function playerCount() external view returns (uint256) {
        return roster.length;
    }

    /**
     * @notice Paginated roster read for building a leaderboard off-chain.
     *         Returns parallel arrays of addresses and their Player structs.
     */
    function getPlayers(uint256 start, uint256 count)
        external
        view
        returns (address[] memory addrs, Player[] memory data)
    {
        uint256 n = roster.length;
        if (start >= n) {
            return (new address[](0), new Player[](0));
        }
        uint256 end = start + count;
        if (end > n) end = n;
        uint256 len = end - start;
        addrs = new address[](len);
        data = new Player[](len);
        for (uint256 i = 0; i < len; i++) {
            address who = roster[start + i];
            addrs[i] = who;
            data[i] = players[who];
        }
    }

    // ─── Internal: registration ───────────────────────────────────────────
    function _ensure(address who) internal returns (Player storage p) {
        p = players[who];
        if (!p.exists) {
            p.exists = true;
            p.points = START;
            roster.push(who);
            emit PlayerRegistered(who);
        }
    }

    function _applyDelta(uint256 pts, int256 delta) internal pure returns (uint256) {
        if (delta >= 0) return pts + uint256(delta);
        uint256 drop = uint256(-delta);
        return pts > drop ? pts - drop : 0;
    }

    // ─── Internal: Elo math ───────────────────────────────────────────────
    /**
     * Expected score of `self` against `opp`, scaled by SCALE (1e6).
     * E_self = 1 / (1 + 10^((opp - self) / 400)).
     *
     * 10^(d/400) is evaluated from a 9-point table over |d| ∈ [0, 400] (step 50)
     * with linear interpolation; |d| is clamped at 400 (beyond which the
     * expected score is effectively 0 or 1). For d < 0 the reciprocal is taken.
     */
    function _expected(uint256 self, uint256 opp) internal pure returns (uint256) {
        int256 d = int256(opp) - int256(self);
        bool neg = d < 0;
        uint256 ad = uint256(neg ? -d : d);
        if (ad > 400) ad = 400;

        // 10^(ad/400) * 1e6 at ad = 0,50,100,...,400
        uint256[9] memory T = [
            uint256(1_000_000),
            1_333_521,
            1_778_279,
            2_371_374,
            3_162_278,
            4_216_965,
            5_623_413,
            7_498_942,
            10_000_000
        ];
        uint256 idx = ad / 50;
        uint256 rem = ad % 50;
        uint256 f = T[idx];
        if (rem > 0 && idx < 8) {
            f += ((T[idx + 1] - T[idx]) * rem) / 50;
        }
        if (neg) {
            // 10^(-x) = 1 / 10^x ; keep the 1e6 scale.
            f = (SCALE * SCALE) / f;
        }
        // E = 1 / (1 + f) scaled by 1e6.
        return (SCALE * SCALE) / (SCALE + f);
    }

    /// Signed points change for player A in a draw: K * (0.5 - E_A).
    function _drawDelta(uint256 aPts, uint256 bPts) internal pure returns (int256) {
        uint256 eA = _expected(aPts, bPts); // scaled 1e6
        // K * (SCALE/2 - eA) / SCALE
        int256 half = int256(SCALE / 2);
        return (int256(K) * (half - int256(eA))) / int256(SCALE);
    }
}
