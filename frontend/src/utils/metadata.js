import { ipfsToHttp } from "./contracts";

const cache = new Map();

/** Fetch a card's IPFS metadata JSON (name/description/image/attributes), with an in-memory cache. */
export async function fetchCardMetadata(tokenURI) {
  if (cache.has(tokenURI)) return cache.get(tokenURI);
  try {
    const res = await fetch(ipfsToHttp(tokenURI));
    if (!res.ok) throw new Error(`Failed to fetch metadata (${res.status})`);
    const json = await res.json();
    cache.set(tokenURI, json);
    return json;
  } catch (err) {
    const fallback = {
      name: "Unknown Card",
      description: "Metadata could not be loaded from IPFS.",
      image: "",
      attributes: [],
      error: err?.message,
    };
    return fallback;
  }
}
