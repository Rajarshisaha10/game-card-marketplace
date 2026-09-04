import { NFTStorage, File } from "nft.storage";

const API_KEY = import.meta.env.VITE_NFT_STORAGE_KEY;

/**
 * Upload a card image + JSON metadata (name, description, image, attributes)
 * to IPFS via NFT.Storage in a single call. Returns the ipfs:// metadata URI
 * that should be passed to GameCard.mintCard().
 */
export async function uploadCardToIpfs({ imageFile, name, description, rarity, attributes = [] }) {
  if (!API_KEY) {
    throw new Error(
      "Missing VITE_NFT_STORAGE_KEY. Get a free API key at https://nft.storage and add it to frontend/.env"
    );
  }
  if (!imageFile) throw new Error("An image file is required");

  const client = new NFTStorage({ token: API_KEY });

  const allAttributes = [...attributes, { trait_type: "Rarity", value: rarity }];

  const metadata = await client.store({
    name,
    description,
    image: new File([imageFile], imageFile.name, { type: imageFile.type }),
    attributes: allAttributes,
  });

  // metadata.url is the ipfs:// URI of the metadata JSON (image already embedded/pinned)
  return metadata.url;
}
