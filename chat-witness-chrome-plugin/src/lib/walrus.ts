import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '@mysten/walrus';
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';

const WALRUS_UPLOAD_RELAY_URL = import.meta.env.VITE_WALRUS_UPLOAD_RELAY_URL || 'https://upload-relay.testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = import.meta.env.VITE_WALRUS_AGGREGATOR_URL;
const WALRUS_ALLOW_STORAGE_NODE_READS = import.meta.env.VITE_WALRUS_ALLOW_STORAGE_NODE_READS === 'true';

export async function uploadToWalrus(
  data: string,
  _encoding: 'utf8' | 'base64' = 'utf8'
): Promise<string> {
  console.log('Walrus upload (mock):', data.substring(0, 100) + '...');

  const mockBlobId = 'blob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  return mockBlobId;
}

export function createWalrusClient() {
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

async function downloadFromAggregator(blobId: string): Promise<Uint8Array> {
  const response = await fetch(`${WALRUS_AGGREGATOR_URL!.replace(/\/$/, '')}/v1/blobs/${encodeURIComponent(blobId)}`);
  if (!response.ok) {
    throw new Error(`Walrus aggregator download failed: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  if (WALRUS_AGGREGATOR_URL) {
    return downloadFromAggregator(blobId);
  }

  if (!WALRUS_ALLOW_STORAGE_NODE_READS) {
    throw new Error('Walrus aggregator 未配置。请设置 VITE_WALRUS_AGGREGATOR_URL 后再下载原文件。');
  }

  const client = createWalrusClient();
  return client.walrus.readBlob({ blobId });
}

export function downloadWalrusBlob(blobId: string, bytes: Uint8Array): void {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${blobId}.bin`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
