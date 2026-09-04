import React, { useState } from "react";
import { useWallet } from "./utils/useWallet";
import WalletBar from "./components/WalletBar";
import Marketplace from "./components/Marketplace";
import MintForm from "./components/MintForm";
import MyCards from "./components/MyCards";
import { GAMECARD_ADDRESS, MARKETPLACE_ADDRESS } from "./utils/contracts";
import "./styles.css";

const TABS = [
  { id: "marketplace", label: "Marketplace" },
  { id: "mint", label: "Mint a Card" },
  { id: "mine", label: "My Cards" },
];

export default function App() {
  const wallet = useWallet();
  const [tab, setTab] = useState("marketplace");
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const contractsConfigured = Boolean(GAMECARD_ADDRESS && MARKETPLACE_ADDRESS);

  return (
    <div className="app">
      <WalletBar wallet={wallet} />

      {!contractsConfigured && (
        <div className="error-banner container">
          Contract addresses are not configured. Deploy the contracts and set
          <code> VITE_GAMECARD_ADDRESS</code> / <code>VITE_MARKETPLACE_ADDRESS</code> in{" "}
          <code>frontend/.env</code>.
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="container">
        {tab === "marketplace" && (
          <Marketplace wallet={wallet} refreshKey={refreshKey} bumpRefresh={bumpRefresh} />
        )}
        {tab === "mint" && <MintForm wallet={wallet} bumpRefresh={bumpRefresh} />}
        {tab === "mine" && <MyCards wallet={wallet} refreshKey={refreshKey} bumpRefresh={bumpRefresh} />}
      </main>

      <footer className="footer">
        Rift Runners — a decentralized card marketplace demo. Cards &amp; metadata stored on IPFS.
      </footer>
    </div>
  );
}
