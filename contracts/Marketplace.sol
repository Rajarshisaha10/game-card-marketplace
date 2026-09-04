// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Marketplace - non-custodial marketplace for GameCard NFTs
/// @notice Sellers keep custody of their card (just approve the marketplace);
///         the card is only transferred at the moment of sale. This avoids
///         locking NFTs in the contract while they're listed.
contract Marketplace is ReentrancyGuard, Ownable {
    struct Listing {
        address seller;
        uint256 price; // in wei
        bool active;
    }

    IERC721 public immutable nftContract;

    /// @notice tokenId => Listing
    mapping(uint256 => Listing) public listings;

    /// @notice all token ids that have ever been listed, used by the frontend
    ///         to enumerate the marketplace without needing an off-chain indexer.
    uint256[] private _listedTokenIds;
    mapping(uint256 => bool) private _seenTokenId;

    /// @notice marketplace fee in basis points (100 = 1%)
    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 1000; // 10% cap

    event CardListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event CardSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event ListingPriceUpdated(uint256 indexed tokenId, uint256 newPrice);

    constructor(address _nftContract, uint256 _feeBps) Ownable(msg.sender) {
        require(_nftContract != address(0), "Marketplace: zero address");
        require(_feeBps <= MAX_FEE_BPS, "Marketplace: fee too high");
        nftContract = IERC721(_nftContract);
        feeBps = _feeBps;
    }

    modifier onlyCardOwner(uint256 tokenId) {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Marketplace: not card owner");
        _;
    }

    /// @notice List a card for sale. Caller must own the card and must have
    ///         approved this contract (via approve() or setApprovalForAll()).
    function listCard(uint256 tokenId, uint256 price) external onlyCardOwner(tokenId) {
        require(price > 0, "Marketplace: price must be > 0");
        require(
            nftContract.getApproved(tokenId) == address(this) ||
                nftContract.isApprovedForAll(msg.sender, address(this)),
            "Marketplace: marketplace not approved"
        );

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});

        if (!_seenTokenId[tokenId]) {
            _seenTokenId[tokenId] = true;
            _listedTokenIds.push(tokenId);
        }

        emit CardListed(tokenId, msg.sender, price);
    }

    /// @notice Update the price of an active listing.
    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Marketplace: not listed");
        require(listing.seller == msg.sender, "Marketplace: not seller");
        require(newPrice > 0, "Marketplace: price must be > 0");
        listing.price = newPrice;
        emit ListingPriceUpdated(tokenId, newPrice);
    }

    /// @notice Cancel an active listing.
    function cancelListing(uint256 tokenId) external {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Marketplace: not listed");
        require(listing.seller == msg.sender, "Marketplace: not seller");
        listing.active = false;
        emit ListingCancelled(tokenId, msg.sender);
    }

    /// @notice Buy a listed card by sending exactly the listing price.
    function buyCard(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.active, "Marketplace: not listed");
        require(msg.value == listing.price, "Marketplace: incorrect payment");
        require(nftContract.ownerOf(tokenId) == listing.seller, "Marketplace: seller no longer owns card");

        // Effects
        listings[tokenId].active = false;

        // Interactions: transfer NFT, then pay out
        nftContract.safeTransferFrom(listing.seller, msg.sender, tokenId);

        uint256 fee = (listing.price * feeBps) / 10_000;
        uint256 sellerProceeds = listing.price - fee;

        (bool sellerPaid, ) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sellerPaid, "Marketplace: seller payment failed");

        if (fee > 0) {
            (bool feePaid, ) = payable(owner()).call{value: fee}("");
            require(feePaid, "Marketplace: fee payment failed");
        }

        emit CardSold(tokenId, listing.seller, msg.sender, listing.price);
    }

    /// @notice Returns all token ids that are *currently* actively listed.
    function getActiveListings() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            if (listings[_listedTokenIds[i]].active) count++;
        }

        uint256[] memory active = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            uint256 tokenId = _listedTokenIds[i];
            if (listings[tokenId].active) {
                active[idx] = tokenId;
                idx++;
            }
        }
        return active;
    }

    function setFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Marketplace: fee too high");
        feeBps = newFeeBps;
    }
}
