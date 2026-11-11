# CHANCERAIL

CHANCERAIL is an original free-entry on-chain draw demonstration for BOT Chain. It records one entry per wallet per round, lets the contract owner finalize a winner, and keeps participants and previous winners publicly readable.

## Included

- Original responsive Vite/TypeScript interface.
- EIP-6963 and legacy injected-wallet discovery.
- BOT Mainnet add/switch flow, chain ID 677.
- Read-only round loading through the BOT public RPC.
- Solidity 0.8.24 contract with free entry, finalize and next-round controls.
- Explicit demonstration-only pseudo-randomness warning.

## Build

```bash
cd frontend
npm install
npm run build
```

## Environment

```text
VITE_CHANCERAIL_ADDRESS=0xYourDeployedContractAddress
```

The address is public configuration. Never upload a private key or seed phrase.

## Important limitation

The contract uses influenceable on-chain values to select a demonstration winner. It must not be used for valuable prizes, gambling, raffles, payments or other high-stakes outcomes.
