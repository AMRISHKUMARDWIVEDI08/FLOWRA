# FLOWRA

**Simple Global Payments**

FLOWRA is a mobile-first stablecoin payment workspace built around Arc and Circle infrastructure. The product goal is to make receiving, sending, requesting, invoicing, tracking, verifying, and reconciling USDC payments simple.

## Current status

This repository is the active implementation workspace. It is not considered production-ready until dependency installation, build, tests, wallet/payment flows, security review, deployment, and live verification have all passed.

## Stack

- React + Vite + TypeScript
- Circle App Kit
- Arc Testnet
- Viem
- Browser wallet discovery through EIP-6963
- Local browser storage for the current prototype ledger

## Development

```bash
npm install
npm run dev
npm run build
```

## Arc Testnet

- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app

Never commit private keys, seed phrases, API secrets, entity secrets, or wallet credentials.
