import { useMemo, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x850accfb3a6c30cc9f4aab8b3fa32e95c588a79e52362f63d81abc46aae6a949';
const CLIENT_VERSION = '0.1.0';

type SignerPayload = {
  extensionId: string;
  requestId: string;
  witnessRecordId: string;
  conversationHash: string;
  walrusBlobId: string;
  platform: string;
  conversationTitle?: string;
  conversationUrl?: string;
  messageCount: number;
};

function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }

  return bytes;
}

function parsePayload(): SignerPayload | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;

  try {
    return JSON.parse(decodeURIComponent(hash)) as SignerPayload;
  } catch (error) {
    console.error('Failed to parse signer payload:', error);
    return null;
  }
}

function sendResult(extensionId: string, message: Record<string, unknown>) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error('Chrome runtime messaging is unavailable'));
      return;
    }

    chrome.runtime.sendMessage(extensionId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

export default function SignerApp() {
  const currentAccount = useCurrentAccount();
  const signAndExecuteTransaction = useSignAndExecuteTransaction();
  const payload = useMemo(parsePayload, []);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [digest, setDigest] = useState<string | null>(null);

  async function signWitness() {
    if (!payload) {
      setStatus({ type: 'error', text: '签名参数无效，请从插件重新打开此页面' });
      return;
    }

    if (!currentAccount) {
      setStatus({ type: 'error', text: '请先连接钱包' });
      return;
    }

    try {
      setStatus({ type: 'info', text: '请在钱包中确认交易...' });

      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::witness::create_witness`,
        arguments: [
          tx.pure.vector('u8', hexToBytes(payload.conversationHash)),
          tx.pure.string(payload.walrusBlobId),
          tx.pure.string(payload.platform),
          tx.pure.string(CLIENT_VERSION),
        ],
      });

      const result = await signAndExecuteTransaction.mutateAsync({
        transaction: tx,
        account: currentAccount,
        chain: 'sui:testnet',
      });

      const txDigest = 'digest' in result ? result.digest : undefined;
      if (!txDigest) {
        throw new Error('Wallet did not return transaction digest');
      }

      await sendResult(payload.extensionId, {
        type: 'SUI_SEAL_WITNESS_SIGNED',
        requestId: payload.requestId,
        witnessRecordId: payload.witnessRecordId,
        digest: txDigest,
        walrusBlobId: payload.walrusBlobId,
        conversationHash: payload.conversationHash,
        platform: payload.platform,
      });

      setDigest(txDigest);
      setStatus({ type: 'success', text: '交易已签名并发送，插件记录已更新' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '签名失败';
      console.error('Witness signing failed:', error);
      setStatus({ type: 'error', text: message });

      if (payload) {
        sendResult(payload.extensionId, {
          type: 'SUI_SEAL_WITNESS_FAILED',
          requestId: payload.requestId,
          error: message,
        }).catch((sendError) => console.warn('Failed to report signing error:', sendError));
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🦭</div>
          <h1 className="text-2xl font-bold text-gray-800">Sui-Seal 钱包签名</h1>
          <p className="text-sm text-gray-500 mt-2">连接钱包，将已提取的对话存证到 Sui Testnet</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          {!payload ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              未找到签名参数，请回到插件重新点击“存证到 Sui 链”。
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800 mb-2">待存证内容</div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>平台: {payload.platform}</div>
                  <div>消息数: {payload.messageCount}</div>
                  {payload.conversationTitle && <div>标题: {payload.conversationTitle}</div>}
                  <div className="font-mono break-all">Hash: {payload.conversationHash}</div>
                  <div className="font-mono break-all">Walrus: {payload.walrusBlobId}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">钱包</div>
                <ConnectButton
                  connectText="连接钱包"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                />
                {currentAccount && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-green-700">已连接钱包</div>
                    <div className="text-xs text-green-600 font-mono truncate mt-1" title={currentAccount.address}>
                      {currentAccount.address}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={signWitness}
                disabled={!currentAccount || signAndExecuteTransaction.isPending || !!digest}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {signAndExecuteTransaction.isPending ? '签名中...' : digest ? '已完成' : '签名并发送交易'}
              </button>
            </>
          )}

          {status && (
            <div className={`rounded-lg p-3 text-sm ${
              status.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : status.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {status.text}
            </div>
          )}

          {digest && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs">
              <div className="font-medium text-gray-600 mb-1">交易 Digest</div>
              <a
                href={`https://suiscan.xyz/testnet/tx/${digest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-600 underline break-all"
              >
                {digest}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
