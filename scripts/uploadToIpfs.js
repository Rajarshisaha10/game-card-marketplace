/**
 * CLI helper: upload a card image + generated metadata JSON to IPFS using
 * NFT.Storage, then print the ipfs:// tokenURI you can pass to mintCard().
 *
 * Usage:
 *   NFT_STORAGE_KEY=xxxx node scripts/uploadToIpfs.js \
 *     --image ./art/flamewing-drake.png \
 *     --name "Flamewing Drake" \
 *     --description "A juvenile drake wreathed in restless embers." \
 *     --rarity Epic \
 *     --attributes "Attack:78,Defense:54,Speed:61,Element:Fire"
 *
 * Requires: npm install nft.storage
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    out[key] = args[i + 1];
  }
  return out;
}

async function main() {
  const { NFTStorage, File } = await import("nft.storage");

  const apiKey = process.env.NFT_STORAGE_KEY;
  if (!apiKey) throw new Error("Set NFT_STORAGE_KEY in your environment or .env file");

  const { image, name, description, rarity, attributes } = parseArgs();
  if (!image || !name || !rarity) {
    throw new Error("Usage: --image <path> --name <str> --description <str> --rarity <tier> [--attributes k:v,k:v]");
  }

  const client = new NFTStorage({ token: apiKey });

  const imageBuffer = fs.readFileSync(path.resolve(image));
  const imageFile = new File([imageBuffer], path.basename(image), { type: "image/png" });

  const attrPairs = (attributes || "")
    .split(",")
    .filter(Boolean)
    .map((pair) => {
      const [trait_type, value] = pair.split(":");
      return { trait_type, value };
    });
  attrPairs.push({ trait_type: "Rarity", value: rarity });

  const metadata = await client.store({
    name,
    description: description || "",
    image: imageFile,
    attributes: attrPairs,
  });

  console.log("\n✅ Uploaded to IPFS");
  console.log("Metadata URI (pass as ipfsTokenURI to mintCard):", metadata.url);
  console.log("Gateway preview:", metadata.embed().image.pathname);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
