import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: appDir,
  transpilePackages: ['@mysten/dapp-kit', '@mysten/seal', '@mysten/walrus', '@mysten/walrus-wasm'],
};

export default nextConfig;
