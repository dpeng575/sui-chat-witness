export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  sealPackageId: process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID || '',
  sealNamespacePackageId:
    process.env.NEXT_PUBLIC_SEAL_NAMESPACE_PACKAGE_ID ||
    process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID ||
    '',
  sealKeyServers: String(process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  walrusUploadRelayUrl:
    process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL ||
    'https://upload-relay.testnet.walrus.space',
  suiNetwork: process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet',
  suiExplorerBaseUrl:
    process.env.NEXT_PUBLIC_SUI_EXPLORER_BASE_URL || 'https://suiscan.xyz/testnet',
  extensionDownloadUrl:
    process.env.NEXT_PUBLIC_EXTENSION_DOWNLOAD_URL ||
    '/downloads/sui-seal-extension.zip',
};
