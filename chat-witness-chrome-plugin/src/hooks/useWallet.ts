import { useState, useEffect, useCallback } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const SUI_NETWORK = 'testnet';

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [client, setClient] = useState<SuiClient | null>(null);

  useEffect(() => {
    const suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
    setClient(suiClient);
  }, []);

  // Check wallet on mount
  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const result = await chrome.tabs.sendMessage(tab.id, { action: 'checkWallet' });
        if (result?.connected && result.address) {
          setConnected(true);
          setAddress(result.address);
        }
      } catch {
        // Ignore if content script not ready
      }
    }
  }, []);

  const connectWallet = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'openWalletUI' });
      } catch (e) {
        console.log('Content script not ready, reloading...', e);
        // Try to inject the script programmatically
        chrome.tabs.reload(tab.id);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    setConnected(false);
    setAddress(null);
    // Will handle full disconnect when UI is closed
  }, []);

  const openWalletUIWithTx = useCallback(async (pendingTx: any) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'openWalletUI',
          pendingTx
        });
      } catch (e) {
        console.log('Error sending message to content script, trying to reload...', e);
        alert('请刷新页面后重试！');
        throw e;
      }
    }
  }, []);

  // Listen for messages from content script
  useEffect(() => {
    const listener = (message: any) => {
      if (message.action === 'walletConnected') {
        setConnected(true);
        setAddress(message.address);
      } else if (message.action === 'walletDisconnected') {
        setConnected(false);
        setAddress(null);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // Not needed for this flow but keeping for interface
  const detectWallets = useCallback(() => [], []);
  const signAndExecuteTransactionBlock = useCallback(async () => {
    throw new Error('Use openWalletUIWithTx instead');
  }, []);

  return {
    connected,
    address,
    client,
    wallet: null,
    detectWallets,
    connect: connectWallet,
    disconnect,
    signAndExecuteTransactionBlock,
    openWalletUIWithTx,
  };
}
