import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ipfsToHttp, RARITIES } from "../utils/contracts";
import { fetchCardMetadata } from "../utils/metadata";

const RARITY_CLASS = ["common", "uncommon", "rare", "epic", "legendary"];

export default function CardTile({ tokenId, tokenURI, onChainRarity, price, footer }) {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (tokenURI) {
      fetchCardMetadata(tokenURI).then((m) => {
        if (!cancelled) setMeta(m);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [tokenURI]);

  const rarityIndex = onChainRarity ?? RARITIES.indexOf(
    meta?.attributes?.find((a) => a.trait_type === "Rarity")?.value
  );
  const rarityLabel = RARITIES[rarityIndex] || "Common";
  const rarityClass = RARITY_CLASS[rarityIndex] || "common";

  return (
    <div className={`card-tile rarity-${rarityClass}`}>
      <div className="card-image-wrap">
        {meta?.image ? (
          <img src={ipfsToHttp(meta.image)} alt={meta.name} loading="lazy" />
        ) : (
          <div className="card-image-placeholder">Loading…</div>
        )}
        <span className={`rarity-badge rarity-${rarityClass}`}>{rarityLabel}</span>
      </div>

      <div className="card-body">
        <div className="card-title-row">
          <h3>{meta?.name || `Card #${tokenId}`}</h3>
          <span className="card-id">#{tokenId}</span>
        </div>
        <p className="card-description">{meta?.description}</p>

        {meta?.attributes?.length > 0 && (
          <div className="attributes">
            {meta.attributes
              .filter((a) => a.trait_type !== "Rarity")
              .map((a) => (
                <span key={a.trait_type} className="attribute-chip">
                  {a.trait_type}: {a.value}
                </span>
              ))}
          </div>
        )}

        {price !== undefined && (
          <div className="price-row">
            <span className="price">{ethers.formatEther(price)} ETH</span>
          </div>
        )}

        {footer}
      </div>
    </div>
  );
}
