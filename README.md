# CLAWD App Competition Registry

**Live URL:** https://bafybeiajmcqk6k4tnzn3yifvtjmitxhqofzaqeb5oyikjikviwphhnyube.ipfs.community.bgipfs.com/

A public on-chain submission registry for the CLAWD app build competition on Base. Users burn CLAWD tokens to register their app entries, creating a permanent on-chain record.

## What It Does

- **Submit** your app to the competition by burning CLAWD tokens (currently 5,000 CLAWD per submission)
- **Browse** all submissions on the public registry — app name, description, URL, GitHub link, submitter address
- **Admin** controls to manage submissions and adjust the burn amount

## Live App

IPFS deployment: see `DEPLOYMENT.md` after delivery

## Contract on Base

`CLAWDRegistry` — [`0x2eD974558336936E26E9A4B43E608d0a58416f39`](https://basescan.org/address/0x2eD974558336936E26E9A4B43E608d0a58416f39) ✓ Verified

CLAWD Token: [`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07`](https://basescan.org/address/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07)

## Running Locally

```bash
yarn install
yarn chain         # start local anvil
yarn deploy        # deploy contracts locally
yarn start         # frontend at localhost:3000
```

## Architecture

- `packages/foundry/contracts/CLAWDRegistry.sol` — burn-to-submit registry with admin controls
- `packages/nextjs/app/page.tsx` — public submissions list (reads from events)
- `packages/nextjs/app/submit/page.tsx` — submission form (Approve → Submit two-step flow)
- `packages/nextjs/app/admin/page.tsx` — admin panel (gated to admin wallet)

## Admin Actions

The admin wallet (`0x34aa3f359a9d614239015126635ce7732c18fdf3`) can:
- `setBurnAmount(uint256)` — adjust the CLAWD burn requirement
- `removeSubmission(uint256)` — soft-remove a submission (hidden from public view)
- `transferAdmin(address)` — transfer admin role

No `acceptOwnership()` call required — contract uses direct admin assignment.
