import { EncryptedObject, SealClient, SessionKey } from '@mysten/seal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { WalrusFile, walrus } from '@mysten/walrus';
import { publicConfig } from './config';

const WALRUS_WASM_URL = '/walrus/walrus_wasm_bg.wasm';

export const WALRUS_STORAGE_EPOCHS = 1;

type WeightedSealKeyServer = {
  objectId: string;
  weight: number;
};

export type ConversationForStorage = {
  title?: string;
  url?: string;
  platform: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp?: number;
  }>;
};

export function conversationToMarkdown(conversation: ConversationForStorage): string {
  let markdown = '';

  if (conversation.title) {
    markdown += `# ${conversation.title}\n\n`;
  }

  markdown += `> **Platform**: ${conversation.platform}\n`;
  markdown += `> **URL**: ${conversation.url || ''}\n`;
  markdown += `> **Exported**: ${new Date().toISOString()}\n\n`;
  markdown += `---\n\n`;

  for (const message of conversation.messages) {
    const role = message.role === 'user' ? 'User' : 'Assistant';
    markdown += `## ${role}\n\n`;
    markdown += `${message.content}\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

function normalizeHex(value: string): string {
  return value.startsWith('0x') ? value.slice(2).toLowerCase() : value.toLowerCase();
}

function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!cleanHex || cleanHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(cleanHex)) {
    throw new Error('Conversation hash must be a valid even-length hex string.');
  }

  const bytes: number[] = [];

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }

  return bytes;
}

function isSealDecryptionError(error: unknown): boolean {
  return error instanceof Error &&
    (error.constructor.name === 'DecryptionError' || error.message === 'Decryption failed');
}

function parseEncryptedObjectMetadata(encryptedBytes: Uint8Array) {
  try {
    return EncryptedObject.parse(encryptedBytes);
  } catch {
    throw new Error('Walrus file is not a valid Seal encrypted file. Please re-record this conversation with the latest version.');
  }
}

function getSealKeyServers(): WeightedSealKeyServer[] {
  return publicConfig.sealKeyServers.map((objectId) => ({ objectId, weight: 1 }));
}

function getSealThreshold(keyServers: WeightedSealKeyServer[]): number {
  if (!Number.isInteger(publicConfig.sealThreshold) || publicConfig.sealThreshold < 1 || publicConfig.sealThreshold > keyServers.length) {
    throw new Error(`Seal threshold is invalid: ${publicConfig.sealThreshold}. It must be between 1 and ${keyServers.length}.`);
  }

  return publicConfig.sealThreshold;
}

export function createStorageClient() {
  return new SuiGrpcClient({
    network: publicConfig.suiNetwork,
    baseUrl: 'https://fullnode.testnet.sui.io:443',
  }).$extend(
    walrus({
      wasmUrl: WALRUS_WASM_URL,
      uploadRelay: {
        host: publicConfig.walrusUploadRelayUrl,
        sendTip: { max: 1_000 },
      },
    }),
  );
}

function createSealClient() {
  const keyServers = getSealKeyServers();
  if (!publicConfig.sealPackageId || keyServers.length === 0) {
    throw new Error('Seal is not configured. Please check your environment variables.');
  }

  return new SealClient({
    suiClient: createStorageClient(),
    serverConfigs: keyServers,
  });
}

export async function encryptMarkdown(markdown: string, encryptionId: string): Promise<Uint8Array> {
  const keyServers = getSealKeyServers();
  const sealClient = createSealClient();
  const encoded = new TextEncoder().encode(markdown);
  const { encryptedObject } = await sealClient.encrypt({
    threshold: getSealThreshold(keyServers),
    packageId: publicConfig.sealNamespacePackageId,
    id: encryptionId,
    data: encoded,
  });

  return encryptedObject;
}

export function createEncryptedMarkdownFile(encryptedMarkdown: Uint8Array, identifier: string) {
  return WalrusFile.from({
    contents: encryptedMarkdown,
    identifier,
    tags: {
      'content-type': 'application/octet-stream',
      'sui-seal-encrypted': 'true',
    },
  });
}

export async function createSealSessionKey(address: string, ttlMin = 10): Promise<SessionKey> {
  if (!publicConfig.sealNamespacePackageId) {
    throw new Error('Seal namespace package is not configured.');
  }

  return SessionKey.create({
    address,
    packageId: publicConfig.sealNamespacePackageId,
    ttlMin,
    suiClient: createStorageClient(),
  });
}

export async function downloadStoredFile(fileId: string): Promise<Uint8Array> {
  const [file] = await createStorageClient().walrus.getFiles({ ids: [fileId] });
  if (!file) {
    throw new Error('Walrus file does not exist or cannot be read.');
  }

  return file.bytes();
}

export async function decryptMarkdown({
  encryptedBytes,
  conversationHash,
  witnessObjectId,
  sessionKey,
  sender,
}: {
  encryptedBytes: Uint8Array;
  conversationHash: string;
  witnessObjectId: string;
  sessionKey: SessionKey;
  sender: string;
}): Promise<string> {
  if (!publicConfig.sealNamespacePackageId) {
    throw new Error('Seal namespace package is not configured.');
  }

  const conversationHashBytes = hexToBytes(conversationHash);
  const encryptedObject = parseEncryptedObjectMetadata(encryptedBytes);

  if (encryptedObject.threshold < 1) {
    throw new Error('Seal threshold in Walrus file is 0, cannot decrypt. Please re-record this conversation.');
  }
  if (normalizeHex(encryptedObject.packageId) !== normalizeHex(publicConfig.sealNamespacePackageId)) {
    throw new Error('Seal namespace in Walrus file does not match current configuration. Please re-record this conversation with the latest version.');
  }
  if (normalizeHex(encryptedObject.id) !== normalizeHex(conversationHash)) {
    throw new Error('Seal encryption ID in Walrus file does not match the conversation hash. Please re-record this conversation with the latest version.');
  }

  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: `${publicConfig.sealNamespacePackageId}::witness::seal_approve`,
    arguments: [
      tx.pure.vector('u8', conversationHashBytes),
      tx.object(witnessObjectId),
    ],
  });

  console.info('Seal decrypt diagnostics', {
    encryptedPackageId: encryptedObject.packageId,
    configuredSealPackageId: publicConfig.sealPackageId,
    configuredNamespacePackageId: publicConfig.sealNamespacePackageId,
    encryptedId: encryptedObject.id,
    conversationHash,
    threshold: encryptedObject.threshold,
    keyServerObjectIds: getSealKeyServers().map((server) => server.objectId),
    witnessObjectId,
    sender,
    encryptedBytesLength: encryptedBytes.length,
  });

  const txBytes = await tx.build({ client: createStorageClient(), onlyTransactionKind: true });

  try {
    const decrypted = await createSealClient().decrypt({
      data: encryptedBytes,
      sessionKey,
      txBytes,
      checkShareConsistency: true,
    });

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Seal decrypt raw error', {
      name: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
    });

    if (isSealDecryptionError(error)) {
      throw new Error('Seal decryption verification failed. This usually means the record was generated with an older package/Walrus blob ID/encryption parameters. Please re-record this conversation with the latest version.');
    }
    throw error;
  }
}

export function downloadMarkdownFile(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function safeMarkdownFilename(value?: string): string {
  const filename = (value || 'conversation').trim().replace(/[\\/:*?"<>|]/g, '-');
  return filename || 'conversation';
}
