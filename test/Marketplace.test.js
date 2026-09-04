const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let gameCard, marketplace, owner, alice, bob;
  const SAMPLE_URI = "ipfs://bafyExampleCid/flamewing-drake.json";
  const PRICE = ethers.parseEther("1");
  const FEE_BPS = 250; // 2.5%

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const GameCard = await ethers.getContractFactory("GameCard");
    gameCard = await GameCard.deploy(0);
    await gameCard.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(await gameCard.getAddress(), FEE_BPS);
    await marketplace.waitForDeployment();

    // Alice mints card #0
    await gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 2);
  });

  async function approveAndList(signer, tokenId, price) {
    await gameCard.connect(signer).approve(await marketplace.getAddress(), tokenId);
    return marketplace.connect(signer).listCard(tokenId, price);
  }

  it("lets an owner list a card they've approved to the marketplace", async function () {
    await gameCard.connect(alice).approve(await marketplace.getAddress(), 0);
    await expect(marketplace.connect(alice).listCard(0, PRICE))
      .to.emit(marketplace, "CardListed")
      .withArgs(0, alice.address, PRICE);

    const listing = await marketplace.listings(0);
    expect(listing.seller).to.equal(alice.address);
    expect(listing.price).to.equal(PRICE);
    expect(listing.active).to.equal(true);
  });

  it("rejects listing by a non-owner", async function () {
    await expect(marketplace.connect(bob).listCard(0, PRICE)).to.be.revertedWith(
      "Marketplace: not card owner"
    );
  });

  it("rejects listing without marketplace approval", async function () {
    await expect(marketplace.connect(alice).listCard(0, PRICE)).to.be.revertedWith(
      "Marketplace: marketplace not approved"
    );
  });

  it("rejects a zero price listing", async function () {
    await gameCard.connect(alice).approve(await marketplace.getAddress(), 0);
    await expect(marketplace.connect(alice).listCard(0, 0)).to.be.revertedWith(
      "Marketplace: price must be > 0"
    );
  });

  it("allows a buyer to purchase a listed card, paying seller minus fee", async function () {
    await approveAndList(alice, 0, PRICE);

    const fee = (PRICE * BigInt(FEE_BPS)) / 10000n;
    const sellerProceeds = PRICE - fee;

    await expect(
      marketplace.connect(bob).buyCard(0, { value: PRICE })
    ).to.changeEtherBalances([bob, alice, owner], [-PRICE, sellerProceeds, fee]);

    expect(await gameCard.ownerOf(0)).to.equal(bob.address);

    const listing = await marketplace.listings(0);
    expect(listing.active).to.equal(false);
  });

  it("rejects purchase with incorrect payment amount", async function () {
    await approveAndList(alice, 0, PRICE);
    await expect(
      marketplace.connect(bob).buyCard(0, { value: ethers.parseEther("0.5") })
    ).to.be.revertedWith("Marketplace: incorrect payment");
  });

  it("rejects purchase of a card that is not listed", async function () {
    await expect(marketplace.connect(bob).buyCard(0, { value: PRICE })).to.be.revertedWith(
      "Marketplace: not listed"
    );
  });

  it("allows the seller to cancel a listing", async function () {
    await approveAndList(alice, 0, PRICE);
    await expect(marketplace.connect(alice).cancelListing(0))
      .to.emit(marketplace, "ListingCancelled")
      .withArgs(0, alice.address);

    await expect(marketplace.connect(bob).buyCard(0, { value: PRICE })).to.be.revertedWith(
      "Marketplace: not listed"
    );
  });

  it("prevents buying after the card was already sold to someone else", async function () {
    await approveAndList(alice, 0, PRICE);
    await marketplace.connect(bob).buyCard(0, { value: PRICE });

    const [, , carol] = await ethers.getSigners();
    await expect(marketplace.connect(carol).buyCard(0, { value: PRICE })).to.be.revertedWith(
      "Marketplace: not listed"
    );
  });

  it("lets the seller update the listing price", async function () {
    await approveAndList(alice, 0, PRICE);
    const newPrice = ethers.parseEther("2");
    await marketplace.connect(alice).updatePrice(0, newPrice);
    const listing = await marketplace.listings(0);
    expect(listing.price).to.equal(newPrice);
  });

  it("returns only currently active listings from getActiveListings", async function () {
    await gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 1); // tokenId 1
    await approveAndList(alice, 0, PRICE);
    await approveAndList(alice, 1, PRICE);

    await marketplace.connect(alice).cancelListing(0);

    const active = await marketplace.getActiveListings();
    expect(active.map((n) => Number(n))).to.deep.equal([1]);
  });

  it("only allows the marketplace owner to change the fee, capped at 10%", async function () {
    await expect(marketplace.connect(alice).setFeeBps(500)).to.be.revertedWithCustomError(
      marketplace,
      "OwnableUnauthorizedAccount"
    );

    await expect(marketplace.connect(owner).setFeeBps(1500)).to.be.revertedWith(
      "Marketplace: fee too high"
    );

    await marketplace.connect(owner).setFeeBps(500);
    expect(await marketplace.feeBps()).to.equal(500);
  });
});
