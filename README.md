# Rift Runners — Decentralized Game Card Marketplace

A full-stack dApp for minting, listing, and trading unique fantasy-creature
trading cards as ERC-721 NFTs on an EVM testnet (Sepolia by default, or a
local Hardhat node). Card art + metadata live on IPFS.

```
game-card-marketplace/
├── contracts/
│   ├── GameCard.sol       ERC-721 card contract (mint, rarity, tokenURI)
│   └── Marketplace.sol    Non-custodial listing/buying contract
├── scripts/
│   ├── deploy.js          Deploys both contracts
│   └── uploadToIpfs.js    CLI helper to pin art+metadata to IPFS
├── test/
│   ├── GameCard.test.js
│   └── Marketplace.test.js
├── frontend/               React + Vite + ethers.js dApp
│   └── src/
│       ├── App.jsx
│       ├── components/     WalletBar, MintForm, Marketplace, MyCards, CardTile
│       └── utils/          wallet hook, contract helpers, IPFS upload, metadata fetch
├── hardhat.config.js
└── package.json
```

## Features

- **Mint** — upload card art, pick a name/description/rarity/attributes; the
  image + metadata JSON are pinned to IPFS and the returned `ipfs://` URI is
  stored on-chain as the token's `tokenURI`. Rarity is also mirrored on-chain
  for cheap filtering.
- **List** — approve the marketplace contract for a card you own and set an
  ETH price. The NFT stays in your wallet until it actually sells (non-custodial).
- **Buy** — purchase any actively listed card; payment (minus a small
  configurable marketplace fee) goes straight to the seller, and the NFT
  transfers atomically in the same transaction.
- **Wallet connect** — MetaMask (or any injected EVM wallet), with network
  detection and a one-click "switch network" prompt.
- **Marketplace gallery** — browse all active listings with live images,
  rarity badges, and attributes pulled from IPFS.
- **My Cards** — see everything the connected wallet owns, list unlisted
  cards, or cancel your own active listings.
- **Tests** — 19 Hardhat/Chai tests covering minting, ownership, listing,
  buying, cancelling, price updates, fees, and access control.

## 1. Smart contracts

### Install & compile

```bash
npm install
npx hardhat compile
```

### Run the tests

```bash
npm test
```

All 19 tests should pass:

```
GameCard
  ✔ has the expected name and symbol
  ✔ mints a card with a unique token id, owner, and tokenURI
  ✔ increments token ids uniquely across mints
  ✔ rejects minting with an empty tokenURI
  ✔ enforces the mint price when set by the owner
  ✔ lists all cards owned by a given address
  ✔ only allows the owner to withdraw collected mint fees

Marketplace
  ✔ lets an owner list a card they've approved to the marketplace
  ✔ rejects listing by a non-owner
  ✔ rejects listing without marketplace approval
  ✔ rejects a zero price listing
  ✔ allows a buyer to purchase a listed card, paying seller minus fee
  ✔ rejects purchase with incorrect payment amount
  ✔ rejects purchase of a card that is not listed
  ✔ allows the seller to cancel a listing
  ✔ prevents buying after the card was already sold to someone else
  ✔ lets the seller update the listing price
  ✔ returns only currently active listings from getActiveListings
  ✔ only allows the marketplace owner to change the fee, capped at 10%

  19 passing
```

### Deploy to a local node (fastest way to try everything)

```bash
# terminal 1
npx hardhat node

# terminal 2
npm run deploy:localhost
```

Copy the two printed addresses into `frontend/.env` (see below). Import one
of the printed local private keys into MetaMask and add a "Localhost 8545"
network (chain id `31337`).

### Deploy to Sepolia testnet

1. Copy `.env.example` to `.env` and fill in:
   - `SEPOLIA_RPC_URL` — a free RPC URL from [Alchemy](https://alchemy.com) or [Infura](https://infura.io)
   - `PRIVATE_KEY` — a **testnet-only** wallet private key
   - Get free Sepolia ETH from a faucet, e.g. https://sepoliafaucet.com
2. Deploy:
   ```bash
   npm run deploy:sepolia
   ```
3. Copy the printed `GameCard` / `Marketplace` addresses into `frontend/.env`.

## 2. IPFS storage

Card images and metadata JSON are uploaded to IPFS via
[NFT.Storage](https://nft.storage) (free, no wallet required for an API key).

1. Create a free account at https://nft.storage and generate an API key.
2. Add it as `VITE_NFT_STORAGE_KEY` in `frontend/.env` (used by the in-app
   Mint form) and/or `NFT_STORAGE_KEY` in the root `.env` (used by the CLI
   helper `scripts/uploadToIpfs.js` if you prefer to mint from the command
   line instead of the UI).

The metadata JSON written to IPFS follows the standard NFT schema:

```json
{
  "name": "Flamewing Drake",
  "description": "A juvenile drake wreathed in restless embers.",
  "image": "ipfs://bafy.../flamewing-drake.png",
  "attributes": [
    { "trait_type": "Attack", "value": "78" },
    { "trait_type": "Defense", "value": "54" },
    { "trait_type": "Rarity", "value": "Epic" }
  ]
}
```

## 3. Frontend dApp

```bash
cd frontend
npm install
cp .env.example .env   # then fill in the values described above
npm run dev
```

Open the printed local URL, click **Connect Wallet**, and:

- **Mint a Card** — upload art, fill in details, mint (uploads to IPFS then
  calls `GameCard.mintCard`).
- **My Cards** — see your cards, set a price and click **List for Sale**
  (this sends an `approve` transaction the first time, then `listCard`).
- **Marketplace** — browse everyone's active listings and **Buy** with one
  click, or **Cancel Listing** on your own.

### Build for production

```bash
npm run build
```

## How it fits together

1. `GameCard.sol` is a standard OpenZeppelin `ERC721URIStorage` +
   `ERC721Enumerable` contract. `mintCard(to, ipfsTokenURI, rarity)` mints a
   new sequential token id, stores the IPFS metadata URI via
   `_setTokenURI`, and mirrors `rarity` in an on-chain struct so it can be
   read without parsing IPFS JSON.
2. `Marketplace.sol` never takes custody of your NFT while it's listed —
   you just `approve` the marketplace contract, and `listCard` records a
   `{seller, price, active}` struct. `buyCard` re-checks the seller still
   owns the token, transfers it with `safeTransferFrom`, splits the payment
   between seller and marketplace fee, and flips `active = false`
   (checks-effects-interactions + `ReentrancyGuard`).
3. The frontend reads `Marketplace.getActiveListings()` to enumerate the
   gallery and `GameCard.getCardsOwnedBy(address)` for "My Cards" — both
   view functions, so the whole dApp works without needing a separate
   indexer/subgraph for this demo scale.

## Notes & next steps for production use

- `MAX_FEE_BPS` caps the marketplace fee at 10%; it defaults to 2.5% and is
  owner-adjustable.
- For a larger collection you'd eventually want an off-chain indexer (e.g.
  The Graph) instead of the `getActiveListings()` loop, which is O(n) over
  all-time listings.
- Consider adding English/Dutch auctions, offers/bids, or ERC-2981 royalties
  as extensions to `Marketplace.sol`.
