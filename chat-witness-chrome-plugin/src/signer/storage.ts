import { EncryptedObject, SealClient, SessionKey } from '@mysten/seal';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { WalrusFile, walrus } from '@mysten/walrus';
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';

export const WALRUS_STORAGE_EPOCHS = 1;

const WALRUS_UPLOAD_RELAY_URL = import.meta.env.VITE_WALRUS_UPLOAD_RELAY_URL || 'https://upload-relay.testnet.walrus.space';
const SEAL_PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID;
const SEAL_NAMESPACE_PACKAGE_ID = import.meta.env.VITE_SEAL_NAMESPACE_PACKAGE_ID || SEAL_PACKAGE_ID;
const SEAL_THRESHOLD = Number(import.meta.env.VITE_SEAL_THRESHOLD || '1');

const SEAL_KEY_SERVERS = String(import.meta.env.VITE_SEAL_KEY_SERVERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .map((objectId) => ({ objectId, weight: 1 }));

function getSealThreshold(): number {
  if (!Number.isInteger(SEAL_THRESHOLD) || SEAL_THRESHOLD < 1 || SEAL_THRESHOLD > SEAL_KEY_SERVERS.length) {
    throw new Error(`Seal threshold 配置无效：${SEAL_THRESHOLD}，需要在 1 到 ${SEAL_KEY_SERVERS.length} 之间。`);
  }

  return SEAL_THRESHOLD;
}

function parseEncryptedObjectMetadata(encryptedBytes: Uint8Array) {
  try {
    return EncryptedObject.parse(encryptedBytes);
  } catch {
    throw new Error('Walrus 文件不是有效的 Seal 加密文件。请确认这条记录是用新版 Seal 加密流程重新存证生成的。');
  }
}

function normalizeHex(value: string): string {
  return value.startsWith('0x') ? value.slice(2).toLowerCase() : value.toLowerCase();
}

function isSealDecryptionError(error: unknown): boolean {
  return error instanceof Error
    && (error.constructor.name === 'DecryptionError' || error.message === 'Decryption failed');
}

export function getSealPackageId(): string {
  if (!SEAL_PACKAGE_ID) {
    throw new Error('Seal is not configured. Set VITE_SEAL_PACKAGE_ID.');
  }

  return SEAL_PACKAGE_ID;
}

export function getSealNamespacePackageId(): string {
  if (!SEAL_NAMESPACE_PACKAGE_ID) {
    throw new Error('Seal is not configured. Set VITE_SEAL_NAMESPACE_PACKAGE_ID.');
  }

  return SEAL_NAMESPACE_PACKAGE_ID;
}

function createSealClient() {
  if (!SEAL_PACKAGE_ID || SEAL_KEY_SERVERS.length === 0) {
    throw new Error('Seal is not configured. Set VITE_SEAL_PACKAGE_ID and VITE_SEAL_KEY_SERVERS.');
  }

  return new SealClient({
    suiClient: createStorageClient(),
    serverConfigs: SEAL_KEY_SERVERS,
  });
}

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

export function createStorageClient() {
  return new SuiGrpcClient({
    network: 'testnet',
    baseUrl: 'https://fullnode.testnet.sui.io:443',
  }).$extend(
    walrus({
      wasmUrl: walrusWasmUrl,
      uploadRelay: {
        host: WALRUS_UPLOAD_RELAY_URL,
        sendTip: { max: 1_000 },
      },
    }),
  );
}

export async function encryptMarkdown(markdown: string, encryptionId: string) {
  const sealClient = createSealClient();
  const encoded = new TextEncoder().encode(markdown);
  const { encryptedObject } = await sealClient.encrypt({
    threshold: getSealThreshold(),
    packageId: getSealNamespacePackageId(),
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
  return SessionKey.create({
    address,
    packageId: getSealNamespacePackageId(),
    ttlMin,
    suiClient: createStorageClient(),
  });
}

export async function downloadStoredFile(fileId: string): Promise<Uint8Array> {
  const [file] = await createStorageClient().walrus.getFiles({ ids: [fileId] });
  if (!file) {
    throw new Error('Walrus 文件不存在或无法读取');
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
  const tx = new Transaction();
  tx.setSender(sender);
  tx.moveCall({
    target: `${getSealNamespacePackageId()}::witness::seal_approve`,
    arguments: [
      tx.pure.vector('u8', hexToBytes(conversationHash)),
      tx.object(witnessObjectId),
    ],
  });

  const encryptedObject = parseEncryptedObjectMetadata(encryptedBytes);
  if (encryptedObject.threshold < 1) {
    throw new Error('Walrus 文件中的 Seal threshold 为 0，无法解密。请重新存证生成新的加密文件。');
  }
  if (encryptedObject.packageId !== getSealNamespacePackageId()) {
    throw new Error('Walrus 文件使用的 Seal namespace 与当前配置不一致。请用当前版本重新存证后再解密。');
  }
  if (normalizeHex(encryptedObject.id) !== normalizeHex(conversationHash)) {
    throw new Error('Walrus 文件中的 Seal 加密 ID 与当前存证 Hash 不一致。请确认记录使用的是 Walrus File ID，并用当前版本重新存证后再解密。');
  }

  const txBytes = await tx.build({ client: createStorageClient(), onlyTransactionKind: true });
  try {
    const decrypted = await createSealClient().decrypt({
      data: encryptedBytes,
      sessionKey,
      txBytes,
    });

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    if (isSealDecryptionError(error)) {
      throw new Error('Seal 解密校验失败。通常是这条记录在旧 package/旧 Walrus Blob ID/旧加密参数下生成，请用当前配置重新存证后再解密。');
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

function hexToBytes(hex: string): number[] {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes: number[] = [];

  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.slice(i, i + 2), 16));
  }

  return bytes;
}
