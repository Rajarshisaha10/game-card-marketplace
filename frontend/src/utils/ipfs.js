import { NFTStorage, File } from "nft.storage";

const API_KEY = import.meta.env.VITE_NFT_STORAGE_KEY;

/** Compress and resize image to a compact WebP data URL to fit comfortably in a transaction */
async function fileToOptimizedDataUrl(file, maxWidth = 320, maxHeight = 320, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a card image + JSON metadata (name, description, image, attributes)
 * to IPFS via NFT.Storage if configured, or fall back to an on-chain Data URI
 * so minting works without needing paid subscriptions or third-party accounts.
 */
export async function uploadCardToIpfs({ imageFile, name, description, rarity, attributes = [] }) {
  if (!imageFile) throw new Error("An image file is required");

  const allAttributes = [...attributes, { trait_type: "Rarity", value: rarity }];

  // 1. If an NFT.Storage key is provided, upload directly to IPFS
  if (API_KEY && API_KEY.trim() !== "") {
    try {
      const client = new NFTStorage({ token: API_KEY });
      const metadata = await client.store({
        name,
        description,
        image: new File([imageFile], imageFile.name, { type: imageFile.type }),
        attributes: allAttributes,
      });
      return metadata.url;
    } catch (err) {
      console.warn("NFT.Storage upload failed, falling back to on-chain metadata:", err);
    }
  }

  // 2. Zero-key fallback: Compress image and bundle metadata into a self-contained Data URI
  const imageDataUrl = await fileToOptimizedDataUrl(imageFile);
  const metadataJson = {
    name,
    description,
    image: imageDataUrl,
    attributes: allAttributes,
  };

  const jsonStr = JSON.stringify(metadataJson);
  const base64Json =
    typeof window !== "undefined" && window.btoa
      ? window.btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString("base64");

  return `data:application/json;base64,${base64Json}`;
}
