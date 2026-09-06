const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Executing with account:", deployer.address);

  const gameCardAddress = "0x09384cEebBd6a78AB822c6006035175C836af58A";
  const marketplaceAddress = "0xc5EE55e8Ab2e7c6fe98E4F2D440051E52dB94E0f";

  const GameCard = await hre.ethers.getContractFactory("GameCard");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");

  const gameCard = GameCard.attach(gameCardAddress);
  const marketplace = Marketplace.attach(marketplaceAddress);

  // High-aesthetic SVG card artwork
  const svgArt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f0c1b"/>
        <stop offset="50%" stop-color="#2d124d"/>
        <stop offset="100%" stop-color="#0a0814"/>
      </linearGradient>
      <linearGradient id="crystal" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00f2fe"/>
        <stop offset="100%" stop-color="#4facfe"/>
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f6d365"/>
        <stop offset="100%" stop-color="#fda085"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <rect width="400" height="500" rx="20" fill="url(#bg)" stroke="#9d4edd" stroke-width="4"/>
    <circle cx="200" cy="200" r="130" fill="#7b2cbf" opacity="0.2" filter="url(#glow)"/>
    <circle cx="200" cy="200" r="90" fill="none" stroke="#c77dff" stroke-width="2" stroke-dasharray="8 6"/>
    <!-- Crystal Core / Dragon Sigil -->
    <polygon points="200,100 270,200 200,300 130,200" fill="url(#crystal)" filter="url(#glow)"/>
    <polygon points="200,130 250,200 200,270 150,200" fill="#ffffff" opacity="0.3"/>
    <polygon points="200,80 220,120 180,120" fill="url(#gold)"/>
    <polygon points="200,320 220,280 180,280" fill="url(#gold)"/>
    <text x="200" y="380" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">AETHERIAL PHANTOM</text>
    <text x="200" y="410" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#c77dff" text-anchor="middle" letter-spacing="4">TIER: EPIC</text>
    <line x1="60" y1="435" x2="340" y2="435" stroke="#3c096c" stroke-width="2"/>
    <text x="100" y="465" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#9d4edd" text-anchor="middle">ATK 88</text>
    <text x="200" y="465" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#4facfe" text-anchor="middle">DEF 72</text>
    <text x="300" y="465" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" fill="#fda085" text-anchor="middle">SPD 95</text>
  </svg>`;

  const imageUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgArt)}`;

  const metadata = {
    name: "Aetherial Phantom",
    description: "A mystical entity forged in the rift, slicing through dimensions with ethereal precision.",
    image: imageUri,
    attributes: [
      { trait_type: "Attack", value: "88" },
      { trait_type: "Defense", value: "72" },
      { trait_type: "Speed", value: "95" },
      { trait_type: "Element", value: "Void" },
      { trait_type: "Rarity", value: "Epic" }
    ]
  };

  const tokenUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

  console.log("1. Minting Epic Card #0 on Sepolia...");
  const mintTx = await gameCard.mintCard(deployer.address, tokenUri, 3); // 3 = Epic
  console.log("Mint tx submitted:", mintTx.hash);
  const receipt = await mintTx.wait();
  console.log("Mint confirmed in block:", receipt.blockNumber);

  const tokenId = 0;

  console.log("2. Approving Marketplace to transfer Card #0...");
  const approveTx = await gameCard.approve(marketplaceAddress, tokenId);
  await approveTx.wait();
  console.log("Approval confirmed!");

  console.log("3. Listing Card #0 on Marketplace for 0.001 Sepolia ETH...");
  const listPrice = hre.ethers.parseEther("0.001");
  const listTx = await marketplace.listCard(tokenId, listPrice);
  await listTx.wait();
  console.log("Card listed successfully!");
  console.log("Listing tx hash:", listTx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
