import { ethers } from "ethers";
import GameCardAbi from "../abis/GameCard.json";
import MarketplaceAbi from "../abis/Marketplace.json";

export const GAMECARD_ADDRESS =
  import.meta.env.VITE_GAMECARD_ADDRESS || "0x09384cEebBd6a78AB822c6006035175C836af58A";
export const MARKETPLACE_ADDRESS =
  import.meta.env.VITE_MARKETPLACE_ADDRESS || "0xc5EE55e8Ab2e7c6fe98E4F2D440051E52dB94E0f";
export const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const EXPECTED_CHAIN_NAME = import.meta.env.VITE_CHAIN_NAME || "Sepolia";
export const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "https://nftstorage.link/ipfs/";

export const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

/** Convert an ipfs:// URI (or a raw CID) into an https gateway URL for display. */
export function ipfsToHttp(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return IPFS_GATEWAY + uri.replace("ipfs://", "");
  }
  return uri;
}

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  (EXPECTED_CHAIN_ID === 11155111
    ? "https://ethereum-sepolia-rpc.publicnode.com"
    : "http://127.0.0.1:8545");

export function getDefaultProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

export function getGameCardContract(signerOrProvider) {
  if (!GAMECARD_ADDRESS) throw new Error("VITE_GAMECARD_ADDRESS is not set. Deploy contracts first.");
  return new ethers.Contract(GAMECARD_ADDRESS, GameCardAbi, signerOrProvider || getDefaultProvider());
}

export function getMarketplaceContract(signerOrProvider) {
  if (!MARKETPLACE_ADDRESS) throw new Error("VITE_MARKETPLACE_ADDRESS is not set. Deploy contracts first.");
  return new ethers.Contract(MARKETPLACE_ADDRESS, MarketplaceAbi, signerOrProvider || getDefaultProvider());
}
