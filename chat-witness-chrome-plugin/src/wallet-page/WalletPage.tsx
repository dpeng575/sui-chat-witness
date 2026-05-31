import { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { Transaction } from '@mysten/sui/transactions';
import '../popup/index.css';

interface WalletAccount {
  address: string;
  publicKey?: string;
}

interface Wallet {
  name: string;
  icon?: string;
  connect: () => Promise<WalletAccount[]>;
  disconnect: () => Promise<void>;
  signAndExecuteTransactionBlock: (input: unknown) => Promise<{ digest: string }>;
}

const PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID;
const CLIENT_VERSION = '0.1.0';

// Helper to convert hex string to Uint8Array without Buffer
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function detectWallets(): Promise<Wallet[]> {
  console.log('=== Wallet Detection in Full Page ===');
  console.log('Window location:', window.location.href);
  console.log('navigator.userAgent:', navigator.userAgent);

  if (typeof window === 'undefined') return [];

  const win = window as unknown as Record<string, unknown>;
  const wallets: Wallet[] = [];

  // Log all window properties for debugging
  console.log('All window properties:');
  const windowKeys = Object.getOwnPropertyNames(window).sort();
  for (const key of windowKeys) {
    const lowerKey = key.toLowerCase();
    if (['sui', 'wallet', 'suiet', 'slush', 'martian', 'leap', 'ethereum'].some(kw => lowerKey.includes(kw))) {
      console.log(`  - ${key}`);
    }
  }

  // Check for Wallet Standard first (preferred method)
  console.log('Checking for Wallet Standard...');
  if ('wallets' in navigator) {
    console.log('✅ navigator.wallets exists!');
    try {
      const navWallets = navigator as unknown as {
        wallets: {
          get: () => Array<{
            name: string;
            icon?: string;
            connect: () => Promise<{ address: string; publicKey?: string }[]>;
            disconnect?: () => Promise<void>;
            features: {
              'sui:signAndExecuteTransactionBlock'?: {
                signAndExecuteTransactionBlock: (input: unknown) => Promise<{ digest: string }>;
              };
            };
          }>;
        };
      };
      const standardWallets = navWallets.wallets.get();
      console.log('Standard wallets found:', standardWallets.length);

      for (const w of standardWallets) {
        console.log('  - Standard wallet:', w.name, 'features:', Object.keys(w.features));
        if (w.features?.['sui:signAndExecuteTransactionBlock']) {
          wallets.push({
            name: w.name,
            icon: w.icon,
            connect: async () => {
              const accounts = await w.connect();
              return accounts.map((a: { address: string; publicKey?: string }) => ({ address: a.address, publicKey: a.publicKey }));
            },
            disconnect: w.disconnect || (async () => {}),
            signAndExecuteTransactionBlock: (input: unknown) =>
              w.features['sui:signAndExecuteTransactionBlock']!.signAndExecuteTransactionBlock(input),
          });
        }
      }
    } catch (e) {
      console.error('Error with wallet-standard:', e);
    }
  } else {
    console.log('❌ navigator.wallets not found');
  }

  // Try direct wallet injection (fallback methods)
  console.log('Checking for direct wallet injections...');

  // Slush
  if ('slush' in window) {
    console.log('✅ Found Slush wallet!');
    const slush = win.slush as {
      connect: () => Promise<{ address: string; publicKey?: string } | { address: string; publicKey?: string }[]>;
      disconnect?: () => Promise<void>;
      signAndExecuteTransactionBlock: (input: unknown) => Promise<{ digest: string }>;
    };
    wallets.push({
      name: 'Slush',
      icon: '',
      connect: async () => {
        const res = await slush.connect();
        if ('address' in res) return [{ address: res.address, publicKey: res.publicKey }];
        if (Array.isArray(res) && res.length > 0) {
          return res.map((a: { address: string; publicKey?: string }) => ({ address: a.address, publicKey: a.publicKey }));
        }
        throw new Error('Unexpected response format from Slush');
      },
      disconnect: slush.disconnect || (async () => {}),
      signAndExecuteTransactionBlock: (input: unknown) => slush.signAndExecuteTransactionBlock(input),
    });
  }

  // Suiet
  if ('suiet' in window) {
    console.log('✅ Found Suiet wallet!');
    const suiet = win.suiet as {
      connect: () => Promise<{ address: string; publicKey?: string } | { address: string; publicKey?: string }[]>;
      disconnect?: () => Promise<void>;
      signAndExecuteTransactionBlock: (input: unknown) => Promise<{ digest: string }>;
    };
    wallets.push({
      name: 'Suiet',
      icon: '',
      connect: async () => {
        const res = await suiet.connect();
        if ('address' in res) return [{ address: res.address, publicKey: res.publicKey }];
        if (Array.isArray(res) && res.length > 0) {
          return res.map((a: { address: string; publicKey?: string }) => ({ address: a.address, publicKey: a.publicKey }));
        }
        throw new Error('Unexpected response format from Suiet');
      },
      disconnect: suiet.disconnect || (async () => {}),
      signAndExecuteTransactionBlock: (input: unknown) => suiet.signAndExecuteTransactionBlock(input),
    });
  }

  // Sui Wallet
  if ('suiWallet' in window) {
    console.log('✅ Found Sui Wallet!');
    const suiWallet = win.suiWallet as {
      connect: () => Promise<{ address: string; publicKey?: string } | { address: string; publicKey?: string }[]>;
      disconnect?: () => Promise<void>;
      signAndExecuteTransactionBlock: (input: unknown) => Promise<{ digest: string }>;
    };
    wallets.push({
      name: 'Sui Wallet',
      icon: '',
      connect: async () => {
        const res = await suiWallet.connect();
        if ('address' in res) return [{ address: res.address, publicKey: res.publicKey }];
        if (Array.isArray(res) && res.length > 0) {
          return res.map((a: { address: string; publicKey?: string }) => ({ address: a.address, publicKey: a.publicKey }));
        }
        throw new Error('Unexpected response format from Sui Wallet');
      },
      disconnect: suiWallet.disconnect || (async () => {}),
      signAndExecuteTransactionBlock: (input: unknown) => suiWallet.signAndExecuteTransactionBlock(input),
    });
  }

  // Try some other common wallet names
  const walletNames = ['martian', 'leap', 'sui', 'suiWallet', 'suiet', 'slush'];
  for (const name of walletNames) {
    if (name in window && !wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) {
      console.log(`✅ Found ${name} wallet!`);
      const walletObj = win[name] as {
        connect: () => Promise<{ address: string; publicKey?: string } | { address: string; publicKey?: string }[]>;
        disconnect?: () => Promise<void>;
        signAndExecuteTransactionBlock?: (input: unknown) => Promise<{ digest: string }>;
        signAndExecute?: (input: unknown) => Promise<{ digest: string }>;
      };
      if (walletObj.connect) {
        wallets.push({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          icon: '',
          connect: async () => {
            const res = await walletObj.connect();
            if ('address' in res) return [{ address: res.address, publicKey: res.publicKey }];
            if (Array.isArray(res) && res.length > 0) {
              return res.map((a: { address: string; publicKey?: string }) => ({ address: a.address, publicKey: a.publicKey }));
            }
            throw new Error(`Unexpected response format from ${name}`);
          },
          disconnect: walletObj.disconnect || (async () => {}),
          signAndExecuteTransactionBlock: (input: unknown) => {
            if (walletObj.signAndExecuteTransactionBlock) {
              return walletObj.signAndExecuteTransactionBlock(input);
            }
            if (walletObj.signAndExecute) {
              return walletObj.signAndExecute(input);
            }
            throw new Error('No sign method found');
          },
        });
      }
    }
  }

  console.log('=== Total wallets detected:', wallets.length, '===');
  return wallets;
}

// 交易请求的类型
interface PendingTransaction {
  id: string;
  conversationHash: string;
  walrusBlobId: string;
  platform: string;
  messages: unknown[];
  conversationTitle?: string;
  conversationUrl?: string;
}

function WalletPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [status, setStatus] = useState<string>('检测钱包中...');
  const [error, setError] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [transactionResult, setTransactionResult] = useState<{ digest: string; success: boolean } | null>(null);
  const [detectionAttempts, setDetectionAttempts] = useState(0);

  const tryDetectWallets = useCallback(async () => {
    console.log(`Wallet detection attempt ${detectionAttempts + 1}...`);
    const detected = await detectWallets();
    setWallets(detected);
    if (detected.length === 0) {
      setStatus('未检测到钱包，请安装 Slush、Sui Wallet 或 Suiet');
    } else {
      setStatus(`检测到 ${detected.length} 个钱包`);
    }
    setDetectionAttempts(prev => prev + 1);
  }, [detectionAttempts]);

  useEffect(() => {
    // Try initial detection after a delay
    const timer = setTimeout(() => {
      tryDetectWallets();
    }, 800);

    // Also try again at intervals
    const interval = setInterval(() => {
      if (wallets.length === 0 && detectionAttempts < 5) {
        tryDetectWallets();
      }
    }, 2000);

    // Listen for wallet-standard events
    const handleWalletReady = (e: Event) => {
      console.log('Wallet standard ready event:', e);
      tryDetectWallets();
    };
    window.addEventListener('wallet-standard:ready', handleWalletReady);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('wallet-standard:ready', handleWalletReady);
    };
  }, [tryDetectWallets, wallets.length, detectionAttempts]);

  // 检查是否有待处理的交易
  useEffect(() => {
    const checkPendingTransaction = async () => {
      const result = await chrome.storage.local.get(['pendingTransaction']);
      if (result.pendingTransaction) {
        setPendingTransaction(result.pendingTransaction as PendingTransaction);
        console.log('Found pending transaction:', result.pendingTransaction);
      }
    };

    checkPendingTransaction();

    // 监听 storage 变化
    const handleStorageChange = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>, areaName: string) => {
      if (areaName === 'local' && changes.pendingTransaction) {
        setPendingTransaction(changes.pendingTransaction.newValue as PendingTransaction | null);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // 检查是否已连接
  useEffect(() => {
    const checkConnection = async () => {
      const result = await chrome.storage.local.get(['walletConnected', 'walletAddress', 'walletName']);
      if (result.walletConnected && result.walletAddress) {
        setConnected(true);
        setAddress(result.walletAddress as string);
        // 尝试找到对应的钱包
        if (wallets.length > 0) {
          const wallet = wallets.find(w => w.name === result.walletName) || wallets[0];
          if (wallet) {
            // 尝试连接以确保钱包功能可用
            try {
              await wallet.connect();
              setSelectedWallet(wallet);
            } catch (e) {
              console.log('Auto-connect failed, user will need to manually connect');
            }
          }
        }
      }
    };

    if (wallets.length > 0) {
      checkConnection();
    }
  }, [wallets]);

  const handleConnect = async (wallet: Wallet) => {
    try {
      setStatus(`正在连接 ${wallet.name}...`);
      setError(null);
      const accounts = await wallet.connect();
      if (accounts.length > 0) {
        const addr = accounts[0].address;
        setAddress(addr);
        setConnected(true);
        setSelectedWallet(wallet);
        setStatus(`已连接: ${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`);

        await chrome.storage.local.set({
          walletConnected: true,
          walletAddress: addr,
          walletName: wallet.name,
        });

        if (window.opener) {
          window.opener.postMessage(
            { type: 'WALLET_CONNECTED', address: addr, walletName: wallet.name },
            '*'
          );
        }
      }
    } catch (e) {
      console.error('Failed to connect wallet:', e);
      setError(e instanceof Error ? e.message : '连接失败');
      setStatus('连接失败');
    }
  };

  const handleDisconnect = async () => {
    await chrome.storage.local.remove(['walletConnected', 'walletAddress', 'walletName']);
    setConnected(false);
    setAddress(null);
    setSelectedWallet(null);
    setStatus('已断开连接');

    if (window.opener) {
      window.opener.postMessage({ type: 'WALLET_DISCONNECTED' }, '*');
    }
  };

  const handleSignAndExecute = useCallback(async () => {
    if (!pendingTransaction || !selectedWallet || !address) return;

    try {
      setIsSigning(true);
      setError(null);
      setStatus('正在构建交易...');

      const txb = new Transaction();
      txb.setSender(address);

      // 调用合约函数
      (txb as unknown as { moveCall: (args: unknown) => void }).moveCall({
        target: `${PACKAGE_ID}::witness::create_witness`,
        arguments: [
          hexToUint8Array(pendingTransaction.conversationHash),
          pendingTransaction.walrusBlobId,
          pendingTransaction.platform,
          CLIENT_VERSION,
        ],
      });

      setStatus('请在钱包中确认交易...');
      console.log('Signing transaction with wallet:', selectedWallet.name);

      const result = await selectedWallet.signAndExecuteTransactionBlock({
        transactionBlock: txb,
      });

      console.log('Transaction result:', result);

      setTransactionResult({ digest: result.digest, success: true });
      setStatus(`交易成功！Digest: ${result.digest.substring(0, 16)}...`);

      // 保存结果并清理 pending transaction
      await chrome.storage.local.set({
        lastTransactionResult: {
          digest: result.digest,
          success: true,
          walrusBlobId: pendingTransaction.walrusBlobId,
          conversationHash: pendingTransaction.conversationHash,
          timestamp: Date.now(),
        },
      });
      await chrome.storage.local.remove(['pendingTransaction']);
      setPendingTransaction(null);

      // 通知 popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'TRANSACTION_COMPLETE',
          digest: result.digest,
          success: true,
          walrusBlobId: pendingTransaction.walrusBlobId,
          conversationHash: pendingTransaction.conversationHash,
        }, '*');
      }

    } catch (e) {
      console.error('Transaction failed:', e);
      setError(e instanceof Error ? e.message : '交易失败');
      setStatus('交易失败');
      setTransactionResult({ digest: '', success: false });

      if (window.opener) {
        window.opener.postMessage({
          type: 'TRANSACTION_COMPLETE',
          success: false,
          error: e instanceof Error ? e.message : '交易失败',
        }, '*');
      }
    } finally {
      setIsSigning(false);
    }
  }, [pendingTransaction, selectedWallet, address]);

  const handleCancelTransaction = async () => {
    await chrome.storage.local.remove(['pendingTransaction']);
    setPendingTransaction(null);
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🦭</div>
          <h1 className="text-2xl font-bold text-gray-800">Sui-Seal 钱包连接</h1>
          <p className="text-gray-600 mt-2">在此页面连接钱包并存证对话</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-sm text-gray-600 mb-4">
            状态: <span className="font-medium text-gray-800">{status}</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {transactionResult && (
            <div className={`rounded-lg p-4 mb-4 ${transactionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className={`font-medium ${transactionResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {transactionResult.success ? '✅ 交易成功！' : '❌ 交易失败'}
              </div>
              {transactionResult.success && transactionResult.digest && (
                <div className="mt-2 text-xs font-mono text-green-700 break-all">
                  {transactionResult.digest}
                </div>
              )}
            </div>
          )}

          {/* 待处理的交易 */}
          {pendingTransaction && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-blue-800 font-medium mb-2">📝 待处理的存证请求</div>
              <div className="text-sm text-blue-700 space-y-1">
                <div>平台: {pendingTransaction.platform}</div>
                <div>消息数: {pendingTransaction.messages.length}</div>
                {pendingTransaction.conversationTitle && (
                  <div>标题: {pendingTransaction.conversationTitle}</div>
                )}
                <div className="text-xs font-mono mt-2">
                  Walrus Blob: {pendingTransaction.walrusBlobId.substring(0, 20)}...
                </div>
              </div>
              {connected && selectedWallet ? (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleSignAndExecute}
                    disabled={isSigning}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isSigning ? '交易处理中...' : '签名并发送交易'}
                  </button>
                  <button
                    onClick={handleCancelTransaction}
                    disabled={isSigning}
                    className="py-2 px-4 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-sm text-blue-600">
                  请先连接钱包后再执行交易
                </div>
              )}
            </div>
          )}

          {!connected ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-2">选择钱包:</div>
              {wallets.length > 0 ? (
                wallets.map((wallet, index) => (
                  <button
                    key={index}
                    onClick={() => handleConnect(wallet)}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {wallet.icon && <img src={wallet.icon} alt="" className="w-5 h-5" />}
                    连接 {wallet.name}
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <div className="text-4xl mb-3">👛</div>
                  <p>未检测到钱包</p>
                  <p className="text-sm mt-1">请安装:</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <a href="https://slush.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">Slush Wallet</a>
                    <a href="https://suiet.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">Suiet Wallet</a>
                    <a href="https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">Sui Wallet</a>
                  </div>
                  <button
                    onClick={tryDetectWallets}
                    className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
                  >
                    重新检测钱包
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-green-800 font-medium">✅ 已连接 {selectedWallet?.name || '钱包'}</div>
                <div className="text-green-700 text-sm mt-1 font-mono break-all">{address}</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDisconnect}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  断开连接
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  关闭此页面
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          {pendingTransaction
            ? '在此页面完成交易签名后可以返回扩展'
            : '连接成功后可以返回扩展继续操作'}
        </div>

        {/* Debug info */}
        <div className="mt-6">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500">Debug Info</summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-left font-mono overflow-x-auto">
              <div>Detection attempts: {detectionAttempts}</div>
              <div>Wallets found: {wallets.length}</div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<WalletPage />);
}
