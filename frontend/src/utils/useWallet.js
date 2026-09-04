import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { EXPECTED_CHAIN_ID, EXPECTED_CHAIN_NAME } from "./contracts";

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);

  const hasMetaMask = typeof window !== "undefined" && Boolean(window.ethereum);

  const refreshSigner = useCallback(async (browserProvider) => {
    const accounts = await browserProvider.listAccounts();
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
      return;
    }
    const s = await browserProvider.getSigner();
    setSigner(s);
    setAccount(await s.getAddress());
    const network = await browserProvider.getNetwork();
    setChainId(Number(network.chainId));
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (!hasMetaMask) {
      setError("No wallet found. Please install MetaMask (or another EVM wallet extension).");
      return;
    }
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      setProvider(browserProvider);
      await refreshSigner(browserProvider);
    } catch (err) {
      setError(err?.message || "Failed to connect wallet");
    }
  }, [hasMetaMask, refreshSigner]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setSigner(null);
  }, []);

  const switchToExpectedChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + EXPECTED_CHAIN_ID.toString(16) }],
      });
    } catch (err) {
      setError(
        `Please switch your wallet to ${EXPECTED_CHAIN_NAME} (chain id ${EXPECTED_CHAIN_ID}). ${err?.message || ""}`
      );
    }
  }, []);

  useEffect(() => {
    if (!hasMetaMask) return;
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    setProvider(browserProvider);
    refreshSigner(browserProvider);

    const handleAccountsChanged = () => refreshSigner(browserProvider);
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [hasMetaMask, refreshSigner]);

  const wrongNetwork = chainId !== null && chainId !== EXPECTED_CHAIN_ID;

  return {
    account,
    provider,
    signer,
    chainId,
    wrongNetwork,
    hasMetaMask,
    error,
    connect,
    disconnect,
    switchToExpectedChain,
  };
}
