import React from "react";
import { EXPECTED_CHAIN_NAME } from "../utils/contracts";

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletBar({ wallet }) {
  const { account, hasMetaMask, connect, disconnect, wrongNetwork, switchToExpectedChain, error } = wallet;

  return (
    <div className="wallet-bar">
      <div className="brand">
        <span className="brand-icon">🃏</span>
        <span className="brand-name">Rift Runners</span>
      </div>

      <div className="wallet-controls">
        {wrongNetwork && (
          <button className="btn btn-warning" onClick={switchToExpectedChain}>
            Switch to {EXPECTED_CHAIN_NAME}
          </button>
        )}

        {!hasMetaMask && <span className="hint">Install MetaMask to get started</span>}

        {hasMetaMask && !account && (
          <button className="btn btn-primary" onClick={connect}>
            Connect Wallet
          </button>
        )}

        {account && (
          <div className="account-pill" onClick={disconnect} title="Click to disconnect">
            <span className="dot" />
            {shortAddress(account)}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
