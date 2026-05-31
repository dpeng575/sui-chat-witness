import { useMemo, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { createEncryptedMarkdownFile, createSealSessionKey, createStorageClient, conversationToMarkdown, decryptMarkdown, downloadMarkdownFile, downloadStoredFile, encryptMarkdown, safeMarkdownFilename, WALRUS_STORAGE_EPOCHS } from './storage';

const PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID;
const CLIENT_VERSION = '0.1.0';

type WitnessSignerPayload = {
  mode?: 'witness';
  extensionId: string;
  requestId: string;
  witnessRecordId: string;
  conversationHash: string;
  walrusBlobId: string;
  platform: string;
  conversationTitle?: string;
  conversationUrl?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
  }>;
  messageCount: number;
};

type DecryptSignerPayload = {
  mode: 'decrypt';
  conversationHash: string;
  walrusBlobId: string;
  suiObjectId: string;
  conversationTitle?: string;
  platform?: string;
};

type SignerPayload = WitnessSignerPayload | DecryptSignerPayload;

type WitnessTransactionResult = {
  digest: string;
  witnessObjectId?: string;
};

type StorageFlow = ReturnType<ReturnType<typeof createStorageClient>['walrus']['writeFilesFlow']>;

type StorageState = {
  flow: StorageFlow;
  blobId: string;
  storageStartAt: string;
};

function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }

  return bytes;
}

type TransactionWithCreatedObjects = {
  objectTypes?: Record<string, string>;
  effects?: {
    changedObjects: Array<{
      objectId: string;
      idOperation: string;
    }>;
  };
};

function findWitnessObjectId(result: unknown) {
  const transaction = (result as { Transaction?: TransactionWithCreatedObjects; FailedTransaction?: TransactionWithCreatedObjects }).Transaction
    ?? (result as { FailedTransaction?: TransactionWithCreatedObjects }).FailedTransaction;
  const objectTypes = transaction?.objectTypes || {};
  return transaction?.effects?.changedObjects.find((object) => {
    return object.idOperation === 'Created' && objectTypes[object.objectId] === `${PACKAGE_ID}::witness::WitnessRecord`;
  })?.objectId;
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

function isDecryptPayload(payload: SignerPayload): payload is DecryptSignerPayload {
  return payload.mode === 'decrypt';
}

function isWitnessPayload(payload: SignerPayload): payload is WitnessSignerPayload {
  return payload.mode !== 'decrypt';
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
  const signAndExecuteTransaction = useSignAndExecuteTransaction<WitnessTransactionResult>({
    execute: async ({ bytes, signature }) => {
      const client = createStorageClient();
      const executed = await client.executeTransaction({
        transaction: fromBase64(bytes),
        signatures: [signature],
      });
      const transaction = executed.$kind === 'Transaction' ? executed.Transaction : executed.FailedTransaction;
      const digest = transaction.digest;
      const result = await client.waitForTransaction({
        digest,
        include: { effects: true, objectTypes: true },
      });

      return {
        digest,
        witnessObjectId: findWitnessObjectId(result),
      };
    },
  });
  const signPersonalMessage = useSignPersonalMessage();
  const payload = useMemo(parsePayload, []);
  const witnessPayload = payload && isWitnessPayload(payload) ? payload : null;
  const decryptPayload = payload && isDecryptPayload(payload) ? payload : null;
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const [storageState, setStorageState] = useState<StorageState | null>(null);
  const [isPreparingStorage, setIsPreparingStorage] = useState(false);
  const [isRegisteringStorage, setIsRegisteringStorage] = useState(false);
  const [isCertifyingStorage, setIsCertifyingStorage] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  async function prepareEncryptedStorage() {
    if (!payload) {
      setStatus({ type: 'error', text: '签名参数无效，请从插件重新打开此页面' });
      return;
    }

    setIsPreparingStorage(true);
    try {
      setStatus({ type: 'info', text: '正在生成 Markdown 并使用 Seal 加密...' });
      if (!witnessPayload) {
        setStatus({ type: 'error', text: '当前页面不是存证模式，请从插件重新打开' });
        return;
      }

      const markdown = conversationToMarkdown({
        title: witnessPayload.conversationTitle,
        url: witnessPayload.conversationUrl,
        platform: witnessPayload.platform,
        messages: witnessPayload.messages,
      });
      const encryptedMarkdown = await encryptMarkdown(markdown, witnessPayload.conversationHash);
      const file = createEncryptedMarkdownFile(encryptedMarkdown, `${witnessPayload.conversationHash}.md.enc`);
      const client = createStorageClient();
      const flow = client.walrus.writeFilesFlow({ files: [file] });
      const encoded = await flow.encode();

      setStorageState({
        flow,
        blobId: encoded.blobId,
        storageStartAt: new Date().toISOString(),
      });
      setStatus({ type: 'success', text: '已完成加密，请继续注册 Walrus 存储' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '加密准备失败';
      console.error('Storage preparation failed:', error);
      setStatus({ type: 'error', text: message });
    } finally {
      setIsPreparingStorage(false);
    }
  }

  async function registerAndUploadStorage() {
    if (!currentAccount || !storageState) {
      setStatus({ type: 'error', text: '请先连接钱包并完成加密准备' });
      return;
    }

    setIsRegisteringStorage(true);
    try {
      setStatus({ type: 'info', text: '请在钱包中确认 Walrus 存储注册交易...' });
      const registerTx = storageState.flow.register({
        epochs: WALRUS_STORAGE_EPOCHS,
        deletable: true,
        owner: currentAccount.address,
      });
      const result = await signAndExecuteTransaction.mutateAsync({
        transaction: registerTx,
        account: currentAccount,
        chain: 'sui:testnet',
      });
      const txDigest = 'digest' in result ? result.digest : undefined;
      if (!txDigest) {
        throw new Error('Wallet did not return Walrus registration digest');
      }

      setStatus({ type: 'info', text: '正在上传加密文件到 Walrus...' });
      await storageState.flow.upload({ digest: txDigest });
      setStatus({ type: 'success', text: '加密文件已上传，请继续确认 Walrus 认证交易' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Walrus 注册或上传失败';
      console.error('Walrus registration/upload failed:', error);
      setStatus({ type: 'error', text: message });
    } finally {
      setIsRegisteringStorage(false);
    }
  }

  async function decryptAndDownloadMarkdown() {
    if (!decryptPayload) {
      setStatus({ type: 'error', text: '解密参数无效，请从插件重新打开此页面' });
      return;
    }

    if (!currentAccount) {
      setStatus({ type: 'error', text: '请先连接拥有 WitnessRecord 的钱包' });
      return;
    }

    setIsDecrypting(true);
    try {
      setStatus({ type: 'info', text: '正在下载 Walrus 加密文件...' });
      const encryptedBytes = await downloadStoredFile(decryptPayload.walrusBlobId);
      const sessionKey = await createSealSessionKey(currentAccount.address);

      setStatus({ type: 'info', text: '请在钱包中签名 Seal 会话授权消息...' });
      const signature = await signPersonalMessage.mutateAsync({
        message: sessionKey.getPersonalMessage(),
        account: currentAccount,
        chain: 'sui:testnet',
      });
      await sessionKey.setPersonalMessageSignature(signature.signature);

      setStatus({ type: 'info', text: '正在请求 Seal key server 授权并解密 Markdown...' });
      const markdown = await decryptMarkdown({
        encryptedBytes,
        conversationHash: decryptPayload.conversationHash,
        witnessObjectId: decryptPayload.suiObjectId,
        sessionKey,
        sender: currentAccount.address,
      });

      downloadMarkdownFile(markdown, safeMarkdownFilename(decryptPayload.conversationTitle));
      setStatus({ type: 'success', text: '已解密并开始下载 Markdown 文件' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '解密失败';
      console.error('Decrypt failed:', error);
      setStatus({ type: 'error', text: message });
    } finally {
      setIsDecrypting(false);
    }
  }

  async function certifyStorageAndWitness() {
    if (!witnessPayload) {
      setStatus({ type: 'error', text: '签名参数无效，请从插件重新打开此页面' });
      return;
    }

    if (!currentAccount || !storageState) {
      setStatus({ type: 'error', text: '请先连接钱包并完成 Walrus 上传' });
      return;
    }

    setIsCertifyingStorage(true);
    try {
      setStatus({ type: 'info', text: '请在钱包中确认 Walrus 认证交易...' });
      const certifyTx = storageState.flow.certify();
      const certifyResult = await signAndExecuteTransaction.mutateAsync({
        transaction: certifyTx,
        account: currentAccount,
        chain: 'sui:testnet',
      });
      const certifyDigest = 'digest' in certifyResult ? certifyResult.digest : undefined;
      if (!certifyDigest) {
        throw new Error('Wallet did not return Walrus certification digest');
      }

      const files = await storageState.flow.listFiles();
      const walrusBlobId = files[0]?.id || storageState.blobId;

      setStatus({ type: 'info', text: '请在钱包中确认 Sui 存证交易...' });
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::witness::create_witness`,
        arguments: [
          tx.pure.vector('u8', hexToBytes(witnessPayload.conversationHash)),
          tx.pure.string(walrusBlobId),
          tx.pure.string(witnessPayload.platform),
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

      if (!result.witnessObjectId) {
        throw new Error('未能获取链上 WitnessRecord 对象 ID，无法支持后续 Seal 解密');
      }

      await sendResult(witnessPayload.extensionId, {
        type: 'SUI_SEAL_WITNESS_SIGNED',
        requestId: witnessPayload.requestId,
        witnessRecordId: witnessPayload.witnessRecordId,
        digest: txDigest,
        walrusBlobId,
        conversationHash: witnessPayload.conversationHash,
        platform: witnessPayload.platform,
        suiObjectId: result.witnessObjectId,
        walrusStorageStartAt: storageState.storageStartAt,
        walrusStorageEpochs: WALRUS_STORAGE_EPOCHS,
        sealEncrypted: true,
      });

      setDigest(txDigest);
      setStatus({ type: 'success', text: '加密文件已保存到 Walrus，链上存证和插件记录已更新' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '签名失败';
      console.error('Witness signing failed:', error);
      setStatus({ type: 'error', text: message });

      if (witnessPayload) {
        sendResult(witnessPayload.extensionId, {
          type: 'SUI_SEAL_WITNESS_FAILED',
          requestId: witnessPayload.requestId,
          error: message,
        }).catch((sendError) => console.warn('Failed to report signing error:', sendError));
      }
    } finally {
      setIsCertifyingStorage(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🦭</div>
          <h1 className="text-2xl font-bold text-gray-800">Sui-Seal 钱包签名</h1>
          <p className="text-sm text-gray-500 mt-2">
            {decryptPayload ? '连接钱包，授权 Seal 解密并还原 Markdown 文件' : '连接钱包，加密对话并保存到 Walrus 后完成 Sui Testnet 存证'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          {!payload ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              未找到签名参数，请回到插件重新打开此页面。
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800 mb-2">
                  {decryptPayload ? '待解密文件' : '待存证内容'}
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  {witnessPayload && (
                    <>
                      <div>平台: {witnessPayload.platform}</div>
                      <div>消息数: {witnessPayload.messageCount}</div>
                      {witnessPayload.conversationTitle && <div>标题: {witnessPayload.conversationTitle}</div>}
                      <div className="font-mono break-all">Hash: {witnessPayload.conversationHash}</div>
                      {storageState && <div className="font-mono break-all">Walrus File: {storageState.blobId}</div>}
                      <div>存储时长: 默认 1 个 Walrus epoch（约 1 个月）</div>
                    </>
                  )}
                  {decryptPayload && (
                    <>
                      {decryptPayload.platform && <div>平台: {decryptPayload.platform}</div>}
                      {decryptPayload.conversationTitle && <div>标题: {decryptPayload.conversationTitle}</div>}
                      <div className="font-mono break-all">Hash: {decryptPayload.conversationHash}</div>
                      <div className="font-mono break-all">Walrus File: {decryptPayload.walrusBlobId}</div>
                      <div className="font-mono break-all">Witness Object: {decryptPayload.suiObjectId}</div>
                    </>
                  )}
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

              {witnessPayload && (
                <>
                  <button
                    onClick={prepareEncryptedStorage}
                    disabled={isPreparingStorage || !!storageState || !!digest}
                    className="w-full py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    {isPreparingStorage ? '加密准备中...' : storageState ? '已完成加密准备' : '1. Seal 加密 Markdown'}
                  </button>

                  <button
                    onClick={registerAndUploadStorage}
                    disabled={!currentAccount || !storageState || isRegisteringStorage || !!digest}
                    className="w-full py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    {isRegisteringStorage ? '注册并上传中...' : '2. 注册并上传 Walrus 存储'}
                  </button>

                  <button
                    onClick={certifyStorageAndWitness}
                    disabled={!currentAccount || !storageState || isCertifyingStorage || !!digest}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {isCertifyingStorage ? '认证并存证中...' : digest ? '已完成' : '3. 认证 Walrus 并链上存证'}
                  </button>
                </>
              )}

              {decryptPayload && (
                <button
                  onClick={decryptAndDownloadMarkdown}
                  disabled={!currentAccount || isDecrypting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isDecrypting ? '解密中...' : '授权解密并下载 Markdown'}
                </button>
              )}
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
