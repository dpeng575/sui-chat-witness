/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mysten/dapp-kit', '@mysten/seal', '@mysten/sui', '@mysten/walrus', '@mysten/walrus-wasm'],
};

export default nextConfig;
