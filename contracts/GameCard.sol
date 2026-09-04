// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GameCard - Rift Runners collectible trading card NFT
/// @notice Each token is a unique game card. Image + full metadata JSON (name,
///         description, image, attributes) live on IPFS; the IPFS URI is
///         stored on-chain as the tokenURI. Rarity is additionally mirrored
///         on-chain so it can be queried / filtered without an indexer.
contract GameCard is ERC721URIStorage, ERC721Enumerable, Ownable {
    enum Rarity {
        Common,
        Uncommon,
        Rare,
        Epic,
        Legendary
    }

    struct CardData {
        Rarity rarity;
        address creator;
        uint256 mintedAt;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => CardData) public cardData;

    /// @notice Optional mint fee (in wei) to discourage spam minting. Defaults to 0.
    uint256 public mintPrice;

    event CardMinted(
        uint256 indexed tokenId,
        address indexed creator,
        Rarity rarity,
        string tokenURI
    );

    constructor(uint256 _mintPrice) ERC721("Rift Runners Card", "RRCARD") Ownable(msg.sender) {
        mintPrice = _mintPrice;
    }

    /// @notice Mint a new unique game card.
    /// @param to Recipient of the newly minted card.
    /// @param ipfsTokenURI IPFS URI (e.g. ipfs://<CID>) pointing at the card's JSON metadata,
    ///        which itself references the card image (also stored on IPFS).
    /// @param rarity Rarity tier of the card, stored on-chain for easy filtering.
    function mintCard(
        address to,
        string memory ipfsTokenURI,
        Rarity rarity
    ) external payable returns (uint256) {
        require(bytes(ipfsTokenURI).length > 0, "GameCard: empty tokenURI");
        require(msg.value >= mintPrice, "GameCard: insufficient mint fee");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, ipfsTokenURI);

        cardData[tokenId] = CardData({
            rarity: rarity,
            creator: msg.sender,
            mintedAt: block.timestamp
        });

        emit CardMinted(tokenId, msg.sender, rarity, ipfsTokenURI);
        return tokenId;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function getCardsOwnedBy(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "GameCard: withdraw failed");
    }

    // ---- Required overrides for multiple inheritance (ERC721URIStorage + ERC721Enumerable) ----

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
