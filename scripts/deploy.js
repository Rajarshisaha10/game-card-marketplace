const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const mintPrice = hre.ethers.parseEther("0"); // free minting by default; change as desired
  const marketplaceFeeBps = 250; // 2.5% marketplace fee

  const GameCard = await hre.ethers.getContractFactory("GameCard");
  const gameCard = await GameCard.deploy(mintPrice);
  await gameCard.waitForDeployment();
  console.log("GameCard deployed to:", await gameCard.getAddress());

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(await gameCard.getAddress(), marketplaceFeeBps);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", await marketplace.getAddress());

  console.log("\nAdd these to frontend/.env:");
  console.log(`VITE_GAMECARD_ADDRESS=${await gameCard.getAddress()}`);
  console.log(`VITE_MARKETPLACE_ADDRESS=${await marketplace.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
