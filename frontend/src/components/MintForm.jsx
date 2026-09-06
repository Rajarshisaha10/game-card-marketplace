import React, { useState } from "react";
import { getGameCardContract, RARITIES } from "../utils/contracts";
import { uploadCardToIpfs } from "../utils/ipfs";

const EMPTY_ATTR = { trait_type: "", value: "" };

export default function MintForm({ wallet, bumpRefresh }) {
  const { signer, account, wrongNetwork } = wallet;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rarity, setRarity] = useState("Common");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [attributes, setAttributes] = useState([
    { trait_type: "Attack", value: "" },
    { trait_type: "Defense", value: "" },
  ]);
  const [status, setStatus] = useState(null);
  const [minting, setMinting] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function updateAttribute(index, key, value) {
    setAttributes((prev) => prev.map((a, i) => (i === index ? { ...a, [key]: value } : a)));
  }

  function addAttribute() {
    setAttributes((prev) => [...prev, { ...EMPTY_ATTR }]);
  }

  function removeAttribute(index) {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!account) {
      setStatus({ type: "error", text: "Connect your wallet first." });
      return;
    }
    if (wrongNetwork) {
      setStatus({ type: "error", text: "Please switch to the correct network before minting." });
      return;
    }
    if (!imageFile || !name.trim()) {
      setStatus({ type: "error", text: "An image and a name are required." });
      return;
    }

    setMinting(true);
    setStatus({ type: "info", text: "Uploading card art & metadata to IPFS…" });

    try {
      const cleanAttributes = attributes.filter((a) => a.trait_type && a.value);

      const tokenURI = await uploadCardToIpfs({
        imageFile,
        name,
        description,
        rarity,
        attributes: cleanAttributes,
      });

      setStatus({ type: "info", text: "Metadata pinned to IPFS. Confirm the mint transaction in your wallet…" });

      const gameCard = getGameCardContract(signer);
      const rarityIndex = RARITIES.indexOf(rarity);
      const mintPrice = await gameCard.mintPrice();

      const tx = await gameCard.mintCard(account, tokenURI, rarityIndex, { value: mintPrice });
      const receipt = await tx.wait();

      setStatus({ type: "success", text: `Minted successfully! Tx: ${receipt.hash}` });
      setName("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      setAttributes([
        { trait_type: "Attack", value: "" },
        { trait_type: "Defense", value: "" },
      ]);
      bumpRefresh();
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", text: err?.reason || err?.shortMessage || err?.message || "Minting failed" });
    } finally {
      setMinting(false);
    }
  }

  return (
    <section>
      <h2>Mint a New Card</h2>
      <form className="mint-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Card Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imagePreview && <img className="preview" src={imagePreview} alt="preview" />}
        </div>

        <div className="form-row">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flamewing Drake" />
        </div>

        <div className="form-row">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A juvenile drake wreathed in restless embers..."
          />
        </div>

        <div className="form-row">
          <label>Rarity</label>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>Attributes</label>
          {attributes.map((attr, i) => (
            <div className="attribute-row" key={i}>
              <input
                placeholder="Trait (e.g. Attack)"
                value={attr.trait_type}
                onChange={(e) => updateAttribute(i, "trait_type", e.target.value)}
              />
              <input
                placeholder="Value (e.g. 78)"
                value={attr.value}
                onChange={(e) => updateAttribute(i, "value", e.target.value)}
              />
              <button type="button" className="btn btn-ghost" onClick={() => removeAttribute(i)}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary" onClick={addAttribute}>
            + Add attribute
          </button>
        </div>

        <button className="btn btn-primary btn-large" type="submit" disabled={minting || !account}>
          {minting ? "Minting…" : "Mint Card"}
        </button>

        {status && <div className={`status-banner status-${status.type}`}>{status.text}</div>}
      </form>
    </section>
  );
}
