import { useState, useEffect, useCallback } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

interface WalletAccount {
  address: string;
  publicKey: string;
}

interface Wallet {
  name: string;
  icon: string;
  connect: () => Promise<WalletAccount[]>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<{ bytes: string; signature: string }>;
  signAndExecuteTransaction: (transaction: Transaction) => Promise<{ digest: string }>;
}

const SUI_NETWORK = 'testnet';

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [client, setClient] = useState<SuiClient | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    const suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
    setClient(suiClient);
  }, []);

  const detectWallets = useCallback((): Wallet[] => {
    if (typeof window === 'undefined') return [];

    const wallets: Wallet[] = [];

    // 检查常见的 Sui 钱包
    if ('suiWallet' in window) {
      wallets.push({
        name: 'Sui Wallet',
        icon: '',
        connect: async () => {
          const res = await (window as any).suiWallet.connect();
          return [{ address: res.address, publicKey: res.publicKey }];
        },
        disconnect: () => (window as any).suiWallet.disconnect(),
        signTransaction: async (tx) => (window as any).suiWallet.signTransactionBlock({ transactionBlock: tx }),
        signAndExecuteTransaction: async (tx) => (window as any).suiWallet.signAndExecuteTransactionBlock({ transactionBlock: tx }),
      });
    }

    if ('suiet' in window) {
      wallets.push({
        name: 'Suiet',
        icon: '',
        connect: async () => {
          const res = await (window as any).suiet.connect();
          return [{ address: res.address, publicKey: res.publicKey }];
        },
        disconnect: () => (window as any).suiet.disconnect(),
        signTransaction: async (tx) => (window as any).suiet.signTransactionBlock({ transactionBlock: tx }),
        signAndExecuteTransaction: async (tx) => (window as any).suiet.signAndExecuteTransactionBlock({ transactionBlock: tx }),
      });
    }

    if ('slush' in window) {
      wallets.push({
        name: 'Slush',
        icon: '',
        connect: async () => {
          const res = await (window as any).slush.connect();
          return [{ address: res.address, publicKey: res.publicKey }];
        },
        disconnect: () => (window as any).slush.disconnect(),
        signTransaction: async (tx) => (window as any).slush.signTransactionBlock({ transactionBlock: tx }),
        signAndExecuteTransaction: async (tx) => (window as any).slush.signAndExecuteTransactionBlock({ transactionBlock: tx }),
      });
    }

    // 检查 wallet-standard
    if ('navigator' in window && 'wallets' in (navigator as any)) {
      const standardWallets = (navigator as any).wallets.get();
      for (const w of standardWallets) {
        if (w.features.includes('sui:signTransaction')) {
          wallets.push({
            name: w.name,
            icon: w.icon,
            connect: async () => {
              const accounts = await w.connect();
              return accounts.map((a: any) => ({ address: a.address, publicKey: a.publicKey }));
            },
            disconnect: async () => w.disconnect(),
            signTransaction: async (tx) => w.features['sui:signTransaction'].signTransaction({ transaction: tx }),
            signAndExecuteTransaction: async (tx) => w.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({ transaction: tx }),
          });
        }
      }
    }

    return wallets;
  }, []);

  const connect = useCallback(async (walletToConnect: Wallet) => {
    try {
      const accounts = await walletToConnect.connect();
      if (accounts.length > 0) {
        setAddress(accounts[0].address);
        setWallet(walletToConnect);
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet) {
      try {
        await wallet.disconnect();
      } catch (error) {
        console.warn('Disconnect error:', error);
      }
    }
    setAddress(null);
    setWallet(null);
    setConnected(false);
  }, [wallet]);

  const signAndExecuteTransaction = useCallback(async (transaction: Transaction) => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    return await wallet.signAndExecuteTransaction(transaction);
  }, [wallet]);

  const signTransaction = useCallback(async (transaction: Transaction) => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    return await wallet.signTransaction(transaction);
  }, [wallet]);

  return {
    connected,
    address,
    client,
    wallet,
    detectWallets,
    connect,
    disconnect,
    signAndExecuteTransaction,
    signTransaction,
  };
}
