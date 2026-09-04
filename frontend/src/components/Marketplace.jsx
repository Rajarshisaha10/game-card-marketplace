import React, { useCallback, useEffect, useState } from "react";
import { getGameCardContract, getMarketplaceContract } from "../utils/contracts";
import CardTile from "./CardTile";

export default function Marketplace({ wallet, refreshKey, bumpRefresh }) {
  const { provider, signer, account } = wallet;
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyTokenId, setBusyTokenId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const marketplace = getMarketplaceContract(provider);
      const gameCard = getGameCardContract(provider);

      const activeIds = await marketplace.getActiveListings();

      const items = await Promise.all(
        activeIds.map(async (id) => {
          const [listing, tokenURI, cardData] = await Promise.all([
            marketplace.listings(id),
            gameCard.tokenURI(id),
            gameCard.cardData(id),
          ]);
          return {
            tokenId: Number(id),
            seller: listing.seller,
            price: listing.price,
            tokenURI,
            rarity: Number(cardData.rarity),
          };
        })
      );

      // newest listings first
      items.sort((a, b) => b.tokenId - a.tokenId);
      setListings(items);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleBuy(item) {
    if (!signer) {
      setMessage("Connect your wallet first.");
      return;
    }
    setMessage(null);
    setBusyTokenId(item.tokenId);
    try {
      const marketplace = getMarketplaceContract(signer);
      const tx = await marketplace.buyCard(item.tokenId, { value: item.price });
      await tx.wait();
      setMessage(`Purchased card #${item.tokenId}!`);
      bumpRefresh();
    } catch (err) {
      console.error(err);
      setMessage(err?.reason || err?.shortMessage || err?.message || "Purchase failed");
    } finally {
      setBusyTokenId(null);
    }
  }

  async function handleCancel(item) {
    if (!signer) return;
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

  return (
    <section>
      <div className="section-header">
        <h2>Marketplace</h2>
        <button className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {message && <div className="info-banner">{message}</div>}
      {loading && <p className="hint">Loading listings…</p>}
      {!loading && listings.length === 0 && <p className="hint">No cards listed for sale yet.</p>}

      <div className="card-grid">
        {listings.map((item) => {
          const isOwnListing = account && item.seller.toLowerCase() === account.toLowerCase();
          const isBusy = busyTokenId === item.tokenId;
          return (
            <CardTile
              key={item.tokenId}
              tokenId={item.tokenId}
              tokenURI={item.tokenURI}
              onChainRarity={item.rarity}
              price={item.price}
              footer={
                <div className="card-footer">
                  <span className="seller">
                    Seller: {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                  </span>
                  {isOwnListing ? (
                    <button className="btn btn-secondary" disabled={isBusy} onClick={() => handleCancel(item)}>
                      {isBusy ? "Cancelling…" : "Cancel Listing"}
                    </button>
                  ) : (
                    <button className="btn btn-primary" disabled={isBusy || !account} onClick={() => handleBuy(item)}>
                      {isBusy ? "Buying…" : "Buy"}
                    </button>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
