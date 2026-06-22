import { useMemo, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { createEncryptedMarkdownFile, createSealSessionKey, createStorageClient, conversationToMarkdown, decryptMarkdown, downloadMarkdownFile, downloadStoredFile, encryptMarkdown, safeMarkdownFilename, WALRUS_STORAGE_EPOCHS } from './storage';
import logoUrl from '../assets/Chat-Witness-logo.png';

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
  const [isWitnessing, setIsWitnessing] = useState(false);
  const [witnessButtonText, setWitnessButtonText] = useState('Encrypt and witness');
  const [isDecrypting, setIsDecrypting] = useState(false);

  async function completeWitnessFlow() {
    if (!payload) {
      setStatus({ type: 'error', text: 'Invalid signing parameters. Please reopen this page from the extension.' });
      return;
    }

    if (!witnessPayload) {
      setStatus({ type: 'error', text: 'This page is not in witness mode. Please reopen it from the extension.' });
      return;
    }

    if (!currentAccount) {
      setStatus({ type: 'error', text: 'Connect your wallet first' });
      return;
    }

    setDigest(null);
    setIsWitnessing(true);

    try {
      setWitnessButtonText('Seal encryption in progress...');
      setStatus({ type: 'info', text: 'Seal encryption in progress...' });
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
      const storageStartAt = new Date().toISOString();

      setWitnessButtonText('Confirm the Walrus storage registration transaction...');
      setStatus({ type: 'info', text: 'Confirm the Walrus storage registration transaction...' });
      const registerTx = flow.register({
        epochs: WALRUS_STORAGE_EPOCHS,
        deletable: true,
        owner: currentAccount.address,
      });
      const registerResult = await signAndExecuteTransaction.mutateAsync({
        transaction: registerTx,
        account: currentAccount,
        chain: 'sui:testnet',
      });
      const registerDigest = 'digest' in registerResult ? registerResult.digest : undefined;
      if (!registerDigest) {
        throw new Error('Wallet did not return Walrus registration digest');
      }

      setWitnessButtonText('Uploading to Walrus...');
      setStatus({ type: 'info', text: 'Uploading to Walrus...' });
      await flow.upload({ digest: registerDigest });

      setWitnessButtonText('Confirm the Walrus certification transaction...');
      setStatus({ type: 'info', text: 'Confirm the Walrus certification transaction...' });
      const certifyTx = flow.certify();
      const certifyResult = await signAndExecuteTransaction.mutateAsync({
        transaction: certifyTx,
        account: currentAccount,
        chain: 'sui:testnet',
      });
      const certifyDigest = 'digest' in certifyResult ? certifyResult.digest : undefined;
      if (!certifyDigest) {
        throw new Error('Wallet did not return Walrus certification digest');
      }

      const files = await flow.listFiles();
      const walrusBlobId = files[0]?.id || encoded.blobId;

      setWitnessButtonText('Confirm the Sui on-chain witness transaction...');
      setStatus({ type: 'info', text: 'Confirm the Sui on-chain witness transaction...' });
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

      const witnessResult = await signAndExecuteTransaction.mutateAsync({
        transaction: tx,
        account: currentAccount,
        chain: 'sui:testnet',
      });

      const txDigest = 'digest' in witnessResult ? witnessResult.digest : undefined;
      if (!txDigest) {
        throw new Error('Wallet did not return transaction digest');
      }

      if (!witnessResult.witnessObjectId) {
        throw new Error('Could not get the on-chain WitnessRecord object ID, so later Seal decryption is unavailable');
      }

      setWitnessButtonText('Updating extension record...');
      setStatus({ type: 'info', text: 'Updating extension record...' });

      await sendResult(witnessPayload.extensionId, {
        type: 'SUI_SEAL_WITNESS_SIGNED',
        requestId: witnessPayload.requestId,
        witnessRecordId: witnessPayload.witnessRecordId,
        digest: txDigest,
        walrusBlobId,
        conversationHash: witnessPayload.conversationHash,
        platform: witnessPayload.platform,
        suiObjectId: witnessResult.witnessObjectId,
        walrusStorageStartAt: storageStartAt,
        walrusStorageEpochs: WALRUS_STORAGE_EPOCHS,
        sealEncrypted: true,
      });

      setDigest(txDigest);
      setStatus({ type: 'success', text: 'Encrypted file saved to Walrus. On-chain witness and extension record updated.' });
      setWitnessButtonText('Completed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signing failed';
      console.error('Witness flow failed:', error);
      setStatus({ type: 'error', text: message });
      setWitnessButtonText('Encrypt and witness');

      if (witnessPayload) {
        sendResult(witnessPayload.extensionId, {
          type: 'SUI_SEAL_WITNESS_FAILED',
          requestId: witnessPayload.requestId,
          error: message,
        }).catch((sendError) => console.warn('Failed to report signing error:', sendError));
      }
    } finally {
      setIsWitnessing(false);
    }
  }

  async function decryptAndDownloadMarkdown() {
    if (!decryptPayload) {
      setStatus({ type: 'error', text: 'Invalid decrypt parameters. Please reopen this page from the extension.' });
      return;
    }

    if (!currentAccount) {
      setStatus({ type: 'error', text: 'Connect the wallet that owns this WitnessRecord first' });
      return;
    }

    setIsDecrypting(true);
    try {
      setStatus({ type: 'info', text: 'Downloading encrypted Walrus file...' });
      const encryptedBytes = await downloadStoredFile(decryptPayload.walrusBlobId);
      const sessionKey = await createSealSessionKey(currentAccount.address);

      setStatus({ type: 'info', text: 'Sign the Seal session authorization message in your wallet...' });
      const signature = await signPersonalMessage.mutateAsync({
        message: sessionKey.getPersonalMessage(),
        account: currentAccount,
        chain: 'sui:testnet',
      });
      await sessionKey.setPersonalMessageSignature(signature.signature);

      setStatus({ type: 'info', text: 'Requesting Seal key server authorization and decrypting Markdown...' });
      const markdown = await decryptMarkdown({
        encryptedBytes,
        conversationHash: decryptPayload.conversationHash,
        witnessObjectId: decryptPayload.suiObjectId,
        sessionKey,
        sender: currentAccount.address,
      });

      downloadMarkdownFile(markdown, safeMarkdownFilename(decryptPayload.conversationTitle));
      setStatus({ type: 'success', text: 'Markdown decrypted and download started.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Decryption failed';
      console.error('Decrypt failed:', error);
      setStatus({ type: 'error', text: message });
    } finally {
      setIsDecrypting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-[#070711] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(226,61,124,0.34),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.2),transparent_30%),linear-gradient(180deg,#080814_0%,#10101d_52%,#070711_100%)]" />
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_84%)]"
        style={{ backgroundSize: '44px 44px' }}
      />

      <div className="relative w-full max-w-xl">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_0_34px_rgba(226,61,124,0.38)]">
            <img src={logoUrl} alt="chat-witness logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-[0.22em] text-white">chat-witness</div>
            <div className="text-xs font-semibold text-white/52">Wallet signature gateway</div>
          </div>
        </header>

        <section className="mb-5 border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">
            {decryptPayload ? 'Seal decrypt' : 'Sui witness'}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Wallet signature</h1>
          <p className="mt-3 text-sm leading-6 text-white/62">
            {decryptPayload ? 'Connect your wallet, authorize Seal decryption, and restore the Markdown file.' : 'Connect your wallet, encrypt the conversation, store it on Walrus, and complete the Sui Testnet witness.'}
          </p>
        </section>

        <div className="space-y-4 border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur">
          {!payload ? (
            <div className="border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
              No signing parameters found. Please reopen this page from the extension.
            </div>
          ) : (
            <>
              <div className="border border-brand/25 bg-brand/10 p-4">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#ff8fbd]">
                  {decryptPayload ? 'File to decrypt' : 'Content to witness'}
                </div>
                <div className="space-y-2 text-xs leading-5 text-white/68">
                  {witnessPayload && (
                    <>
                      <div><span className="font-bold text-white/82">Platform:</span> {witnessPayload.platform}</div>
                      <div><span className="font-bold text-white/82">Messages:</span> {witnessPayload.messageCount}</div>
                      {witnessPayload.conversationTitle && <div><span className="font-bold text-white/82">Title:</span> {witnessPayload.conversationTitle}</div>}
                      <div className="break-all font-mono"><span className="font-sans font-bold text-white/82">Hash:</span> {witnessPayload.conversationHash}</div>
                      <div><span className="font-bold text-white/82">Storage duration:</span> Default 1 Walrus epoch (about 1 month)</div>
                    </>
                  )}
                  {decryptPayload && (
                    <>
                      {decryptPayload.platform && <div><span className="font-bold text-white/82">Platform:</span> {decryptPayload.platform}</div>}
                      {decryptPayload.conversationTitle && <div><span className="font-bold text-white/82">Title:</span> {decryptPayload.conversationTitle}</div>}
                      <div className="break-all font-mono"><span className="font-sans font-bold text-white/82">Hash:</span> {decryptPayload.conversationHash}</div>
                      <div className="break-all font-mono"><span className="font-sans font-bold text-white/82">Walrus File:</span> {decryptPayload.walrusBlobId}</div>
                      <div className="break-all font-mono"><span className="font-sans font-bold text-white/82">Witness Object:</span> {decryptPayload.suiObjectId}</div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/48">Wallet</div>
                <ConnectButton
                  connectText="Connect wallet"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e23d7c] bg-[#e23d7c] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_62px_rgba(226,61,124,0.56)] ring-2 ring-brand/30 transition hover:-translate-y-0.5 hover:bg-[#f04f8c] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_78px_rgba(226,61,124,0.68)]"
                />
                {currentAccount && (
                  <div className="mt-3 border border-emerald-400/30 bg-emerald-500/10 p-3">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-200">Wallet connected</div>
                    <div className="mt-1 truncate font-mono text-xs text-emerald-100/75" title={currentAccount.address}>
                      {currentAccount.address}
                    </div>
                  </div>
                )}
              </div>

              {witnessPayload && (
                <button
                  onClick={completeWitnessFlow}
                  disabled={!currentAccount || isWitnessing || !!digest}
                  className="w-full rounded-2xl border border-[#e23d7c] bg-[#e23d7c] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_62px_rgba(226,61,124,0.56)] ring-2 ring-brand/30 transition hover:-translate-y-0.5 hover:bg-[#f04f8c] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_78px_rgba(226,61,124,0.68)] disabled:cursor-not-allowed disabled:border-white/10 disabled:rounded-2xl disabled:bg-white/10 disabled:text-white/42 disabled:shadow-none disabled:ring-0 disabled:hover:translate-y-0"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <UploadIcon />
                    <span>{digest ? 'Completed' : witnessButtonText}</span>
                  </span>
                </button>
              )}

              {decryptPayload && (
                <button
                  onClick={decryptAndDownloadMarkdown}
                  disabled={!currentAccount || isDecrypting}
                  className="w-full rounded-2xl border border-[#e23d7c] bg-[#e23d7c] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_20px_62px_rgba(226,61,124,0.56)] ring-2 ring-brand/30 transition hover:-translate-y-0.5 hover:bg-[#f04f8c] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)_inset,0_26px_78px_rgba(226,61,124,0.68)] disabled:cursor-not-allowed disabled:border-white/10 disabled:rounded-2xl disabled:bg-white/10 disabled:text-white/42 disabled:shadow-none disabled:ring-0 disabled:hover:translate-y-0"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <DownloadIcon />
                    <span>{isDecrypting ? 'Decrypting...' : 'Authorize decrypt and download Markdown'}</span>
                  </span>
                </button>
              )}
            </>
          )}

          {status && (
            <div className={`border p-3 text-sm font-bold ${
              status.type === 'error'
                ? 'border-red-400/30 bg-red-500/10 text-red-200'
                : status.type === 'success'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-brand/30 bg-brand/10 text-[#ffb4cf]'
            }`}>
              {status.text}
            </div>
          )}

          {digest && (
            <div className="border border-white/10 bg-[#0b0b18]/70 p-3 text-xs">
              <div className="mb-1 font-black uppercase tracking-[0.14em] text-white/48">Transaction Digest</div>
              <a
                href={`https://suiscan.xyz/testnet/tx/${digest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-mono text-[#ff8fbd] underline transition hover:text-white"
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

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v3h14v-3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 5v11m0 0 4-4m-4 4-4-4M5 19h14" />
    </svg>
  );
}
