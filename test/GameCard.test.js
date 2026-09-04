const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameCard", function () {
  let gameCard, owner, alice, bob;
  const SAMPLE_URI = "ipfs://bafyExampleCid/flamewing-drake.json";

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const GameCard = await ethers.getContractFactory("GameCard");
    gameCard = await GameCard.deploy(0); // free mint
    await gameCard.waitForDeployment();
  });

  it("has the expected name and symbol", async function () {
    expect(await gameCard.name()).to.equal("Rift Runners Card");
    expect(await gameCard.symbol()).to.equal("RRCARD");
  });

  it("mints a card with a unique token id, owner, and tokenURI", async function () {
    await expect(gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 4 /* Legendary */))
      .to.emit(gameCard, "CardMinted")
      .withArgs(0, alice.address, 4, SAMPLE_URI);

    expect(await gameCard.ownerOf(0)).to.equal(alice.address);
    expect(await gameCard.tokenURI(0)).to.equal(SAMPLE_URI);

    const card = await gameCard.cardData(0);
    expect(card.rarity).to.equal(4);
    expect(card.creator).to.equal(alice.address);
  });

  it("increments token ids uniquely across mints", async function () {
    await gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 0);
    await gameCard.connect(bob).mintCard(bob.address, SAMPLE_URI, 2);

    expect(await gameCard.ownerOf(0)).to.equal(alice.address);
    expect(await gameCard.ownerOf(1)).to.equal(bob.address);
    expect(await gameCard.totalMinted()).to.equal(2);
  });

  it("rejects minting with an empty tokenURI", async function () {
    await expect(gameCard.connect(alice).mintCard(alice.address, "", 0)).to.be.revertedWith(
      "GameCard: empty tokenURI"
    );
  });

  it("enforces the mint price when set by the owner", async function () {
    await gameCard.setMintPrice(ethers.parseEther("0.01"));

    await expect(
      gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 0, { value: 0 })
    ).to.be.revertedWith("GameCard: insufficient mint fee");

    await expect(
      gameCard
        .connect(alice)
        .mintCard(alice.address, SAMPLE_URI, 0, { value: ethers.parseEther("0.01") })
    ).to.not.be.reverted;
  });

  it("lists all cards owned by a given address", async function () {
    await gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 0);
    await gameCard.connect(alice).mintCard(alice.address, SAMPLE_URI, 1);
    await gameCard.connect(bob).mintCard(bob.address, SAMPLE_URI, 2);

    const aliceCards = await gameCard.getCardsOwnedBy(alice.address);
    expect(aliceCards.map((n) => Number(n))).to.deep.equal([0, 1]);

    const bobCards = await gameCard.getCardsOwnedBy(bob.address);
    expect(bobCards.map((n) => Number(n))).to.deep.equal([2]);
  });

  it("only allows the owner to withdraw collected mint fees", async function () {
    await gameCard.setMintPrice(ethers.parseEther("0.01"));
    await gameCard
      .connect(alice)
      .mintCard(alice.address, SAMPLE_URI, 0, { value: ethers.parseEther("0.01") });

    await expect(gameCard.connect(alice).withdraw()).to.be.revertedWithCustomError(
      gameCard,
      "OwnableUnauthorizedAccount"
    );

    await expect(gameCard.connect(owner).withdraw()).to.changeEtherBalances(
      [gameCard, owner],
      [ethers.parseEther("-0.01"), ethers.parseEther("0.01")]
    );
  });
});
