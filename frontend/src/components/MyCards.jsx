import React, { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { getGameCardContract, getMarketplaceContract, MARKETPLACE_ADDRESS } from "../utils/contracts";
import CardTile from "./CardTile";

export default function MyCards({ wallet, refreshKey, bumpRefresh }) {
  const { provider, signer, account, wrongNetwork } = wallet;
  const [cards, setCards] = useState([]);
  const [listingPrices, setListingPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyTokenId, setBusyTokenId] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeListingIds, setActiveListingIds] = useState(new Set());

  const load = useCallback(async () => {
    if (!account) {
      setCards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const readProvider = (!wrongNetwork && provider) ? provider : undefined;
      const gameCard = getGameCardContract(readProvider);
      const marketplace = getMarketplaceContract(readProvider);

      const [ownedIds, activeListings] = await Promise.all([
        gameCard.getCardsOwnedBy(account),
        marketplace.getActiveListings(),
      ]);
      setActiveListingIds(new Set(activeListings.map((id) => Number(id))));

      const items = await Promise.all(
        ownedIds.map(async (id) => {
          const [tokenURI, cardData] = await Promise.all([gameCard.tokenURI(id), gameCard.cardData(id)]);
          return { tokenId: Number(id), tokenURI, rarity: Number(cardData.rarity) };
        })
      );

      items.sort((a, b) => b.tokenId - a.tokenId);
      setCards(items);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Failed to load your cards");
    } finally {
      setLoading(false);
    }
  }, [provider, account, wrongNetwork]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleList(item) {
    if (wrongNetwork) {
      setMessage("Please switch to the correct network before listing.");
      return;
    }
    const priceStr = listingPrices[item.tokenId];
    if (!priceStr || Number(priceStr) <= 0) {
      setMessage("Enter a valid price in ETH before listing.");
      return;
    }
    setMessage(null);
    setBusyTokenId(item.tokenId);
    try {
      const gameCard = getGameCardContract(signer);
      const marketplace = getMarketplaceContract(signer);

      const approved = await gameCard.getApproved(item.tokenId);
      if (approved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
        const approveTx = await gameCard.approve(MARKETPLACE_ADDRESS, item.tokenId);
        await approveTx.wait();
      }

      const priceWei = ethers.parseEther(priceStr);
      const listTx = await marketplace.listCard(item.tokenId, priceWei);
      await listTx.wait();

      setMessage(`Listed card #${item.tokenId} for ${priceStr} ETH.`);
      bumpRefresh();
    } catch (err) {
      console.error(err);
      setMessage(err?.reason || err?.shortMessage || err?.message || "Listing failed");
    } finally {
      setBusyTokenId(null);
    }
  }

  async function handleCancel(item) {
    setMessage(null);
    setBusyTokenId(item.tokenId);
    try {
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.cancelListing(item.tokenId);
      await tx.wait();
      setMessage(`Cancelled listing for card #${item.tokenId}`);
      bumpRefresh();
    } catch (err) {
      console.error(err);
      setMessage(err?.reason || err?.shortMessage || err?.message || "Cancel failed");
    } finally {
      setBusyTokenId(null);
    }
  }

  if (!account) {
    return (
      <section>
        <h2>My Cards</h2>
        <p className="hint">Connect your wallet to see the cards you own.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="section-header">
        <h2>My Cards</h2>
        <button className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {message && <div className="info-banner">{message}</div>}
      {loading && <p className="hint">Loading your collection…</p>}
      {!loading && cards.length === 0 && <p className="hint">You don't own any cards yet — mint one!</p>}

      <div className="card-grid">
        {cards.map((item) => {
          const isBusy = busyTokenId === item.tokenId;
          const isListed = activeListingIds.has(item.tokenId);
          return (
            <CardTile
              key={item.tokenId}
              tokenId={item.tokenId}
              tokenURI={item.tokenURI}
              onChainRarity={item.rarity}
              footer={
                isListed ? (
                  <div className="card-footer">
                    <span className="hint">Listed for sale</span>
                    <button className="btn btn-secondary" disabled={isBusy} onClick={() => handleCancel(item)}>
                      {isBusy ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                ) : (
                  <div className="list-form">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="Price in ETH"
                      value={listingPrices[item.tokenId] || ""}
                      onChange={(e) =>
                        setListingPrices((prev) => ({ ...prev, [item.tokenId]: e.target.value }))
                      }
                    />
                    <button className="btn btn-primary" disabled={isBusy} onClick={() => handleList(item)}>
                      {isBusy ? "Listing…" : "List for Sale"}
                    </button>
                  </div>
                )
              }
            />
          );
        })}
      </div>
    </section>
  );
}
