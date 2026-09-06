import { ipfsToHttp } from "./contracts";

const cache = new Map();

/** Fetch a card's IPFS metadata JSON (name/description/image/attributes), with an in-memory cache. */
export async function fetchCardMetadata(tokenURI) {
  if (cache.has(tokenURI)) return cache.get(tokenURI);
  try {
    if (tokenURI.startsWith("data:application/json;base64,")) {
      const base64 = tokenURI.replace("data:application/json;base64,", "");
      const jsonStr =
        typeof window !== "undefined" && window.atob
          ? decodeURIComponent(escape(window.atob(base64)))
          : Buffer.from(base64, "base64").toString("utf-8");
      const json = JSON.parse(jsonStr);
      cache.set(tokenURI, json);
      return json;
    }
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
