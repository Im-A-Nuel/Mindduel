# MindDuelRanking — Celo deployment (Foundry)

`MindDuelRanking` is the on-chain points & ranking ledger for MindDuel. No
staking — ranked PvP results are submitted by the backend relayer (the contract
`owner`), which pays gas. Players never pay to be ranked.

Toolchain: **Foundry** (run from WSL — `wsl -d Ubuntu-Ext`). Project path inside
WSL: `/mnt/f/Hack/celo/mindduel/contracts`.

## Prerequisites
- Foundry installed in WSL (`forge`, `cast`). Install: `curl -L https://foundry.paradigm.xyz | bash && foundryup`.
- `forge-std` is vendored under `lib/forge-std`.
- A funded Celo account (a little CELO for gas) for the deployer/relayer.

## 1. Configure
```bash
cp .env.example .env
# set PRIVATE_KEY (0x...) — the deployer/relayer key
# optionally set RELAYER_ADDRESS (contract owner); defaults to the deployer
```

## 2. Build & test
```bash
forge build
forge test -vvv
```

## 3. Dry run on Alfajores (testnet)
```bash
source .env
forge script script/Deploy.s.sol --rpc-url "$ALFAJORES_RPC_URL" --broadcast
```

## 4. Deploy to Celo mainnet (Proof of Ship)
```bash
source .env
forge script script/Deploy.s.sol --rpc-url "$CELO_RPC_URL" --broadcast
```
The script prints the deployed address. Copy it into:
- `frontend/.env`: `NEXT_PUBLIC_RANKING_CONTRACT_ADDRESS=0x...`
- `backend/.env`: `RANKING_CONTRACT_ADDRESS=0x...`

## 5. (Optional) Verify on Celoscan
```bash
forge verify-contract <ADDRESS> src/MindDuelRanking.sol:MindDuelRanking \
  --chain 42220 --constructor-args $(cast abi-encode "constructor(address)" <OWNER>) \
  --etherscan-api-key "$CELOSCAN_API_KEY"
```

## Notes
- The deployer becomes `owner` unless `RELAYER_ADDRESS` is set. The backend must
  submit `recordMatch` from the `owner` key, so use the same key (or
  `transferOwnership` to the backend relayer afterwards).
- Mainnet: `chainId 42220`, RPC `https://forno.celo.org`.
