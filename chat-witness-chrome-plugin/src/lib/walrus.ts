
/**
 * Walrus 存储集成 - Mock 版本
 */

/**
 * 上传数据到 Walrus - Mock 版本
 */
export async function uploadToWalrus(
  data: string,
  _encoding: 'utf8' | 'base64' = 'utf8'
): Promise<string> {
  console.log('Walrus upload (mock):', data.substring(0, 100) + '...');

  // 生成一个 mock 的 blob ID
  const mockBlobId = 'blob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  return mockBlobId;
}

/**
 * 从 Walrus 下载数据 - Mock 版本
 */
export async function downloadFromWalrus(blobId: string): Promise<string> {
  console.log('Walrus download (mock):', blobId);
  return 'Mock data for blob: ' + blobId;
}
